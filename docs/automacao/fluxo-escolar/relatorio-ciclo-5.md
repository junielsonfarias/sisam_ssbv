# RELATORIO DO AGENTE - 2026-06-21 (Ciclo 5)

## 1. Status Geral do Sistema: Saudavel

**Coracao do Sistema (Gestor Escolar): Forte**

O Ciclo 5 confirmou e reforcou que o coracao do modelo ideal esta implementado e validado na demo (`tbbnswuqsqhulserwtcc` / educanet-demo). Toda a validacao de banco foi feita exclusivamente neste ambiente — o projeto de producao real (`cjxejpgtuuqnbczpbdfe`) nao estava acessivel via MCP nesta sessao.

O Gestor Escolar e a fonte unica de dado mestre: ha politica central unica em `lib/services/gestor/mestre.service.ts` (`podeCriarMestre`), DUAS portas de escrita (Gestor via planilha em `/api/admin/importar-cadastros`, transacional; e ETL Sisam em `lib/services/importacao/*`), e toda linha mestre carrega `origem` + `origem_importacao_id` (FK->importacoes). Validado: 100% das linhas mestras (polos 2, escolas 5, turmas 183, alunos 1608) com `origem='gestor'`; ZERO duplicidade de aluno (CPF/INEP/codigo/nome); integridade referencial 100% limpa; ZERO divergencia registrada.

Tres itens foram **aplicados** neste ciclo: duas migrations banco-nao-destrutivas (FK de ano letivo e FK de serie canonica em `series_escola`) e a rede de seguranca de codigo (job de auditoria de governanca do gate + 4 testes de integracao Vitest). Os gaps remanescentes sao todos de prioridade Baixa ou dependem de decisao de produto/janela controlada.

---

## 2. Fluxo Atual Extraido

**Banco validado**: `tbbnswuqsqhulserwtcc` (educanet-demo). O projeto de producao `cjxejpgtuuqnbczpbdfe` (~3.755 alunos) nao estava no `list_projects` desta sessao; toda validacao ficou restrita ao demo. Nenhuma alteracao foi feita em producao.

**Encadeamento mestre confirmado**: `polos`(2) -> `escolas`(5) -> `series_escolares`(16, catalogo canonico global) + `series_escola`(36, oferta por escola/ano) -> `turmas`(183) -> `disciplinas_escolares`(14) + `series_disciplinas`(113) -> `professor_turmas`(331) -> `alunos`(1608). Matricula implicita em `alunos` (sem tabela `matriculas`). Professores sao registros em `usuarios` com `tipo_usuario='professor'`.

**Governanca de origem**: `origem`/`origem_importacao_id` presentes e confirmados em `escolas`, `turmas` e `alunos`. Demo: 1608/1608 alunos com `origem='gestor'`, ZERO com `origem='sisam_etl'`. Trigger `trg_escolas_gate_origem` ativo em `escolas`. Trigger `fn_alunos_coerencia_origem` ativo em `alunos` (coerencia bidirecional).

**Novidades do Ciclo 5:**

- `turmas`, `alunos`, `series_escola`, `professor_turmas` e `periodos_letivos` passaram a ter coluna `ano_letivo_id UUID nullable` + FK `ON DELETE RESTRICT -> anos_letivos(id)` + indice de suporte (migration `add-ano-letivo-id-fk.sql`, commit `168c369`, somente demo). A coluna varchar `ano_letivo` foi mantida por compatibilidade; backfill e NOT NULL ficam como propostas.
- `series_escola` passou a ter coluna `serie_escolar_id UUID nullable` + FK `ON DELETE SET NULL -> series_escolares(id)` com backfill por casamento de nome/codigo (migration `add-serie-escolar-id-fk-series-escola.sql`, commit `7c7b100`, somente demo). 36 de 36 registros vinculados ao catalogo canonico pos-backfill.
- Rede de seguranca continua do gate ETL foi implementada: `lib/services/importacao/auditoria-governanca.ts` + endpoint `app/api/admin/importacoes/auditoria-governanca/route.ts` (GET, protegido por `withAuth`, retorna alerta=true quando `origem='sisam_etl'` nao-assumido > 0 ou gate sai de `estrito`) + 4 testes de integracao em `__tests__/integration/api/auditoria-governanca-gate.test.ts` (commit `ae00d42`). Verificacao: `npx tsc --noEmit` limpo; `npx vitest run` — 59 arquivos / 948 testes, todos passando.

