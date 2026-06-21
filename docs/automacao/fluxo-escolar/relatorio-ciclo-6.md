# RELATORIO DO AGENTE - 2026-06-21 (Ciclo 6)

> **Banco unico**: `tbbnswuqsqhulserwtcc` (educanet-demo).
> **Producao `cjxejpgtuuqnbczpbdfe` DESVINCULADA do MCP** — nenhuma alteracao chegou a producao.
> Branch: `auto/fluxo-escolar` (sem push).

---

## 1. Status Geral do Sistema

**Status Geral: Parcial** (avanco consolidado em relacao ao Ciclo 5, lacuna de acabamento eliminada)

**Coracao do Sistema (Gestor Escolar): Forte**

O modelo ATUAL ja realiza o nucleo do IDEAL: ha UM unico Postgres (`educanet-demo`,
`tbbnswuqsqhulserwtcc`) e o Gestor Escolar e a fonte unica do cadastro mestre (polos, escolas,
turmas, alunos), com toda escrita de mestre passando por `app/api/admin/*` e pela politica
central `lib/services/gestor/mestre.service.ts` (`podeCriarMestre`).

A "migracao automatica aos demais modulos" e nativa: modulos externos (Transparencia,
Responsavel, SEMED/Financeiro, Sisam) CONSOMEM as mesmas tabelas mestre, sem replicacao ou ETL
entre bancos. A duplicacao e barrada por chaves de unicidade centralizadas (UNIQUE no banco) e
por 10 triggers de coerencia nas tabelas mestre. O historico existe (`historico_situacao`,
`divergencias_historico`, `origem`/`origem_importacao_id`). A unica reconciliacao bidirecional
legitima e o ETL Sisam -> Gestor via divergencias (`mestre_criado_etl` /
`mestre_ausente_gestor`), com gate que impede o ETL de criar escola.

**O Ciclo 6 fechou as lacunas de acabamento herdadas dos Ciclos 4/5**, entregando os seis itens
abaixo — todos aplicados no demo, nenhum em producao:

1. Backfill da FK canonica `ano_letivo_id` nas 5 tabelas do eixo temporal (2.170 linhas).
2. Evolucao das duas portas de escrita do mestre para popular `ano_letivo_id` na origem.
3. SET NOT NULL em `ano_letivo_id` nas 5 tabelas (consolidado passo a passo).
4. Trigger de coerencia de origem em `turmas` (simetria com `alunos` e `escolas`).
5. DROP dos 5 indices UNIQUE redundantes em `alunos` e `professor_turmas`.
6. Inativacao das 36 turmas de ano letivo fechado (2024) sem alunos.

Nenhum item do Ciclo 6 foi bloqueado por dado externo: todos os pre-requisitos ja estavam
presentes no demo (FKs criadas no Ciclo 5, zero orfaos, zero NULLs de `ano_letivo`,
correspondencia 100% com `anos_letivos.ano`).

---

## 2. Fluxo Atual Extraido

**Banco validado**: `tbbnswuqsqhulserwtcc` (educanet-demo). Producao `cjxejpgtuuqnbczpbdfe`
ausente do `list_projects` nesta sessao; nenhuma validacao nem escrita ocorreu la.

**Encadeamento mestre (pos-Ciclo 6)**:

```
polos (2)
  -> escolas (5)  [gate trg_escolas_gate_origem + hardened search_path]
    -> series_escolares (16, catalogo canonico global)
    -> series_escola (36, oferta por escola/ano; serie_escolar_id 100% vinculado)
    -> turmas (183; ano_letivo_id NOT NULL; trg_turmas_coerencia_origem ATIVO)
      -> disciplinas_escolares (14) + series_disciplinas (113)
      -> professor_turmas (331; ano_letivo_id NOT NULL)
      -> alunos (1608; ano_letivo_id NOT NULL; trg_alunos_coerencia_origem ATIVO)
```

**Eixo temporal (pos-Ciclo 6)**:

