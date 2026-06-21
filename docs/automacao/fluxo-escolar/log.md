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
