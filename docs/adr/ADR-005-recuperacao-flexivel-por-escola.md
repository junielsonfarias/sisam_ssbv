# ADR-005 — Recuperacao flexivel e parametrizavel por escola/serie

**Status:** Aceita (aprovada 2026-06-21 — em implementacao no banco demo)
**Data:** 2026-06-21
**Autores:** documentador-sisam

---

## Contexto

### Modelo atual de recuperacao

A recuperacao academica hoje e representada por uma unica coluna,
`notas_escolares.nota_recuperacao DECIMAL(5,2)`, na mesma linha do registro
de nota bimestral. A tabela `notas_escolares` tem a seguinte chave de
unicidade:

```sql
UNIQUE(aluno_id, disciplina_id, periodo_id)
-- Origem: database/migrations/add-gestor-escolar-fase2.sql:122
```

Isso significa: **exatamente uma recuperacao por aluno por disciplina por
periodo**. A modelagem e equivalente a "1 recuperacao por bimestre",
hardcoded na estrutura do schema, sem entidade propria nem FK a nenhuma
avaliacao.

### Fragmentacao das regras de configuracao

As regras que governam o calculo da nota final e da recuperacao estao
dispersas em quatro lugares, com sobreposicao e sem fonte canonica clara:

| Tabela | Escopo | Situacao atual |
|--------|--------|----------------|
| `regras_avaliacao` | Global (sem `escola_id`) | Define `recuperacao_por_periodo BOOLEAN`, `formula_media`, `pesos_periodos` |
| `escola_regras_avaliacao` | Override por escola + serie | Criada em `add-escola-regras-avaliacao.sql` (2026-03-19); hoje **ignorada pelo calculo** |
| `configuracao_notas_escola` | Por escola + ano letivo | Define `permite_recuperacao`, `regra_recuperacao`, `peso_avaliacao`, `peso_recuperacao` |
| `configuracao_series` | Por serie no Sisam | Define quais series participam da avaliacao; sem `escola_id` |

A tabela `escola_regras_avaliacao` existe e tem estrutura adequada (`escola_id`,
`serie_escolar_id`, `permite_recuperacao`, `regra_avaliacao_id` como FK), mas
a funcao `buscarConfigNotas` em `lib/services/notas/config.ts:23` **nao a
consulta** — lê apenas `configuracao_notas_escola` (sem serie). A correcao desse
bypass faz parte do Fix2/Fix3 do lote atual.

### Esquemas de recuperacao que o sistema nao consegue modelar hoje

Com o modelo `nota_recuperacao` como coluna de `notas_escolares`, nao e possivel
representar os seguintes esquemas que ocorrem na rede municipal:

| Esquema | Descricao | Por que nao cabe hoje |
|---------|-----------|----------------------|
| **(a) 1 recuperacao por avaliacao (bimestre)** | Cada bimestre tem sua propria recuperacao | Ja implementado — e o unico esquema possivel |
| **(b) 1 recuperacao a cada 2 bimestres (bloco 1a+2a / 3a+4a)** | Recupera-se da media do bloco, nao de cada bimestre | Exigiria recuperacao vinculada a 2 periodos; nao ha chave que expresse isso |
| **(c) Recuperacao semestral** | Uma recuperacao por semestre, cobrindo os bimestres desse semestre | Idem — FK de recuperacao para N periodos e inexprimivel |
| **(d) Recuperacao final / anual** | Uma unica recuperacao ao final do ano, cobrindo o ano todo | Idem; nao ha entidade de recuperacao com scope anual |

Nos esquemas (b), (c) e (d), o valor da recuperacao deve compor a media de
modo diferente: pode substituir a media de um bloco, ou entrar como parcela
adicional da formula anual. A coluna `nota_recuperacao` em `notas_escolares`
nao carrega essa semantica.

### Relacao com outros ADRs

- **ADR-002**: enquanto nao existir `matriculas`, a recuperacao permanece ligada
  ao `aluno_id` atomico sem ancoragem de ano letivo propria na linha de nota.
- **ADR-004**: a granularidade de configuracao de recuperacao por escola e serie
  depende da FK canonica `serie_escolar_id`, que ainda nao e NOT NULL em
  `escola_regras_avaliacao`.

---

## Decisao proposta

