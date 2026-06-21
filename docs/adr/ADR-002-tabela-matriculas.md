# ADR-002 — Tabela `matriculas` dedicada (registro imutável por ano letivo)

**Status:** Proposta (aguardando decisão do time)
**Data:** 2026-06-21
**Autores:** FlowSchoolAgent (ciclos 1–6) · documentador-sisam

---

## Contexto

No modelo atual, "matrícula" não é uma entidade própria. Ela é representada por
três peças no registro do aluno:

| Coluna | Tabela | Natureza |
|--------|--------|----------|
| `turma_id` | `alunos` | estado mutável — sobrescrito pelo ETL e por transferências |
| `situacao` | `alunos` | estado mutável (`ativo`, `transferido`, `evadido`, …) |
| `data_matricula` | `alunos` | data da última matrícula |

A trilha histórica fica em `historico_situacao` (~918 linhas no demo,
`relatorio-ciclo-1.md` §2). Essa tabela registra mudanças de situação, mas não
é um registro imutável de matrícula por ano letivo — não há `UNIQUE(aluno_id,
ano_letivo_id)`, não há `turma_id` por período, e o ETL sobrescreve
`alunos.turma_id` e `alunos.serie` de alunos já existentes sem passar por
`historico_situacao`.

### Consequências observadas

- Não é possível reconstruir em qual turma um aluno estava em 2024 sem cruzar
  `historico_situacao` com `turmas` por período — consulta complexa e sujeita a
  brechas.
- O boletim e o cálculo de frequência dependem de `alunos.turma_id` (estado
  atual), tornando difícil gerar boletim de ano anterior sem snapshot.
- O ETL de importação (Ciclos 1–6) sobrescrevia `turma_id`/`serie` de alunos
  existentes via `ON CONFLICT DO UPDATE SET turma_id = ...`, apagando o vínculo
  do ano corrente sem registro histórico adequado.
- Com `ano_letivo_id NOT NULL` aplicado em `alunos` (Ciclo 6, migration
  `ano-letivo-id-set-not-null.sql`), cada aluno tem agora um vínculo canônico
  de ano letivo, mas ainda um único registro por aluno — não um por
  matrícula/ano.

---

## Decisão proposta

**Criar a tabela `matriculas`** como registro imutável de um aluno em uma turma
para um ano letivo, com a seguinte estrutura mínima:

```sql
CREATE TABLE matriculas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES alunos(id) ON DELETE RESTRICT,
  turma_id        UUID NOT NULL REFERENCES turmas(id) ON DELETE RESTRICT,
  ano_letivo_id   UUID NOT NULL REFERENCES anos_letivos(id) ON DELETE RESTRICT,
  serie_id        UUID REFERENCES series_escolares(id) ON DELETE SET NULL,
  situacao        TEXT NOT NULL DEFAULT 'ativo',
  data_matricula  DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_matriculas_aluno_ano UNIQUE (aluno_id, ano_letivo_id)
);
```

A coluna `alunos.turma_id` passa a ser um **atalho de leitura** derivado da
matrícula do ano corrente (view ou coluna atualizada por trigger), não a fonte
de verdade. O boletim e a frequência continuam lendo `alunos.turma_id` durante
a migração; após a migração de leituras, passam a ler `matriculas`.

A recomendação clara é: **implementar em três fases aditivas**, sem cortes
destrutivos antecipados.

---

## Alternativas consideradas

### A1 — Manter modelo atual (estado mutável em `alunos`)

**Prós:** zero mudança; `historico_situacao` cobre casos de movimentação.

**Contras:** impossível reconstruir matrícula por ano sem análise do histórico;
ETL pode sobrescrever vínculo atual silenciosamente; não há UNIQUE que impeça
um aluno de aparecer em dois anos com a mesma turma; escalabilidade ruim para
multi-ano letivo.

### A2 — Tabela `matriculas` dedicada (proposta)

**Prós:** registro imutável por ano; UNIQUE `(aluno_id, ano_letivo_id)` impede
duplicação; boletim e frequência podem consultar por ano sem snapshot;
`historico_situacao` passa a registrar mudanças dentro de uma matrícula (ex.:
transferência dentro do mesmo ano).