- `ano_letivo_id` (FK `ON DELETE RESTRICT -> anos_letivos(id)`) nas tabelas `alunos`,
  `turmas`, `professor_turmas`, `series_escola` e `periodos_letivos` — coluna **NOT NULL**
  (SET NOT NULL aplicado no Ciclo 6, commit `d67ed13`).
- Backfill dos 2.170 registros preexistentes: 0 NULLs remanescentes em todas as 5 tabelas
  (alunos 1.608, turmas 183, professor_turmas 331, series_escola 36, periodos_letivos 12).
- Novas escritas (Porta 1 `importar-cadastros/route.ts`, Porta 2 `batch.ts`) resolvem
  `anos_letivos.id` pelo varchar via `resolverAnoLetivoId()` centralizado no
  `mestre.service.ts` e gravam `ano_letivo_id` no INSERT/UPDATE/UPSERT.
- A coluna varchar `ano_letivo` e mantida por compatibilidade retroativa; sua descontinuacao
  e item futuro (fora do escopo deste ciclo).

**Governanca de origem (pos-Ciclo 6)**:

- Trigger `trg_escolas_gate_origem` em `escolas` (Ciclo 3; hardened `search_path=''`).
- Trigger `trg_alunos_coerencia_origem` em `alunos` (Ciclo 4).
- Trigger `trg_turmas_coerencia_origem` em `turmas` (Ciclo 6, commit `f034e2a`) — predicado:
  `origem_importacao_id NOT NULL <=> origem='sisam_etl'`; BEFORE INSERT OR UPDATE; SET
  `search_path=''`. Simetria de defesa em profundidade nas 3 tabelas de dado mestre criavel
  pelo ETL.
- Demo: 183/183 turmas com `origem='gestor'`, 0 incoerentes — gate validado no demo.

**Indices canonicos (pos-Ciclo 6)**:

`fix-indices-duplicados.sql` aplicado no demo (commit `3b4232e`). Removidos 5 indices UNIQUE
redundantes (mesmo predicado que o canonico): `idx_alunos_codigo_inep`,
`idx_alunos_codigo_inep_anti_dup`, `idx_alunos_cpf_anti_dup`,
`idx_prof_turmas_disciplina_unique`, `idx_prof_turmas_polivalente_unique`. Canonicos mantidos:
`idx_alunos_inep_unique`, `idx_alunos_cpf_unique`, e os dois `*_professor_turmas_*`. ANALYZE
rodado em `alunos` e `professor_turmas`. 0 referencias aos nomes dropados em `.ts/.tsx/.js`
(grep confirmado).

**Higiene de dados (pos-Ciclo 6)**:

36 turmas do ano letivo 2024 (status `fechado`) inativadas via `fix-turmas-ano-fechado-inativas.sql`
(commit `35bf20b`). A migration e generalizada: inativa turmas de QUALQUER ano com
`status='fechado'`, nao hardcoda `'2024'`. Guarda de integridade: RAISE EXCEPTION se alguma
turma fechada tiver aluno vinculado (0 alunos nas 36 turmas, guarda passou). Turmas de 2025 (72)
e 2026 (75) em andamento permanecem 100% intactas.

**Testes e TypeScript (pos-Ciclo 6)**:

- `npx tsc --noEmit`: limpo (sem alteracoes de tipo nas migrations de banco; codigo de Porta 1/2
  verificado).
- `npx vitest run`: 60 arquivos / 955 testes / todos verdes (inclui 8 novos testes de integracao
  `__tests__/integration/api/importacao-ano-letivo-id.test.ts` cobrindo `resolverAnoLetivoId()`
  e gravacao de `ano_letivo_id` nas duas portas, commit `bf3e1cd`).

---

## 3. Comparacao com o Modelo Ideal

