# Log — FlowSchoolAgent (Governança e Consistência do Fluxo Escolar)

Branch: `auto/fluxo-escolar` · 5 ciclos · Aceitação automática · Escrita de banco: **só educanet-demo** · Push: nunca

Formato das linhas de correção: `- ciclo N | integração | status | tipo`

---

## Início — 2026-06-21 09:21
- Infraestrutura criada (branch, workflow, estado, log, README).
- ciclo 1 | Sisam (ETL) -> Gestor (gate de habilitacao) | aplicado | codigo
- ciclo 1 | Gestor/Sisam -> Semed (mv_sisam_media) | aplicado | codigo
- ciclo 1 | Gestor (governanca) — rastreabilidade de origem do dado mestre | aplicado | banco-naodestrutivo
- ciclo 1 | Gestor (catalogo de series) — fonte unica de regras de avaliacao | aplicado | banco-naodestrutivo
- ciclo 2 | Sisam (ETL completo) -> Gestor | aplicado | codigo
- ciclo 2 | Gestor (governanca) -> rastreabilidade do dado mestre | aplicado | codigo

- ciclo 2 | Gestor (cadastro via planilha) vs Sisam (ETL) — duas portas de criacao de mestre | aplicado | codigo
- ciclo 2 | Gestor -> identidade do aluno (anti-duplicacao) | aplicado | banco-naodestrutivo
- ciclo 2 | Gestor -> historico de migracoes/importacoes | aplicado | codigo
- ciclo 3 | Sisam (ETL) -> Gestor Escolar | aplicado | codigo
- ciclo 3 | Sisam (ETL) -> Gestor Escolar (regularizacao) | aplicado | codigo
- ciclo 3 | Gestor Escolar (banco / fonte unica) | aplicado | banco-naodestrutivo
- ciclo 3 | Gestor Escolar (integridade interna do mestre) | aplicado | banco-naodestrutivo
- ciclo 4 | Sisam (ETL importar-resultados) -> Gestor [mestre aluno] | aplicado | codigo
- ciclo 4 | Gestor (banco) — fonte unica / integridade | proposto | banco-naodestrutivo
- ciclo 4 | Sisam/Gestor (governanca de mestre) — defesa em profundidade | aplicado | banco-naodestrutivo
- ciclo 5 | Gestor Escolar (interno) -> integridade do Ano Letivo | aplicado | banco-naodestrutivo
- ciclo 5 | Gestor Escolar (interno) -> catalogo de Series | aplicado | banco-naodestrutivo
- ciclo 5 | Gestor Escolar -> Sisam (governanca do gate em producao) | aplicado | codigo
- ciclo 6 | Chave temporal canonica (Gestor -> todos os modulos) — alunos/turmas/professor_turmas/series_escola/periodos_letivos | aplicado | dados
- ciclo 6 | Porta 1 Gestor (importar-cadastros) + Porta 2 ETL Sisam (load.ts) -> escrita do mestre | aplicado | codigo

---

# 🏁 RESUMO FINAL — FlowSchoolAgent (5/5 ciclos) — 2026-06-21 11:19

## Evolução do diagnóstico
| Ciclo | Status Geral | Coração | Aplicados | Revertidos | Propostas |
|-------|--------------|---------|-----------|------------|-----------|
| 1     | Parcial      | Médio   | 4         | 0          | 5         |
| 2     | Parcial      | Médio   | 5         | 0          | 2         |
| 3     | Parcial      | Médio   | 4         | 0          | 3         |
| 4     | Parcial      | **Forte** | 2       | 0          | 2         |
| 5     | **Saudável** | Forte   | 3         | 0          | 4         |
| **Σ** |              |         | **18**    | **0**      |           |

## Números
- **33 commits** na branch `auto/fluxo-escolar` · **46 arquivos** · +4.290 / −87 linhas.
- **9 migrations** idempotentes/não-destrutivas criadas e aplicadas **só no educanet-demo**.
- **0 reverts, 0 erros** · **0 escrita em produção** · **sem push**.
- 5 relatórios completos: `relatorio-ciclo-1.md` … `relatorio-ciclo-5.md`.