**Modulos consumidores read-only (sem mudanca — corretos):** Portal do Aluno/Responsavel, Semed (`kpis-semed.service.ts`), Financeiro (PDDE/PNAE/patrimonio/folha-ponto), PWA/Offline (`lib/offline/sync.ts`, somente GET, sem write-back). Nenhum desses modulos cria ou altera dado mestre.

**Retorno Sisam -> boletim**: `resultados_consolidados` consumido pelo boletim/portal de forma estritamente read-only. Nenhum write-back existe; bidirecionalidade e exibicao paralela, nao integracao de mestre — conforme a decisao de produto atual.

**Consistencia da demo (somente leitura — nada corrigido nas checagens):**
- Integridade referencial 100% limpa; ZERO FK orfa auditada.
- ZERO duplicidade de aluno (CPF, INEP, codigo, nome+nascimento).
- 93 de 183 turmas ativas (51%) sem nenhum aluno: massa de demonstracao incompleta (Polo 2, escolas Cachoeira Grande e Serra Verde).
- 353 alunos ativos em serie participante do Sisam sem nenhum `resultados_provas` em anos com avaliacao aplicada (165 em 2025 + 188 em 2026): avaliacao nao migrada/aplicada para esse subconjunto.
- 48 alunos ativos com `resultados_consolidados` sem `resultados_provas` correspondentes (consolidado sem base detalhada).
- 30 alunos sem `turma_id`: 100% transferidos/inativos — comportamento esperado.
- 51 alunos ativos sem vinculo em `responsaveis_alunos` — lacuna de seed.

---

## 3. Comparacao com o Modelo Ideal

| Modulo / Integracao | Status Atual | Gap | Prioridade |
|---|---|---|---|
| Gestor como fonte unica de mestre (politica + gate em codigo) | FECHADO — `mestre.service.ts` + gate estrito por padrao; porta `importar-resultados` corrigida no Ciclo 4 | Nucleo fechado em todos os ciclos anteriores. | Alta — fechado |
| Gestor como fonte unica (defesa em profundidade no banco) | APLICADO no demo — trigger em `escolas` (Ciclo 3) + trigger de coerencia em `alunos` (Ciclo 4); `turmas` sem trigger equivalente (gap menor, codigo ja garante) | Trigger em `turmas` e Baixa prioridade; mitigado pelo codigo e pelo gate. | Baixa — residual |
| Integridade do Ano Letivo (FK para `anos_letivos`) | PARCIALMENTE APLICADO no demo — coluna `ano_letivo_id UUID nullable` + FK + indice em 5 tabelas (Ciclo 5, commit `168c369`). Backfill por UPDATE e NOT NULL: PROPOSTOS, nao executados. Varchar original mantida. | A coluna existe mas nao e preenchida pelas escritas atuais (services). Backfill e NOT NULL dependem de decisao/janela. Producao nao tocada. | Media — parcial |
| Catalogo de Series: duas fontes da verdade | PARCIALMENTE APLICADO no demo — `serie_escolar_id UUID nullable` + FK + backfill por nome/codigo em `series_escola` (Ciclo 5, commit `7c7b100`). 36/36 vinculados. Coluna texto `serie` mantida; upsert por id: PROPOSTO. | Escritas de `series_escola` ainda nao preenchem `serie_escolar_id`. ON CONFLICT atual usa coluna texto. Producao nao tocada. | Media — parcial |
| Indices UNIQUE redundantes em `alunos` | PROPOSTO — migration `fix-indices-duplicados.sql` existe no repo (nao rastreada, pendente). Por envolver DROP, e banco-destrutivo: nao autoaplicavel. | 3 indices redundantes em `codigo_inep` e 2 em `cpf` confirmados. Nao quebra dado; custo de escrita e ambiguidade de manutencao. | Baixa — proposto |
| Governanca do gate em producao (rede de seguranca continua) | APLICADO (codigo) — endpoint de auditoria `GET /api/admin/importacoes/auditoria-governanca` + `lib/services/importacao/auditoria-governanca.ts` + 4 testes Vitest (Ciclo 5, commit `ae00d42`). Endpoint alerta quando `origem='sisam_etl'` nao-assumido > 0 ou gate sai de `estrito`. | Falta agendar cron e consumir o veredito em UI. Producao nao confirmada via MCP. | Media — em andamento |
| Retorno Sisam -> boletim (bidirecional) | CONFORME (exibicao read-only) — boletim faz JOIN em `resultados_consolidados`; nao ha write-back em `notas_escolares`. | Write-back automatico deliberadamente nao implementado: e decisao de produto, nao gap tecnico. Se aprovado, deve ser acao deliberada no Gestor com auditoria. | Baixa — aguarda decisao produto |
| Completude da massa demo (turmas vazias e resultados ausentes) | ABERTO — 93 turmas sem aluno, 353 alunos sem `resultados_provas`, 48 com consolidado sem base detalhada. | Lacuna de seed/migracao, nao corrupcao. Afeta apenas a qualidade da demo como espelho fiel do fluxo. | Baixa — proposto (seed) |
| Governanca aplicada em PRODUCAO | ABERTO — toda protecao dos Ciclos 1-5 esta no demo; `cjxejpgtuuqnbczpbdfe` nao acessivel via MCP nesta sessao. | Risco real: producao pode ter legado mal classificado (DEFAULT `origem='gestor'` otimista da migration `add-origem-dado-mestre.sql`). Exige usuario liberar acesso MCP. | Alta — aberto (exige usuario) |