| Modulo / Integracao | Status Ciclo 5 | Status Ciclo 6 | Gap Remanescente |
|---|---|---|---|
| Gestor como fonte unica (politica + gate em codigo) | FECHADO | FECHADO (sem mudanca) | Nenhum. |
| Gestor como fonte unica (defesa em profundidade — escolas) | FECHADO (trigger + hardened) | FECHADO (sem mudanca) | Nenhum. |
| Gestor como fonte unica (defesa em profundidade — alunos) | FECHADO (trigger coerencia) | FECHADO (sem mudanca) | Nenhum. |
| Gestor como fonte unica (defesa em profundidade — turmas) | ABERTO (trigger ausente) | **FECHADO** — trigger `trg_turmas_coerencia_origem` criado (Ciclo 6, commit `f034e2a`) | Nenhum. |
| Eixo temporal — coluna FK `ano_letivo_id` nas 5 tabelas | PARCIAL (coluna existe, 100% NULL) | **FECHADO** — backfill 2.170 linhas + NOT NULL + escritas populando na origem | Coluna varchar `ano_letivo` mantida (descontinuacao futura). |
| Eixo temporal — escritas populando `ano_letivo_id` | ABERTO (escritas nao populavam) | **FECHADO** — `resolverAnoLetivoId()` no `mestre.service.ts`, Porta 1 e Porta 2 atualizadas (commit `bf3e1cd`) | `serie_escolar_id` nas escritas ainda nao populado (fora do escopo do Ciclo 6). |
| Indice UNIQUE redundantes em `alunos` / `professor_turmas` | PROPOSTO (migration pronta, nao aplicada) | **FECHADO** — 5 indices dropados, 4 canonicos mantidos, ANALYZE rodado (commit `3b4232e`) | Nenhum. |
| Higiene de turmas de ano letivo fechado | ABERTO (36 turmas 2024 ativas sem aluno) | **FECHADO** — 36 turmas inativadas, migration generalizada por status do ano (commit `35bf20b`) | Recomendavel automatizar no fechamento de ano (fora do escopo). |
| Eixo de series — `serie_escolar_id` nas escritas | ABERTO (Ciclo 5 vinculou catalog; escritas nao preenchem) | ABERTO (nao alterado no Ciclo 6) | Escritas de `series_escola` ainda nao preenchem `serie_escolar_id`; NOT NULL de `serie_escolar_id` depende disso. |
| Governanca do gate em producao (endpoint auditoria) | APLICADO (codigo + testes) | APLICADO (sem mudanca) | Cron e UI consumidora do veredito pendentes. |
| Aplicacao das migrations em PRODUCAO | ABERTO (exige usuario) | ABERTO (sem mudanca — producao desvinculada do MCP) | Toda a protecao dos Ciclos 1-6 esta apenas no demo. Exige usuario liberar acesso MCP ao projeto `cjxejpgtuuqnbczpbdfe`. |

---

## 4. Recomendacoes Priorizadas

**1. Aplicar governanca de origem e migrations dos Ciclos 1-6 em PRODUCAO (Alta, exige usuario)**

Toda a protecao implementada nos seis ciclos existe apenas no demo (`tbbnswuqsqhulserwtcc`).
O banco de producao `cjxejpgtuuqnbczpbdfe` (~3.755 alunos) nunca foi acessado via MCP nesta
sessao e pode ter legado mal classificado (`DEFAULT origem='gestor'` otimista da migration
`add-origem-dado-mestre.sql`).

Ordem recomendada de aplicacao em producao (janela controlada, com usuario presente):
1. `SELECT origem, COUNT(*) FROM alunos GROUP BY origem` — detectar contaminacao.
2. `add-origem-dado-mestre.sql` se colunas de origem nao existirem.
3. `add-trigger-gate-origem-escola.sql` + hardening `search_path`.
4. `add-trigger-coerencia-origem-aluno.sql`.
5. `add-trigger-coerencia-origem-turma.sql` (novo, Ciclo 6).
6. `add-ano-letivo-id-fk.sql` (Ciclo 5) → backfill (`backfill-ano-letivo-id-canonico.sql`) →
   escritas ja populam → `ano-letivo-id-set-not-null.sql`.
7. `fix-indices-duplicados.sql` + ANALYZE.
8. `fix-turmas-ano-fechado-inativas.sql`.