## Achado central (resolvido na prática)
O ETL do Sisam (`importar-completo`) era o **dono de fato** dos cadastros mestres (criava
polos/escolas/turmas/alunos), violando "Gestor Escolar = fonte única". Ao longo dos ciclos:
gate de habilitação, gravação de `origem` do dado, defesa em profundidade na governança,
índice de identidade forte do aluno, FK `serie_id` e integridade do ano letivo → o **coração
passou de Médio para Forte** e o sistema de **Parcial para Saudável**.

## Pendências (propostas — NÃO aplicadas automaticamente)
Todas de baixa prioridade e exigindo decisão humana:
- ETL **match-only** completo + tabela de divergências (precisa ADR).
- **Backfill de CPF/INEP** (depende de planilha oficial externa).
- Tabela `matriculas` dedicada · bidirecionalidade Sisam→boletim (precisam ADR).
- Higiene de schema (DROP de índices/FKs duplicados) — destrutivo, requer confirmação.
- Aplicar as 9 migrations em **produção** após validar contra o banco real.

## Como revisar
```
cat docs/automacao/fluxo-escolar/relatorio-ciclo-5.md
git log --oneline auto/fluxo-escolar ^main
git diff main..auto/fluxo-escolar
```

- ciclo 6 | Aposentadoria da dualidade de chaves — SET NOT NULL em ano_letivo_id | aplicado | banco-naodestrutivo
- ciclo 6 | Gestor como fonte unica — defesa em profundidade no banco (anti-duplicacao/anti-mestre-cruzado) | aplicado | banco-naodestrutivo
- ciclo 6 | Integridade/anti-duplicacao do mestre — indices UNIQUE de alunos e professor_turmas | aplicado | banco-destrutivo
- ciclo 6 | Higiene de dados do ano legado — turmas 2024 (eixo Ano Letivo) | aplicado | dados

---

# 🏁 Ciclo 6 (remediação demo-only) — 2026-06-21 ~11:50

Modo: banco único = educanet-demo · **produção desvinculada** · aplicar tudo no demo.

## Aplicados (6) — 0 revertidos · 0 bloqueados · 0 erros
- `dados`   | Chave temporal canônica (ano letivo) em alunos/turmas/professor_turmas/series_escola/periodos_letivos | `79caa37`
- `código`  | Fecha as 2 portas de criação de mestre (Gestor importar-cadastros + ETL load.ts) | `bf3e1cd`
- `banco`   | SET NOT NULL em `ano_letivo_id` (aposenta dualidade de chaves) | `d67ed13`
- `banco`   | Defesa em profundidade anti-duplicação / anti-mestre-cruzado | `f034e2a`
- `banco-destrutivo` | Índices UNIQUE de alunos e professor_turmas (DROP IF EXISTS guardado) | `3b4232e`
- `dados`   | Higiene de dados do ano legado — turmas 2024 | `35bf20b`

## Validação de migrations (demo)
- 15 arquivos da branch **já aplicados** no demo (0 novas aplicações; idempotentes).
- Consistência **100% verde**: 0 órfãos (serie_id, ano_letivo_id), FKs coerentes, 4 índices
  canônicos + 5 redundantes removidos, 0 CPF/INEP duplicados, `origem` 100% no domínio,
  3 triggers de gate ativas, MV com índice único, 0 turmas de ano fechado ativas.
- Divergência repo↔banco corrigida: criado `database/migrations/harden-search-path-fn-escolas-gate-origem.sql`
  (função de gate que estava no demo sem arquivo versionado).
- Nota de auditoria: `refresh-mv-sisam-media-indice-unico.sql` tem efeito no demo mas sem
  entrada em `supabase_migrations` (criado por outro caminho) — efeito OK.

## Encerrado
Remediação única concluída. Sem loop recorrente. Sem push. Produção intocada.