---

## 4. Recomendacoes de Melhoria (Priorizadas)

**1. Conceder acesso MCP ao projeto de producao `cjxejpgtuuqnbczpbdfe` (Alta, exige usuario)**
Todo o trabalho dos Ciclos 1-5 foi validado no demo. Antes de qualquer correcao de producao, confirmar:
- `SELECT origem, COUNT(*) FROM alunos GROUP BY origem` — detectar contaminacao ou legado mal classificado.
- `SELECT COUNT(*) FROM turmas WHERE ano_letivo_id IS NULL` / mesma verificacao nas 5 tabelas — ver se as colunas FK novas do Ciclo 5 chegaram a prod (nao chegaram: migrations so foram aplicadas no demo).
- Se producao nao tiver as colunas de origem (`add-origem-dado-mestre.sql`), aplicar em sequencia: `add-origem-dado-mestre.sql` -> `add-trigger-gate-origem-escola.sql` -> `add-trigger-coerencia-origem-aluno.sql` -> migrations do Ciclo 5.
Estimativa: 3-4h (reconectar + validar + aplicar + confirmar).

**2. Agendar cron e UI para o endpoint de auditoria de governanca (Media, codigo, autoaplicavel)**
O endpoint `/api/admin/importacoes/auditoria-governanca` esta pronto e testado (Ciclo 5). O proximo passo logico e: (a) agendar chamada periodica (cron Vercel ou GitHub Actions agendado) que grava o veredito e envia alerta quando `alerta=true`; (b) exibir o veredito no painel do administrador como indicador de saude do gate. Sem isso, o endpoint existe mas nao e observado continuamente.
Estimativa: 2-3h.

**3. Evoluir escritas para preencher `ano_letivo_id` e `serie_escolar_id` (Media, codigo, proposta)**
As colunas FK existem no demo mas nenhum service as preenche ainda. Para fechar a integridade referencial do ano letivo e do catalogo de series:
- Ajustar `app/api/admin/importar-cadastros/route.ts` (e o service de ETL `load.ts`) para fazer lookup de `anos_letivos.id` pelo varchar e gravar `ano_letivo_id` ao criar/atualizar turmas, alunos, series_escola, professor_turmas e periodos_letivos.
- Ajustar `app/api/admin/escolas/[id]/series` para preencher `serie_escolar_id` no upsert de `series_escola` (cautela com a armadilha FK NULL no ON CONFLICT — proposta documentada no cabecalho da migration).
- Somente apos as escritas estarem preenchendo o campo: executar o backfill por UPDATE e avaliar NOT NULL.
Estimativa: 4-6h.

**4. Aprovar e aplicar `fix-indices-duplicados.sql` no demo (Baixa, banco-destrutivo, exige aprovacao)**
Migration `database/migrations/fix-indices-duplicados.sql` existe no repo mas nao foi aplicada (arquivo nao rastreado, pendente). Por envolver DROP INDEX, e banco-destrutivo e nao autoaplicavel. Revisar com especialista-banco-sisam, aplicar com janela controlada, rodar `ANALYZE` e confirmar que upserts continuam funcionando.
Estimativa: 1-2h.

**5. Corrigir completude da massa de demonstracao (Baixa, dados, exige decisao de produto)**
- 93 turmas sem aluno (Polo 2): backfill de matriculas via seed/implementador.
- 353 alunos sem `resultados_provas`: decidir se sao coorte fora da prova (esperado) ou lacuna; se lacuna, gerar seed de resultados.
- 48 consolidados sem provas detalhadas: revisar pipeline `app/api/admin/importar-resultados/batch-inserts.ts` para garantir que consolidado so seja gerado a partir de `resultados_provas`; backfill/limpeza dos 48 casos conforme decisao de produto.
Estimativa: 5-8h (seed + revisao de pipeline).