Estimativa: 4-6h (reconectar + validar + aplicar + confirmar). Todas as migrations sao
idempotentes — seguras de rodar mesmo se parcialmente aplicadas.

**2. Fechar `serie_escolar_id` nas escritas (Media, codigo, autoaplicavel)**

O catalogo canonico de series (`series_escolares`) esta vinculado em `series_escola` (Ciclo 5,
36/36 registros). As escritas de `app/api/admin/escolas/[id]/series` ainda nao preenchem
`serie_escolar_id` no UPSERT. Sem isso, novos registros de oferta de series nascem com a FK
vazia, repetindo o problema de dualidade que o Ciclo 6 eliminou para `ano_letivo_id`.

Acao: resolver `series_escolares.id` pelo nome/codigo no service de escolas, gravar
`serie_escolar_id` no INSERT/UPDATE, tratar a armadilha de FK NULL no `ON CONFLICT` antes de
aplicar NOT NULL. Cobrir com testes Vitest.
Estimativa: 2-3h.

**3. Agendar cron e UI para o endpoint de auditoria de governanca (Media, codigo)**

O endpoint `GET /api/admin/importacoes/auditoria-governanca` esta pronto e testado (Ciclo 5,
commit `ae00d42`). O proximo passo: (a) agendar chamada periodica (cron Vercel ou GitHub
Actions agendado) que persiste o veredito e emite alerta quando `alerta=true`; (b) exibir
indicador de saude do gate no painel do administrador. Sem isso, o endpoint existe mas nao e
observado continuamente.
Estimativa: 2-3h.

**4. Automatizar inativacao de turmas no fechamento de ano (Baixa, codigo)**

A migration `fix-turmas-ano-fechado-inativas.sql` corrigiu o estado legado no demo. Para nao
reincidir, o fluxo de fechamento de ano em `app/api/admin/fechamento-ano` deve inativar
automaticamente as turmas do ano sendo fechado (UPDATE `turmas SET ativo=false WHERE
ano_letivo_id = $1`). E decisao de produto quando o gatilho deve ocorrer; o banco ja suporta
a consulta diretamente pelo `status` do ano.
Estimativa: 1h.

**5. Completude da massa de demonstracao (Baixa, dados)**

- 57 turmas vazias de 2025/2026: esperadas se matriculas nao foram realizadas; avaliar seed.
- 353 alunos ativos sem `resultados_provas`: verificar se sao coorte fora da prova ou lacuna.
- 48 consolidados sem provas detalhadas: revisar pipeline de consolidacao
  (`importar-resultados/batch-inserts.ts`).
Estimativa: 5-8h (seed + revisao de pipeline). Exige decisao de produto.

---

## 5. Acoes Executadas e Sugeridas

### APLICADO NO DEMO `tbbnswuqsqhulserwtcc` (producao NAO tocada)

#### [A1] Backfill da FK canonica `ano_letivo_id` — dados

**Commit**: `79caa37`
**Arquivo**: `database/migrations/backfill-ano-letivo-id-canonico.sql`
**Tipo**: dados — aplicado no demo

**O que era**: coluna `ano_letivo_id UUID nullable` criada no Ciclo 5 (commit `168c369`) com FK
`ON DELETE RESTRICT -> anos_letivos(id)`, mas 100% NULL em todas as 5 tabelas (alunos 1.608,
turmas 183, professor_turmas 331, series_escola 36, periodos_letivos 12 = 2.170 linhas). Qualquer
JOIN ou filtro por `ano_letivo_id` retornava vazio silenciosamente.

**O que foi feito**: migration idempotente em transacao unica, UPDATE join por tabela casando
`tabela.ano_letivo = anos_letivos.ano`, RAISE NOTICE por tabela, verificacao final com RAISE
EXCEPTION se qualquer NULL remanescente, ANALYZE ao final. Pre-requisito validado: zero orfaos e
zero `ano_letivo IS NULL` nas 3 tabelas principais — backfill 100% seguro sem dado externo.

**Verificacao pos-migration**: 0 NULLs em todas as 5 tabelas (confirmado por query independente
na sequencia da apply_migration).