**Modelar a recuperacao como esquema parametrizavel por escola + serie + ano
letivo**, com dual-read/dual-write transitorio para nao quebrar o calculo atual.

### Proposta estrutural

**1. Nova coluna `esquema_recuperacao` em `escola_regras_avaliacao`** (ou
   equivalente em `configuracao_notas_escola`):

```sql
-- Dominio proposto
CHECK (esquema_recuperacao IN (
  'por_periodo',          -- (a) 1 recuperacao por bimestre/semestre — padrao atual
  'por_bloco_periodos',   -- (b) 1 recuperacao a cada N periodos (bloco)
  'semestral',            -- (c) 1 recuperacao por semestre
  'final'                 -- (d) 1 recuperacao ao final do ano
))
```

**2. Nova entidade `recuperacoes_escolares`** vinculada ao(s) periodo(s) que
   recupera e ao aluno/disciplina/escola/ano, desacoplada da linha de nota
   bimestral:

```sql
-- Estrutura minima proposta
CREATE TABLE recuperacoes_escolares (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id          UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  disciplina_id     UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
  escola_id         UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  ano_letivo        VARCHAR(10) NOT NULL,
  -- Periodos que esta recuperacao cobre (1..N para esquemas (b),(c),(d))
  periodos_ids      UUID[] NOT NULL,           -- array de periodo_id
  esquema           VARCHAR(30) NOT NULL,
  nota_recuperacao  DECIMAL(5,2) CHECK (nota_recuperacao >= 0),
  nota_final_calc   DECIMAL(5,2),              -- resultado pos calculo
  registrado_por    UUID REFERENCES usuarios(id),
  criado_em         TIMESTAMPTZ DEFAULT now(),
  atualizado_em     TIMESTAMPTZ DEFAULT now()
);
```

**3. Resolver a fonte canonica de regras** (Fix2/Fix3 do lote atual):

A funcao `buscarConfigNotas` (`lib/services/notas/config.ts:23`) deve consultar
`escola_regras_avaliacao` com prioridade sobre `regras_avaliacao`, usando a
hierarquia: **escola+serie > global**, para que o override por escola nao
seja ignorado.

**4. Dual-read com fallback** durante a migracao:

O calculo de nota final continua lendo `notas_escolares.nota_recuperacao` como
fallback quando nenhuma entrada em `recuperacoes_escolares` existe para o
periodo/aluno/disciplina. O campo legado e mantido e nao recebe DROP.

A recomendacao clara e: **implementar a nova entidade de forma aditiva, corrigir
o bypass de `escola_regras_avaliacao`, e migrar o calculo em etapas**, sem
remover `nota_recuperacao` enquanto o dual-read nao estiver validado.

---

## Alternativas consideradas

### A1 — Manter 1 coluna por periodo (status quo)

Manter `notas_escolares.nota_recuperacao` como unica representacao. Limitar
as escolas ao esquema (a): 1 recuperacao por bimestre.

**Pros:** zero mudanca; calculo ja funciona; sem migracao.

**Contras:** impede escolas com esquemas (b)-(d); a coluna `esquema_recuperacao`
em `regras_avaliacao` (`recuperacao_por_periodo BOOLEAN`) existe mas nao
consegue expressar todos os esquemas reais; `escola_regras_avaliacao` continua
sendo ignorada, tornando o override inutil.

### A2 — Coluna extra por esquema (adicionar `nota_rec_semestral`, `nota_rec_final`, etc.)

Adicionar colunas adicionais em `notas_escolares` para cada esquema de
recuperacao.

**Pros:** aditivo; sem nova entidade; calculo leria a coluna correta por esquema.

**Contras:** schema cresce horizontalmente com cada novo esquema; vinculo de
recuperacao a N periodos e impossivel por coluna escalar; colunas ficam vazias
para a maioria das escolas; auditoria de notas (`add-notas-auditoria.sql`) teria
de ser replicada para cada coluna nova; viola 1NF.

### A3 — Nova entidade `recuperacoes_escolares` (proposta atual)

Nova tabela com `periodos_ids UUID[]`, `esquema VARCHAR` e FK para escola/aluno/
disciplina/ano.

**Pros:** expressa todos os 4 esquemas sem schema fixo; auditoria centralizada;
dual-read com fallback preserva o calculo atual durante transicao; aditivo.

