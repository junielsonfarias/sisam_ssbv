# Índice de ADRs — SISAM / Kontrol-Educanet

Architecture Decision Records do projeto. Cada arquivo documenta uma decisão
de arquitetura ou uma dívida consciente registrada formalmente.

**Convenção de arquivo:** `ADR-NNN-slug-kebab-case.md`
**Status possíveis:** `Proposta` · `Aceita` · `Depreciada` · `Substituída por ADR-NNN`

---

## ADRs em vigor

| Nº | Título | Status | Data |
|----|--------|--------|------|
| [ADR-001](./ADR-001-etl-match-only.md) | ETL Sisam em modo match-only + tabela de divergências | Proposta | 2026-06-21 |
| [ADR-002](./ADR-002-tabela-matriculas.md) | Tabela `matriculas` dedicada (registro imutável por ano letivo) | Proposta | 2026-06-21 |
| [ADR-003](./ADR-003-bidirecionalidade-sisam-boletim.md) | Bidirecionalidade Sisam → boletim (seção complementar, não write-back) | Proposta | 2026-06-21 |
| [ADR-004](./ADR-004-fonte-canonica-series.md) | Fonte canônica de séries: consolidar em `series_escolares` | Proposta | 2026-06-21 |

---

## Origem

Todos os quatro ADRs acima foram gerados a partir da auditoria do
**FlowSchoolAgent** (ciclos 1–6, branch `auto/fluxo-escolar`, 2026-06-21),
que analisou o banco educanet-demo (`tbbnswuqsqhulserwtcc`) e o código do
repositório. Os fatos que embasam cada ADR estão nos relatórios em
`docs/automacao/fluxo-escolar/relatorio-ciclo-N.md`.

## Dependências entre ADRs

```
ADR-001 (ETL match-only)
  └── depende de ADR-002 (chave forte de identidade do aluno) para ser eficaz

ADR-002 (tabela matriculas)
  └── depende de ADR-001 (ETL não sobrescreve mais turma_id diretamente)

ADR-003 (boletim)
  └── independente; apenas documenta o não-write-back

ADR-004 (séries canônicas)
  └── base para ADR-001 (match por serie_id) e ADR-002 (serie_id em matriculas)
```

## Como usar este índice

1. Antes de qualquer mudança de modelagem em séries, turmas, alunos ou
   matrícula, verifique se há ADR relacionado.
2. Para aprovar um ADR, o time altera o campo `Status` de `Proposta` para
   `Aceita` e registra a data da decisão.
3. Para substituir um ADR, crie o novo (`ADR-NNN`) e marque o antigo como
   `Substituída por ADR-NNN`.