**Bloqueado por dado externo**: NAO. Todos os anos letivos (2024, 2025, 2026) ja existiam em
`anos_letivos.ano` com correspondencia exata.

#### [A2] Escritas das Portas 1 e 2 populando `ano_letivo_id` — codigo

**Commit**: `bf3e1cd`
**Arquivos alterados**:
- `lib/services/gestor/mestre.service.ts` — funcao `resolverAnoLetivoId()` adicionada (lookup
  `anos_letivos.id` pelo varchar, cache por ano dentro da transacao, retorna null sem lancar).
- `app/api/admin/importar-cadastros/route.ts` (Porta 1) — resolve 1x na transacao; grava
  `ano_letivo_id` no INSERT de turmas, INSERT de alunos e UPDATE de aluno existente.
- `lib/services/importacao/batch.ts` (Porta 2 — escritas reais de turmas/alunos do ETL) —
  resolve por ano via cache, grava `ano_letivo_id` no INSERT/UPSERT batch, UPDATE batch (cura
  linhas legadas NULL) e fallbacks individuais.
- `__tests__/integration/api/importacao-ano-letivo-id.test.ts` — 8 testes novos (mock pool)
  cobrindo lookup e gravacao do id nas duas portas.

**Observacao de escopo**: a sugestao da sintese citava `load.ts`, mas as escritas de
turmas/alunos ocorrem em `batch.ts` (`load.ts` cria apenas polos/escolas/questoes, sem coluna
`ano_letivo_id`). A implementacao foi feita onde as escritas realmente acontecem.

**Verificacao**: `npx tsc --noEmit` limpo; `npx vitest run` — 60 arquivos / 955 testes / todos
verdes.

**Bloqueado por dado externo**: NAO.

#### [A3] SET NOT NULL em `ano_letivo_id` nas 5 tabelas — banco nao destrutivo

**Commit**: `d67ed13`
**Arquivo**: `database/migrations/ano-letivo-id-set-not-null.sql`
**Tipo**: banco-naodestrutivo — aplicado no demo

Pre-requisitos atendidos antes da execucao: 0 NULLs em `ano_letivo_id` nas 5 tabelas (A1) e FK
`ON DELETE RESTRICT -> anos_letivos(id)` ja existente em todas (Ciclo 5). Migration idempotente
com guarda defensiva: RAISE EXCEPTION se qualquer NULL ainda existir antes do ALTER TABLE.
Verificacao final confirma `is_nullable='NO'` nas 5 tabelas.

Primeira tentativa falhou por erro de sintaxe PL/pgSQL (`FOREACH IN ARRAY` com variavel RECORD
em vez de TEXT); corrigida e reaplicada com sucesso. O arquivo versionado no repo reflete o SQL
corrigido e aplicado.

**Verificacao pos-migration**: `is_nullable='NO'` confirmado em `alunos`, `periodos_letivos`,
`professor_turmas`, `series_escola` e `turmas`.

A coluna varchar `ano_letivo` foi mantida (descontinuacao e item futuro).

**Bloqueado por dado externo**: NAO (dependia de A1 e A2, ambos do proprio ciclo).

#### [A4] Trigger de coerencia de origem em `turmas` — banco nao destrutivo

**Commit**: `f034e2a`
**Arquivo**: `database/migrations/add-trigger-coerencia-origem-turma.sql`
**Tipo**: banco-naodestrutivo — aplicado no demo

Criados `fn_turmas_coerencia_origem()` e `trg_turmas_coerencia_origem` em `public.turmas`,
espelhando `trg_alunos_coerencia_origem` (padrao de COERENCIA, nao gate de bloqueio como em
`escolas` — o ETL pode criar turma). Predicado: `origem_importacao_id NOT NULL <=>
origem='sisam_etl'`. BEFORE INSERT OR UPDATE OF `origem`, `origem_importacao_id`; FOR EACH ROW;
SET `search_path=''`.