**Contras:** requer migracao do calculo (`calculo.ts` e `config.ts`); uso de
`UUID[]` (array) pode complicar indices e JOINs — alternativa e uma tabela
ponte `recuperacoes_periodos(recuperacao_id, periodo_id)`; backfill do campo
legado necessario.

### A4 — Tabela ponte `recuperacoes_periodos` em vez de array

Variante de A3 sem array: relacao N:N entre `recuperacoes_escolares` e
`periodos_letivos`.

**Pros:** indexavel normalmente; JOIN padrao SQL; sem tipo `UUID[]`; mais
compativel com o pool PG do projeto (Transaction Mode, Supabase 6543).

**Contras:** um INSERT adicional por periodo coberto; consulta de recuperacao
exige JOIN extra.

A proposta adotada e **A3 como estrutura logica, com A4 (tabela ponte) como
implementacao fisica recomendada** — mais segura no Transaction Mode do
Supabase.

---

## Consequencias

### Schema (aditivo — sem DROP)

```sql
-- (1) Nova coluna em escola_regras_avaliacao
ALTER TABLE escola_regras_avaliacao
  ADD COLUMN IF NOT EXISTS esquema_recuperacao VARCHAR(30)
    NOT NULL DEFAULT 'por_periodo'
    CHECK (esquema_recuperacao IN ('por_periodo','por_bloco_periodos','semestral','final'));

-- (2) Nova entidade de recuperacao
CREATE TABLE IF NOT EXISTS recuperacoes_escolares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  disciplina_id   UUID NOT NULL REFERENCES disciplinas_escolares(id) ON DELETE CASCADE,
  escola_id       UUID NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  ano_letivo      VARCHAR(10) NOT NULL,
  esquema         VARCHAR(30) NOT NULL DEFAULT 'por_periodo',
  nota_recuperacao DECIMAL(5,2) CHECK (nota_recuperacao >= 0),
  nota_final_calc  DECIMAL(5,2),
  registrado_por  UUID REFERENCES usuarios(id),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (3) Tabela ponte (A4): N:N entre recuperacao e periodos cobertos
CREATE TABLE IF NOT EXISTS recuperacoes_periodos (
  recuperacao_id  UUID NOT NULL REFERENCES recuperacoes_escolares(id) ON DELETE CASCADE,
  periodo_id      UUID NOT NULL REFERENCES periodos_letivos(id) ON DELETE CASCADE,
  PRIMARY KEY (recuperacao_id, periodo_id)
);

-- Indices sugeridos
CREATE INDEX IF NOT EXISTS idx_rec_esc_aluno_disc_ano
  ON recuperacoes_escolares(aluno_id, disciplina_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_rec_esc_escola_ano
  ON recuperacoes_escolares(escola_id, ano_letivo);
```

### Impacto em codigo

| Arquivo | Mudanca necessaria |
|---------|-------------------|
| `lib/services/notas/config.ts` | `buscarConfigNotas` deve consultar `escola_regras_avaliacao` com prioridade sobre `regras_avaliacao` (Fix2 do lote) |
| `lib/services/notas/calculo.ts` | `calcularNotaFinal` ja recebe `ConfigNotas` — nao muda; quem muda e o caller que resolve a recuperacao correta |
| `lib/services/notas/lancamento.ts` | Ao lancar recuperacao: gravar em `recuperacoes_escolares` + tabela ponte, alem do campo legado `nota_recuperacao` durante dual-write |
| `app/api/professor/notas` (ou equivalente) | Ler recuperacao de `recuperacoes_escolares` com fallback para `notas_escolares.nota_recuperacao` |
| `app/api/admin/configuracoes/notas` | Expor `esquema_recuperacao` na API de configuracao por escola/serie |

### Relacao com ADR-002 e ADR-004

- **ADR-002 (matriculas)**: `recuperacoes_escolares` usa `aluno_id` + `ano_letivo`
  diretamente. Quando `matriculas` estiver implementada, pode-se adicionar FK
  `matricula_id` para substituir o par `(aluno_id, ano_letivo)` — corte futuro,
  nao bloqueante.
- **ADR-004 (series canonicas)**: `escola_regras_avaliacao` ja tem
  `serie_escolar_id UUID NOT NULL REFERENCES series_escolares(id)` — a FK
  canonica ja esta correta. O NOT NULL em `serie_escolar_id` (pendente no ADR-004)
  e pre-requisito para que o lookup escola+serie funcione sem NULL surpresa.