**6. Criterio de "pronto" do conjunto**
- (a) tsc --noEmit verde — ATINGIDO (Ciclo 5).
- (b) 948 testes Vitest passando, incluindo 4 novos do gate — ATINGIDO (Ciclo 5).
- (c) Migrations nao-destrutivas `ano_letivo_id` e `serie_escolar_id` aplicadas no demo sem erro — ATINGIDO (Ciclo 5).
- (d) Endpoint de auditoria retornando `alerta=false` e `sisam_etl: 0` — ATINGIDO no demo (ZERO mestre externo nao-assumido).
- (e) Escritas populando as novas colunas FK — PENDENTE (item 3 acima).
- (f) DROP de indices redundantes aplicado no demo — PENDENTE (item 4 acima).
- (g) Governanca aplicada em producao — PENDENTE (item 1 acima, exige usuario).
- (h) Horas registradas em `docs/HORAS-DESENVOLVIMENTO.md` — pendente nesta sessao.

---

## 5. Acoes Executadas / Sugeridas

### APLICADO AUTOMATICAMENTE (somente no demo `tbbnswuqsqhulserwtcc` — producao nao tocada)

**[A1] Migration banco-nao-destrutiva: integridade do Ano Letivo (Media)**
Commit: `168c369`
Arquivo: `database/migrations/add-ano-letivo-id-fk.sql`

Migration idempotente aplicada em `tbbnswuqsqhulserwtcc`. Adicionou coluna `ano_letivo_id UUID nullable` + FK `ON DELETE RESTRICT -> anos_letivos(id)` + indice `idx_<tabela>_ano_letivo_id` nas tabelas `turmas`, `alunos`, `series_escola`, `professor_turmas` e `periodos_letivos`. A coluna varchar `ano_letivo` foi mantida por compatibilidade (nenhum consumidor existente precisou ser alterado).

Verificacao pos-migration: coluna presente, FK com `on_delete='r'` (RESTRICT) e indice confirmados nas 5 tabelas via `information_schema`. Diagnostico: `anos_letivos` com 3 anos limpos (2024/2025/2026); 183 turmas, 1608 alunos, 36 series_escola, 331 professor_turmas, 12 periodos_letivos — todos com ZERO `ano_letivo IS NULL` e ZERO orfao.

Propostas documentadas no cabecalho da migration (NAO executadas neste ciclo): backfill por UPDATE casando varchar -> `anos_letivos.ano`; SET NOT NULL apos backfill validado.

Sem alteracao em TypeScript (varchar segue como fonte de verdade ate deprecacao futura); `npx tsc --noEmit` dispensado para esta migration.

**[A2] Migration banco-nao-destrutiva: catalogo canonico de Series (Media)**
Commit: `7c7b100`
Arquivo: `database/migrations/add-serie-escolar-id-fk-series-escola.sql`

Migration idempotente aplicada em `tbbnswuqsqhulserwtcc`. Adicionou coluna `serie_escolar_id UUID nullable` + FK `fk_series_escola_serie_escolar_id -> series_escolares(id) ON DELETE SET NULL` + indice `idx_series_escola_serie_escolar_id` em `series_escola`. Backfill automatico incluido: casamento case/space-insensitive de `nome` OU `codigo` entre `series_escola.serie` e `series_escolares` (so linhas com `serie_escolar_id IS NULL`). Coluna textual `serie` preservada.

Verificacao pos-migration: 36 total, 36 vinculados, 0 orfaos, FK=1, indice=1. Sem mudanca em codigo TypeScript.

Propostas documentadas no cabecalho da migration (NAO executadas): evoluir POST `app/api/admin/escolas/[id]/series` para preencher o id nas novas escritas; tratar armadilha FK NULL no `ON CONFLICT` antes de NOT NULL/UNIQUE por id.

**[A3] Rede de seguranca continua do gate ETL (Media)**
Commit: `ae00d42`
Arquivos novos:
- `lib/services/importacao/auditoria-governanca.ts`
- `app/api/admin/importacoes/auditoria-governanca/route.ts`
- `__tests__/integration/api/auditoria-governanca-gate.test.ts`