Migration idempotente: CREATE OR REPLACE para a funcao, DROP TRIGGER IF EXISTS antes de CREATE,
guardas em `information_schema`, RAISE NOTICE/EXCEPTION de verificacao.

**Verificacao pos-migration**: trigger presente e habilitado; teste negativo (UPDATE incoerente
— `origem_importacao_id` NOT NULL sem `origem='sisam_etl'`) barrado com `check_violation` em
transacao revertida; 183 registros intactos.

**Bloqueado por dado externo**: NAO.

#### [A5] DROP dos indices UNIQUE redundantes — banco destrutivo

**Commit**: `3b4232e` (linha do log do Ciclo 6 adicionada ao commit)
**Arquivo**: `database/migrations/fix-indices-duplicados.sql` (ja versionado desde Ciclo 4,
commit `16bae1a`; arquivo nao rastreado — git add realizado nesta sessao)
**Tipo**: banco-destrutivo — aplicado no demo

**Diagnostico antes**: 5 indices UNIQUE com definicao identica aos canonicos — em `alunos`:
`idx_alunos_codigo_inep` e `idx_alunos_codigo_inep_anti_dup` (redundantes de
`idx_alunos_inep_unique`); `idx_alunos_cpf_anti_dup` (redundante de `idx_alunos_cpf_unique`).
Em `professor_turmas`: `idx_prof_turmas_disciplina_unique` e `idx_prof_turmas_polivalente_unique`
(redundantes dos canonicos com nomenclatura completa). Indice composto `idx_alunos_cpf_nascimento`
(nao-UNIQUE) preservado corretamente.

Grep confirmou ZERO referencia aos nomes dropados em `.ts/.tsx/.js`. ON CONFLICT das portas de
escrita infere pelo predicado/colunas, e o canonico cobre as mesmas colunas.

Migration aplicada via apply_migration. Blocos DO de diagnostico e verificacao final passando.
ANALYZE rodado em `alunos` e `professor_turmas`.

**Verificacao pos-migration**: `redundantes_restantes=0`, `canonicos_presentes=4`.

**Bloqueado por dado externo**: NAO.

#### [A6] Inativacao das turmas de ano letivo fechado — dados

**Commit**: `35bf20b` (migration); `a00b9fc` (linha do log)
**Arquivo**: `database/migrations/fix-turmas-ano-fechado-inativas.sql`
**Tipo**: dados — aplicado no demo

**Diagnostico antes**: 36 turmas do ano letivo 2024 (`status='fechado'`) com `ativo=true` e 0
alunos vinculados por `alunos.turma_id`.

Migration generalizada (nao hardcoda `'2024'`): `UPDATE turmas SET ativo=false FROM anos_letivos
al WHERE turmas.ano_letivo_id = al.id AND al.status = 'fechado' AND turmas.ativo IS DISTINCT FROM
false`. Guarda de integridade: RAISE EXCEPTION se alguma turma de ano fechado ainda tiver aluno
vinculado. RAISE NOTICE de diagnostico (contagem antes/depois). Verificacao final: RAISE
EXCEPTION se sobrar turma ativa em ano fechado.

**Verificacao pos-migration**: 2024 = 0 ativas / 36 inativas; 2025 (72 turmas) e 2026 (75
turmas) em andamento permanecem 100% ativas e intactas.

**Bloqueado por dado externo**: NAO (36 turmas sem alunos — guarda de integridade passou
imediatamente).

---

### INCONSISTENCIAS DE AUDITORIA (Ciclo 6 — fase validacao de migrations)

Detectadas na fase de validacao e registradas para correcao manual:

**[I1] Funcao `fn_escolas_gate_origem` com `search_path=''` sem arquivo de migration**
A funcao existe no demo (migration `20260621133529` `harden_search_path_fn_escolas_gate_origem`)
mas nao ha arquivo correspondente em `database/migrations/`. O repo e o banco divergem. Acao:
criar `database/migrations/harden-search-path-fn-escolas-gate-origem.sql` com o header padrao.