**Contras:** backfill necessário a partir de `historico_situacao`; refatoração
de todas as queries que leem `alunos.turma_id`; impacto em boletim,
frequência, PNAE, ETL e portal do responsável.

### A3 — Snapshot anual (tabela de arquivamento)

**Prós:** não altera o modelo atual; cria cópia imutável ao fechar o ano letivo.

**Contras:** duplicação de dado; consulta histórica requer UNION entre corrente e
arquivo; não resolve o problema de sobrescrita pelo ETL durante o ano.

A proposta adotada é A2, mais alinhada com as boas práticas de sistemas
escolares e com a estrutura de `ano_letivo_id` já consolidada no banco (Ciclo 6).

---

## Consequências

### Impacto positivo

- Histórico de matrícula por ano letivo se torna um SELECT simples.
- Impede que o ETL sobrescreva o vínculo do ano corrente silenciosamente.
- Permite geração de boletim e frequência para qualquer ano sem snapshot
  manual.
- `UNIQUE(aluno_id, ano_letivo_id)` impede duplicação lógica de matrícula.

### Impacto negativo / riscos

- Refatoração abrangente: `app/api/admin/alunos`, `app/api/professor/boletim`,
  `app/api/professor/frequencia`, `lib/services/importacao/batch/alunos.ts`,
  portal do responsável e relatórios da SEMED precisarão ser adaptados.
- O backfill deve ser validado exaustivamente antes de qualquer NOT NULL ou DROP
  de `alunos.turma_id`.
- A PNAE usa `alunos.turma_id` indiretamente (via escola); mudança de leitura
  pode afetar os relatórios de alimentação escolar.

---

## Plano de migração (aditivo primeiro, corte depois)

| Passo | Ação | Quem | Observação |
|-------|------|------|------------|
| 1 | Criar tabela `matriculas` (migration aditiva — sem NOT NULL ainda em `alunos.turma_id`) | especialista-banco-sisam | Idempotente |
| 2 | Backfill: popular `matriculas` a partir de `historico_situacao` + estado atual de `alunos` para os anos 2024, 2025 e 2026 | especialista-banco-sisam | Validar que `uq_matriculas_aluno_ano` não gera conflitos antes de aplicar |
| 3 | Adaptar `batch/alunos.ts` para inserir/atualizar `matriculas` junto com `alunos` | implementador-sisam | Manter escrita em `alunos.turma_id` em paralelo |
| 4 | Adaptar leituras de boletim e frequência para usar `matriculas` como fonte | implementador-sisam | Cobrir com testes de integração |
| 5 | Adaptar portal do responsável e relatórios SEMED | frontend-sisam | Manter `alunos.turma_id` como fallback durante transição |
| 6 | Validar em demo com `npx tsc --noEmit` verde e 955+ testes passando | qa-sisam | |
| 7 | Avaliar tornar `alunos.turma_id` nullable e derivado de `matriculas` (corte) | time (decisão humana) | Somente após passo 6 validado |

---

## Referências

- `docs/automacao/fluxo-escolar/relatorio-ciclo-1.md` §2 ("matricula = `alunos.turma_id` + `alunos.situacao`… ~918 linhas `historico_situacao`")
- `docs/automacao/fluxo-escolar/relatorio-ciclo-4.md` §3 (modelo de matrícula como "Baixa" na tabela de prioridades)
- `docs/automacao/fluxo-escolar/relatorio-ciclo-6.md` §2 (backfill de `ano_letivo_id` nas 5 tabelas; NOT NULL aplicado)
- `database/migrations/ano-letivo-id-set-not-null.sql` — pré-requisito já aplicado no demo
- `database/migrations/add-anos-letivos.sql` — tabela `anos_letivos` referenciada pela FK
- `lib/services/importacao/batch/alunos.ts` — ponto de sobrescrita de `turma_id` a ser refatorado
- ADR-001 (dependência: ETL match-only — sem tabela `matriculas`, o ETL continuará sobrescrevendo `turma_id`)