`auditarGovernancaGate()` conta polos/escolas/turmas/alunos por origem (`gestor`, `sisam_etl`, `seed`, `outros` — NULL legado cai em "outros"). Le `getEtlGateMode()` e levanta `alerta=true` quando ha `origem='sisam_etl'` nao-assumido > 0 OU gate sai de `estrito`. O endpoint e `GET withAuth(['administrador','tecnico'])`, `force-dynamic`, retorna HTTP 200 sempre (adequado para ping por cron) com campo `alerta` no corpo.

4 testes de integracao mockando `pool`: (a) verde — tudo `gestor`, gate `estrito`, `alerta=false`; (b) alerta `etl-nao-assumido` — 5 linhas `sisam_etl`, `alerta=true`; (c) alerta `gate-fora-do-estrito` — gate `transicao`, `alerta=true`; (d) NULL legado em `outros` — contabilizado corretamente, `alerta=false` (NULL nao e `sisam_etl`).

Verificacao: `npx tsc --noEmit` sem erros; `npx vitest run` — 59 arquivos / 948 testes / todos passando.

Fora de escopo (anotado, nao implementado): cron que consome o endpoint periodicamente; UI consumidora do veredito no painel do administrador.

---

### SUGERIDO / PROPOSTO (NAO aplicado — banco destrutivo, dados em massa ou decisao de produto)

**[S1] Aplicar governanca de origem em PRODUCAO (Alta)**
Toda a protecao dos Ciclos 1-5 esta apenas no demo. Exige usuario liberar acesso MCP ao projeto `cjxejpgtuuqnbczpbdfe`. Ordem de aplicacao recomendada: (1) validar estado atual com SELECT de origem; (2) `add-origem-dado-mestre.sql` se as colunas nao existirem; (3) `add-trigger-gate-origem-escola.sql`; (4) `add-trigger-coerencia-origem-aluno.sql`; (5) migrations do Ciclo 5 (`add-ano-letivo-id-fk.sql` e `add-serie-escolar-id-fk-series-escola.sql`). Todas as migrations sao idempotentes e nao-destrutivas — seguras de rodar mesmo que ja parcialmente aplicadas.
Nao autoaplicavel ate o usuario liberar.

**[S2] Aplicar `fix-indices-duplicados.sql` no demo (Baixa)**
Migration `database/migrations/fix-indices-duplicados.sql` existe no repo, nao rastreada (pendente git add). Por envolver DROP INDEX, e banco-destrutivo. Indices a remover confirmados: `idx_alunos_codigo_inep`, `idx_alunos_codigo_inep_anti_dup` (redundantes de `idx_alunos_inep_unique`); `idx_alunos_cpf_anti_dup` (redundante de `idx_alunos_cpf_unique`). Grep em `.ts/.tsx/.js`: zero referencias aos nomes a dropar. Aguarda aprovacao e janela controlada com especialista-banco-sisam.

**[S3] Write-back Sisam -> boletim (Baixa, aguarda decisao de produto)**
NAO implementar write-back automatico do resultado Sisam em `notas_escolares` sem decisao de produto explicita: reintroduziria o anti-padrao "externo altera dado do Gestor". Se aprovado pelo time, implementar como acao deliberada no Gestor (modelo "Assumir no Gestor"), com campo `origem` e auditoria, nunca silenciosamente no ETL.

**[S4] Completude da massa de demonstracao (Baixa)**
- Backfill de matriculas nas 93 turmas vazias (Polo 2): acao de seed/implementador; exige decisao se as turmas existem por planejamento sem alunos ou por lacuna.
- Seed de `resultados_provas` para os 353 alunos sem resultado: exige confirmar se sao coorte fora da prova ou lacuna da migracao.
- Revisao do pipeline de consolidacao e backfill/limpeza dos 48 consolidados sem provas detalhadas: revisao de `app/api/admin/importar-resultados/batch-inserts.ts`; decisao de produto entre gerar as provas faltantes ou expurgar o consolidado orfao.
Tudo como proposta para implementador/seed com aprovacao explicita; nao afeta integridade de producao.

**[S5] Backfill de `ano_letivo_id` e `serie_escolar_id` + NOT NULL (Media, apos [A1]/[A2] consolidados)**
As colunas FK existem no demo mas nao sao preenchidas pelas escritas atuais. Backfill por UPDATE massa (casar varchar->id) e passo de dados que exige janela controlada e validacao previa. NOT NULL so apos backfill 100% limpo e apos as novas escritas estarem populando o campo. Nao autoaplicavel — exige aprovacao e teste de regressao nas APIs de criacao de turmas/alunos/series.
