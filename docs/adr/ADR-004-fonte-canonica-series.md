# ADR-004 — Fonte canônica de séries: consolidar em `series_escolares`

**Status:** Proposta (aguardando decisão do time)
**Data:** 2026-06-21
**Autores:** FlowSchoolAgent (ciclos 1–6) · documentador-sisam

---

## Contexto

Três representações de "série" coexistem no banco, com propósitos distintos mas
sobrepostos:

| Tabela | Propósito | Chave | Tipo do campo `serie` |
|--------|-----------|-------|-----------------------|
| `series_escolares` | Catálogo canônico global (16 registros no demo) | `id UUID` | colunas `nome` + `codigo` |
| `series_escola` | Oferta por escola/ano letivo (36 registros no demo) | `id UUID` | `serie VARCHAR` (texto livre) |
| `configuracao_series` | Configuração do Sisam (quais séries participam da avaliação, pesos, etc.) | `id UUID` | `serie VARCHAR` (texto livre) |

As tabelas `turmas` e `alunos` possuem a coluna `serie VARCHAR` (texto livre),
sem FK para nenhuma das três fontes.

### O que já foi implementado nos ciclos de auditoria

| Item | Arquivo / Commit | Status |
|------|-----------------|--------|
| FK `serie_id UUID NULLABLE → series_escolares(id)` em `turmas` e `alunos`, com backfill por match de nome/código | `database/migrations/add-serie-id-fk-turmas-alunos.sql` (Ciclo 1) | Aplicado no demo |
| FK `serie_escolar_id UUID NULLABLE → series_escolares(id)` em `series_escola`, com backfill 100% (36/36) | `database/migrations/add-serie-escolar-id-fk-series-escola.sql` (Ciclo 5, commit `7c7b100`) | Aplicado no demo |
| `series_escolares` referenciada como "catálogo canônico" em comentários de código e migrations | `add-serie-id-fk-turmas-alunos.sql`, `add-serie-escolar-id-fk-series-escola.sql` | Documentado |
| `serie_escolar_id` 100% preenchido em `series_escola` pós-backfill | `relatorio-ciclo-5.md` §[A2] | Validado no demo |

O que **não existe** ainda:

- `configuracao_series.serie VARCHAR` referenciando `series_escolares.id` por FK.
- NOT NULL em `serie_id` (turmas/alunos) ou em `serie_escolar_id` (series_escola).
- As escritas de `series_escola` ainda não preenchem `serie_escolar_id` no UPSERT
  (`relatorio-ciclo-5.md` §[S5]; `relatorio-ciclo-6.md` §2 gap remanescente).
- As escritas de turmas/alunos ainda não preenchem `serie_id`.

### Impacto observado

No ciclo 1, foram encontradas 43 turmas com `serie` sem oferta correspondente
em `series_escola` para a mesma escola+ano (`relatorio-ciclo-2.md` §2). Isso
ocorre porque `series_escola.serie` é texto livre — uma letra maiúscula errada
ou abreviação diferente cria um registro novo sem alertar.

---

## Decisão proposta

**`series_escolares` é e permanece a fonte canônica**. As demais tabelas passam
a referenciar `series_escolares.id` por FK, aposentando gradualmente as colunas
textuais livres `serie`.

Concretamente:

1. `series_escola.serie_escolar_id` é promovida a NOT NULL após as escritas
   estarem preenchendo o campo (passo já iniciado no Ciclo 5).
2. `configuracao_series` ganha coluna `serie_escolar_id UUID NULLABLE → series_escolares(id)`
   e backfill por match de nome/código, seguindo o mesmo padrão das migrations
   anteriores.
3. As escritas de `series_escola` (endpoint `POST /api/admin/escolas/[id]/series`)
   passam a resolver `serie_escolar_id` antes do UPSERT.
4. As escritas de `turmas` e `alunos` (portas 1 e 2 do ETL) passam a resolver
   `serie_id` antes do INSERT, da mesma forma que `resolverAnoLetivoId()` foi
   implementado no Ciclo 6 para `ano_letivo_id`.
5. As colunas textuais `serie` em `turmas`, `alunos`, `series_escola` e
   `configuracao_series` são mantidas por compatibilidade retroativa durante a
   transição; descontinuação futura é item separado.

A recomendação clara é: **implementar em ordem aditiva** (FK nullable → escritas
preenchem → backfill → NOT NULL), nunca como DROP antecipado.

---

## Alternativas consideradas

### A1 — Manter as três representações sem FK (status quo)

**Prós:** zero mudança; compatível com todo o código atual.

**Contras:** consistência garantida apenas por convenção de texto; uma grafia
diferente cria registro lógico duplicado; impossível JOIN confiável entre
`series_escola`, `configuracao_series` e `series_escolares` sem normalização
manual.

### A2 — Consolidar em `series_escolares` (proposta)

**Prós:** fonte única com `id UUID` para JOIN; banco garante consistência por FK;
scripts de análise e relatórios fazem JOIN direto sem normalização textual.

**Contras:** refatoração de escritas em múltiplos endpoints; backfill requer
validação de match (nome/código) para cada tabela; NOT NULL não pode ser
aplicado antes das escritas estarem corretas.

### A3 — Consolidar em `configuracao_series`

**Prós:** `configuracao_series` já tem os parâmetros do Sisam (pesos, séries
participantes) — seria uma "super-tabela" de configuração.