**[I2] Indice `idx_mv_sisam_media_id` sem rastro em `supabase_migrations`**
O arquivo `refresh-mv-sisam-media-indice-unico.sql` existe no repo e o indice existe no banco,
mas nao ha entrada correspondente em `schema_migrations`. O efeito esta correto; falta o rastro
versionado. Avaliar registrar para auditoria.

**[I3] Nomenclatura dos triggers (nota de rastreabilidade)**
Triggers criados como `trg_alunos_coerencia_origem` e `trg_turmas_coerencia_origem` (nao
`trg_coerencia_origem_aluno/turma`). Sem impacto funcional; registrado para consistencia em
futuras checagens automaticas.

**[I4] Tabela `series_escolares` (nao `series`)**
A FK `serie_id` referencia `series_escolares.id` (a tabela `series` nao existe no schema). Sem
impacto; nota para evitar checagens contra nome inexistente em scripts futuros.

---

### SUGERIDO / PROPOSTO (NAO aplicado — exige usuario ou decisao de produto)

**[S1] Aplicar toda a governanca em PRODUCAO (Alta)**
Toda a protecao dos Ciclos 1-6 esta apenas no demo. Ver Recomendacao 1 acima para a ordem
recomendada de aplicacao. Exige usuario liberar acesso MCP ao projeto `cjxejpgtuuqnbczpbdfe`.

**[S2] Fechar `serie_escolar_id` nas escritas (Media)**
O catalogo canonico esta vinculado (Ciclo 5), mas as escritas de `series_escola` nao preenchem
`serie_escolar_id`. Ver Recomendacao 2 acima.

**[S3] Criar arquivo de migration para hardening de `fn_escolas_gate_origem` (Baixa)**
Corrigir divergencia [I1]: criar `database/migrations/harden-search-path-fn-escolas-gate-origem.sql`
com o SQL ja aplicado no banco, para que o repo reflita o schema real.

**[S4] Automatizar inativacao de turmas no fechamento de ano (Baixa)**
Ver Recomendacao 4 acima.

**[S5] Write-back Sisam -> boletim (Baixa, aguarda decisao de produto)**
NAO implementar write-back automatico de resultado Sisam em `notas_escolares` sem decisao de
produto explicita. Se aprovado, deve ser acao deliberada no Gestor com campo `origem` e
auditoria, nunca silenciosamente no ETL.

---

## Resumo dos Commits do Ciclo 6

| Commit | Tipo | Descricao |
|---|---|---|
| `79caa37` | dados | Backfill `ano_letivo_id` nas 5 tabelas (2.170 linhas) |
| `bf3e1cd` | codigo | `resolverAnoLetivoId()` + escritas Porta 1/2 + 8 testes Vitest |
| `d67ed13` | banco-naodestrutivo | SET NOT NULL em `ano_letivo_id` nas 5 tabelas |
| `f034e2a` | banco-naodestrutivo | Trigger `trg_turmas_coerencia_origem` em `turmas` |
| `3b4232e` | banco-destrutivo | DROP 5 indices UNIQUE redundantes + ANALYZE |
| `35bf20b` | dados | Inativar 36 turmas de ano fechado (migration generalizada) |
| `a00b9fc` | docs | Linha do log do Ciclo 6 — higiene de turmas |

**Criterio de "pronto" do Ciclo 6**:

- `npx tsc --noEmit` verde: ATINGIDO.
- 955 testes Vitest passando (inclui 8 novos): ATINGIDO.
- Backfill 0 NULLs em `ano_letivo_id` nas 5 tabelas: ATINGIDO.
- Escritas populando `ano_letivo_id` na origem: ATINGIDO.
- SET NOT NULL em `ano_letivo_id`: ATINGIDO.
- Trigger de coerencia em `turmas`: ATINGIDO.
- Indices UNIQUE redundantes removidos: ATINGIDO.
- Turmas de ano fechado inativadas: ATINGIDO.
- Governanca em producao: PENDENTE (exige usuario).
- `serie_escolar_id` nas escritas e NOT NULL: PENDENTE (proximo ciclo).