### Riscos

| Risco | Probabilidade | Mitigacao |
|-------|--------------|-----------|
| Dual-write inconsistente (escreve na nova tabela, legado fica desatualizado) | Media | Manter dual-write explicito no service ate corte validado |
| Lookup escola+serie retorna NULL para escolas sem `escola_regras_avaliacao` | Alta (hoje a maioria nao tem linha) | Fallback para `regras_avaliacao` global; nunca falhar silenciosamente |
| `periodos_ids` de esquemas (b)-(d) cruzando ano letivo | Baixa | `periodos_letivos.ano_letivo` contem o ano; validar no INSERT |
| Schema `por_periodo` e o default — escolas sem configuracao ficam no padrao atual | Baixa | Comportamento identico ao atual; sem regressao |

---

## Plano de migracao (aditivo primeiro, corte depois)

| Passo | Acao | Quem | Pre-requisito |
|-------|------|------|---------------|
| 1 | Corrigir `buscarConfigNotas` para consultar `escola_regras_avaliacao` (Fix2/Fix3 do lote) | implementador-sisam | ADR-004 passo 1 (serie_escolar_id valido) |
| 2 | Migration aditiva: `esquema_recuperacao` em `escola_regras_avaliacao` + tabelas `recuperacoes_escolares` e `recuperacoes_periodos` | especialista-banco-sisam | Nenhum — aditivo puro |
| 3 | Backfill: para cada linha de `notas_escolares` com `nota_recuperacao NOT NULL`, criar linha em `recuperacoes_escolares` + `recuperacoes_periodos` com `esquema='por_periodo'` | especialista-banco-sisam | Passo 2 |
| 4 | Adaptar service de lancamento para dual-write (nova tabela + campo legado em paralelo) | implementador-sisam | Passos 2 e 3 |
| 5 | Adaptar calculo/leitura de nota_final para dual-read (nova tabela com fallback para campo legado) | implementador-sisam | Passo 4 |
| 6 | Cobrir passos 4 e 5 com testes Vitest (mock pool; checar que esquemas (a)-(d) produzem nota_final correta) | qa-sisam | Passos 4 e 5 |
| 7 | Validar em educanet-demo: `npx tsc --noEmit` verde, testes verdes, boletins de amostra com cada esquema | qa-sisam | Passo 6 |
| 8 | Decidir data de corte para remocao do dual-write legado (DROP de `nota_recuperacao` em `notas_escolares`) | time (decisao humana) | Passo 7 validado + instrucao explicita |

---

## Referencias

- `database/migrations/add-gestor-escolar-fase2.sql:107-123` — definicao de `notas_escolares` com `UNIQUE(aluno_id, disciplina_id, periodo_id)` e coluna `nota_recuperacao`
- `database/migrations/add-tipos-avaliacao.sql` — tabelas `tipos_avaliacao` e `regras_avaliacao`, coluna `recuperacao_por_periodo BOOLEAN` em `regras_avaliacao`
- `database/migrations/add-escola-regras-avaliacao.sql` — tabela `escola_regras_avaliacao` (override por escola+serie, criada 2026-03-19)
- `database/migrations/fix-regras-media-ponderada.sql` — ativacao de media ponderada e `recuperacao_por_periodo = true` para regras bimestrais e EJA (2026-03-19)
- `database/migrations/add-regra-recuperacao-config-notas.sql` — coluna `regra_recuperacao` em `configuracao_notas_escola` (2026-06-21)
- `lib/services/notas/calculo.ts` — `calcularNotaFinal`: logica atual de substituicao vs. ponderacao, parametrizada por `ConfigNotas`
- `lib/services/notas/config.ts:23` — `buscarConfigNotas`: hoje ignora `escola_regras_avaliacao`; ponto de correcao Fix2/Fix3
- `lib/services/notas/types.ts` — `ConfigNotas`, `RegraRecuperacao`, `REGRAS_RECUPERACAO`
- ADR-002 — tabela `matriculas` (ancora de ano letivo por aluno; FK futura de `recuperacoes_escolares`)
- ADR-004 — series canonicas (`serie_escolar_id` NOT NULL em `escola_regras_avaliacao`: pre-requisito do lookup escola+serie)