**Contras:** `configuracao_series` é específico do módulo Sisam; não é adequado
como catálogo de séries para o Gestor Escolar, SEMED e boletim. Reverteria a
decisão já tomada e implementada (Ciclos 1 e 5) de usar `series_escolares` como
canônico.

A proposta adotada é A2, que já é parcialmente implementada e foi escolhida
explicitamente nos Ciclos 1 e 5.

---

## Consequências

### Schema

Adições aditivas (sem DROP):

```sql
-- Em configuracao_series (ainda não feito):
ALTER TABLE configuracao_series
  ADD COLUMN IF NOT EXISTS serie_escolar_id UUID
    REFERENCES series_escolares(id) ON DELETE SET NULL;
```

Evolução de NOT NULL (após escritas estarem corretas):

```sql
-- series_escola (pré-requisito: escritas preenchendo serie_escolar_id):
ALTER TABLE series_escola ALTER COLUMN serie_escolar_id SET NOT NULL;

-- turmas e alunos (pré-requisito: escritas preenchendo serie_id):
ALTER TABLE turmas ALTER COLUMN serie_id SET NOT NULL;
ALTER TABLE alunos ALTER COLUMN serie_id SET NOT NULL;
```

### Impacto em código

- `app/api/admin/escolas/[id]/series` (POST/UPSERT): deve resolver
  `serie_escolar_id` pelo nome/código antes de gravar, com cuidado para a
  armadilha FK NULL no `ON CONFLICT` documentada no header da migration
  `add-serie-escolar-id-fk-series-escola.sql:39`.
- `lib/services/importacao/batch/turmas.ts` e `batch/alunos.ts`: devem
  resolver `serie_id` via lookup em `series_escolares`, análogo ao
  `resolverAnoLetivoId()` do `mestre.service.ts` (Ciclo 6).
- `app/api/admin/configuracoes/series`: deve popular `serie_escolar_id` no
  INSERT/UPDATE.

### Riscos

- Match por nome/código pode falhar para grafias não previstas
  (ex.: "1º Ano" vs "1o Ano" vs "Primeiro Ano"). O backfill do Ciclo 5
  usou match case/space-insensitive e acertou 36/36 — mas novos registros
  com grafia fora do padrão precisam de tratamento de exceção ou cadastro
  prévio em `series_escolares`.
- NOT NULL antes das escritas estarem preenchendo o campo causa falha silenciosa
  nos INSERTs. O plano de migração exige esta ordem rigorosa.

---

## Plano de migração (aditivo primeiro)

| Passo | Ação | Quem | Pré-requisito |
|-------|------|------|---------------|
| 1 | Adicionar `serie_escolar_id` NULLABLE em `configuracao_series` + backfill | especialista-banco-sisam | Nenhum |
| 2 | Evoluir `POST /api/admin/escolas/[id]/series` para resolver e gravar `serie_escolar_id` | implementador-sisam | Passo 1 (ou paralelo) |
| 3 | Evoluir `batch/turmas.ts` e `batch/alunos.ts` para resolver e gravar `serie_id` (análogo a `resolverAnoLetivoId`) | implementador-sisam | Passo 1 |
| 4 | Cobrir passos 2 e 3 com testes Vitest (mock pool, verificar que id é gravado) | qa-sisam | Passos 2 e 3 |
| 5 | Validar que 0 NULLs em `serie_escolar_id` (series_escola) e `serie_id` (turmas/alunos) após importação de teste | qa-sisam | Passos 2–4 |
| 6 | Aplicar NOT NULL em `series_escola.serie_escolar_id` | especialista-banco-sisam | Passo 5 verde |
| 7 | Aplicar NOT NULL em `turmas.serie_id` e `alunos.serie_id` | especialista-banco-sisam | Passo 5 verde |
| 8 | Avaliar deprecação das colunas textuais `serie` (corte) | time (decisão humana) | Passos 6 e 7 + migração de leituras |

---

## Referências

- `docs/automacao/fluxo-escolar/relatorio-ciclo-1.md` §3 ("3 representações coexistindo: `series_escolares`, `series_escola`, `configuracao_series`"; recomendação de ADR)
- `docs/automacao/fluxo-escolar/relatorio-ciclo-2.md` §3 ("43 alunos com série sem oferta em `series_escola`")
- `docs/automacao/fluxo-escolar/relatorio-ciclo-4.md` §3 e §[S4] ("documentar dívida consciente via ADR")
- `docs/automacao/fluxo-escolar/relatorio-ciclo-5.md` §[A2] (backfill 36/36 em `series_escola.serie_escolar_id`) e §[S5] (NOT NULL pendente)
- `docs/automacao/fluxo-escolar/relatorio-ciclo-6.md` §2 ("gap remanescente: escritas de `series_escola` não preenchem `serie_escolar_id`") e §Recomendação 2
- `database/migrations/add-serie-id-fk-turmas-alunos.sql` — Ciclo 1: FK em turmas/alunos
- `database/migrations/add-serie-escolar-id-fk-series-escola.sql` — Ciclo 5: FK em series_escola + backfill 100%
- `lib/services/gestor/mestre.service.ts` — `resolverAnoLetivoId()` (padrão a replicar para série)
- `app/api/admin/escolas/[id]/series` — endpoint de upsert de oferta de séries (escrita a adaptar)
