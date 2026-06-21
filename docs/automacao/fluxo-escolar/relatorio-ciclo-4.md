# RELATORIO DO AGENTE - 2026-06-21 10:56 (Ciclo 4)

## 1. Status Geral do Sistema: Parcial

**Coracao do Sistema (Gestor Escolar): Forte**

O Ciclo 4 confirmou que o coracao do modelo ideal esta implementado e e solido. O Gestor Escolar e a fonte unica de dados mestres (Polo -> Escola -> Serie -> Turma -> Disciplina -> Professor(usuario) -> Aluno, com matricula inline em alunos). A politica de criacao de mestre vive em `lib/services/gestor/mestre.service.ts` (podeCriarMestre + normalizacao + codigos), espelhada no banco pela coluna `origem` (default `gestor`, confirmada nas 4 mestras) e por trigger de defesa em profundidade que bloqueia `origem='sisam_etl'` em escolas (`trg_escolas_gate_origem`, ativo).

Dois gaps de codigo e banco foram **aplicados** neste ciclo: (1) o anti-padrao da porta `importar-resultados/processar-linha.ts` que criava aluno ETL rotulado como cadastro do Gestor foi corrigido, e (2) o trigger de coerencia bidirecional de origem em `alunos` foi criado e aplicado no demo. A migration de indices duplicados foi **proposta** (nao aplicada — requer aprovacao para DROP em banco).

A classificacao evolui de **Medio** (Ciclo 3) para **Forte** porque o anti-padrao de prioridade Alta foi corrigido, os dois gaps restantes de prioridade Alta dos ciclos anteriores (gate ETL + divergencias persistidas) foram fechados, e os gaps remanescentes deste ciclo sao de prioridade Media/Baixa ou exigem decisao humana. O risco principal remanescente e a nao-aplicacao de qualquer protecao em producao (`cjxejpgtuuqnbczpbdfe`).

---

## 2. Fluxo Atual Extraido

**Banco validado**: `tbbnswuqsqhulserwtcc` (educanet-demo, PostgreSQL 17, ACTIVE_HEALTHY). O projeto de producao `cjxejpgtuuqnbczpbdfe` (~3.755 alunos) e o project_id real do SISAM registrado em `.claude/contexto-sisam.md`; o ID `umtfcjxytmrybwlcqzdq` apresentado como "producao" nesta sessao e de terceiro (`rateio.direto`) e NAO foi usado. Toda validacao de banco foi feita exclusivamente no demo.

**Encadeamento mestre confirmado**: `polos`(2) -> `escolas`(5) -> `series_escolares`(16, catalogo global) + `series_escola`(36, oferta por escola/ano) -> `turmas`(183) -> `disciplinas_escolares`(14) + `series_disciplinas`(113, grade) -> `professor_turmas`(331) -> `alunos`(1608). Matricula implicita em `alunos` (sem tabela `matriculas`); professor = registro em `usuarios` com `tipo_usuario='professor'` (sem tabela `professores`). Volumes: 157 professores-usuario, 0 orfaos de FK auditados.

**Governanca de origem**: colunas `origem`/`origem_importacao_id` presentes em `escolas`, `turmas` e `alunos`. Demo: 1608/1608 alunos com `origem='gestor'`. Trigger `trg_escolas_gate_origem` ativo em `escolas` (bloqueia `sisam_etl`). Trigger `fn_alunos_coerencia_origem` ativo em `alunos` (coerencia bidirecional: `origem_importacao_id NOT NULL <=> origem='sisam_etl'`).

**Quatro portas de entrada de dados (todas unidirecionais para o banco):**

1. **Gestor (importar-cadastros)**: porta legitima de criacao de mestre. Transacional (withTransaction/withSavepoint), `origem='gestor'` explicito, invalida cache 3 camadas. Conforme.
2. **Sisam ETL completo (importar-completo/load.ts)**: governa criacao de polo/turma/aluno com `origem='sisam_etl'`, gate estrito por padrao, registra divergencias em `divergencias_historico`. NAO cria escola (gate + trigger). Conforme.
3. **Sisam ETL resultados v2 (importar-resultados/processar-linha.ts)**: **corrigido no Ciclo 4** — agora marca `origem=ORIGEM_SISAM_ETL` e `origem_importacao_id`, gateia via `podeCriarMestre`, chama `registrarMestreCriado` ao detectar INSERT efetivo (`xmax=0 AS criado`). Conforme apos correcao.
4. **Sisam ETL simples (importar)**: somente upsert de resultados; exige escola e aluno ja cadastrados; nao toca mestre. Conforme.

**Consumidores read-only (nao criam/alteram mestre — correto):** Semed (`kpis-semed.service.ts`), Portal do Responsavel (`app/api/responsavel/resultados-sisam`), jobs cron (`notificar-infrequencia`, `health-check`).

**Retorno Sisam -> Gestor (boletim)**: atendido por leitura de `resultados_consolidados` via vinculo aprovado em `responsaveis_alunos`. Nao ha sync de mestre — correto.

**Integridade estrutural da demo (somente leitura, nada foi corrigido nas verificacoes de consistencia):**
- 30 alunos sem `turma_id`: 100% com `situacao='transferido'` e `ativo=false` — comportamento esperado.
- 93 turmas sem aluno: massa de demonstracao parcial (Polo 2, 2024-2026) — nao e corrupcao.
- 51 alunos ativos sem vinculo em `responsaveis_alunos` — lacuna de seed, nao quebra integridade.
- 122 alunos de 1o e 4o Ano sem resultado SISAM, apesar de `sisam_series_participantes` marcar participacao ativa em 2026 — divergencia config-vs-dados (gap 3 do ciclo).
- `ano_letivo` como `character varying` em cinco tabelas, sem FK para `anos_letivos(ano)` — divida estrutural documentada.

---

## 3. Comparacao com o Modelo Ideal

| Modulo / Integracao | Status Atual | Gap | Prioridade |
|---|---|---|---|
| Gestor como fonte unica (politica em codigo) | FECHADO — `mestre.service.ts` + gate estrito por padrao (Ciclos 1-3); porta `importar-resultados` corrigida no Ciclo 4 (commit `1e3e564`) | Anti-padrao da porta ETL v2 eliminado. As duas portas ETL agora sao simetricas na governanca de origem. | Alta — fechado |
| Gestor como fonte unica (defesa em profundidade no banco) | APLICADO no demo — trigger em `escolas` (Ciclo 3) + trigger de coerencia em `alunos` (Ciclo 4, commit `458c0b4`, aplicado em `tbbnswuqsqhulserwtcc`) | `turmas` nao tem trigger equivalente; protecao de `turmas` e so por codigo. Gap restante e de Baixa prioridade apos correcao do codigo. | Baixa |
| Rastreabilidade de origem (colunas `origem`/`origem_importacao_id`) | PARCIAL — colunas existem no demo; migration `add-origem-dado-mestre.sql` NUNCA aplicada em producao (`cjxejpgtuuqnbczpbdfe`) | Protecao dos Ciclos 1-4 existe apenas no demo. Producao intocada. | Alta — aberto (exige usuario) |
| Anti-duplicacao de indices UNIQUE | PROPOSTO — migration `fix-indices-duplicados.sql` recriada (commit `16bae1a`), aguardando aprovacao para `apply_migration` no demo | 5 indices UNIQUE redundantes confirmados no banco demo (3 em `alunos.codigo_inep_aluno`, 2 em `alunos.cpf`, 2+2 em `professor_turmas`). DROP INDEX e banco-destrutivo, nao autoaplicavel. | Media — proposto |
| Governanca de origem — coerencia bidirecional | APLICADO no demo — trigger `fn_alunos_coerencia_origem BEFORE INSERT OR UPDATE OF origem, origem_importacao_id` em `public.alunos` (commit `458c0b4`, aplicado em `tbbnswuqsqhulserwtcc`); garante `origem_importacao_id NOT NULL <=> origem='sisam_etl'` | Coerencia agora garantida pelo banco alem do codigo. Diagnostico pos-aplicacao: 1608 alunos todos `origem='gestor'` sem `importacao_id`, nada bloqueado. | Baixa — fechado |
| Config SISAM vs dados aplicados (1o/4o Ano) | ABERTO — `sisam_series_participantes` marca 1o e 4o Ano como participantes ativos 2026 sem nenhuma avaliacao aplicada; 122 alunos sem resultado | Divergencia config-vs-dados: ou remover as series de `sisam_series_participantes 2026` (`ativo=false`) ou criar/seed a avaliacao. UPDATE em config e destrutivo — exige decisao do time. | Baixa — proposto |
| Eixo temporal (ano_letivo sem FK) | ABERTO — `ano_letivo` como `varchar` em 5 tabelas sem FK para `anos_letivos(ano)`; integridade observada limpa hoje (0 divergencias) | Divida estrutural: risco latente de divergencia por espaco/typo em import futuro. Nao migrar agora (alto custo, muitas colunas). Documentar como ADR. | Baixa — divida consciente |
| Bidirecional resultado Sisam -> boletim | CONFORME — `resultados_consolidados` consumido pelo portal/boletim via vinculo aprovado; nenhum sync de mestre | Nenhum gap. | N/A |
| Governanca aplicada em PRODUCAO | ABERTO — toda protecao dos Ciclos 1-4 esta no demo; project_id de prod (`cjxejpgtuuqnbczpbdfe`) nao acessivel via MCP nesta sessao | Risco real em producao. Validar tambem se o anti-padrao do gap 1 (corrigido) ja contaminou alunos reais: `SELECT origem, COUNT(*) FROM alunos GROUP BY origem` em prod. | Alta — aberto (exige usuario) |

---

## 4. Recomendacoes de Melhoria (Priorizadas)

**1. Confirmar e corrigir producao (Alta, nao autoaplicavel — exige usuario)**
Confirmar com o usuario o project_id real de producao (contexto diz `cjxejpgtuuqnbczpbdfe`; o MCP desta sessao nao o listou). Apos reconectar, rodar:
- `SELECT origem, COUNT(*) FROM alunos GROUP BY origem` — verificar se o anti-padrao (corrigido no Ciclo 4) ja contaminou alunos com `origem` errada.
- `add-origem-dado-mestre.sql` (idempotente, nao destrutiva) se as colunas ainda nao existirem em prod.
- `add-trigger-gate-origem-escola.sql` e `add-trigger-coerencia-origem-aluno.sql` para trazer a defesa de profundidade do demo para prod.
Estimativa: 2-3h (confirmar + aplicar + validar).

**2. Aprovar e aplicar `fix-indices-duplicados.sql` no demo (Media, proposto, exige aprovacao)**
A migration `fix-indices-duplicados.sql` (commit `16bae1a`) esta pronta: idempotente, com `BEGIN/COMMIT`, `RAISE NOTICE` de diagnostico e `RAISE EXCEPTION` de verificacao final. Os 5 indices a remover foram confirmados por `pg_indexes` (definicao identica ao canonico correspondente). Grep em `.ts/.tsx/.js` retornou ZERO referencias aos nomes sendo dropados. Acoes:
- Aprovar `apply_migration` no demo (`tbbnswuqsqhulserwtcc`) via especialista-banco-sisam.
- Validar que escrita/upsert continuam funcionando apos DROP.
- Somente depois propor para producao.
Estimativa: 1-1.5h.

**3. Decidir sobre 1o/4o Ano no SISAM 2026 (Baixa, exige decisao do time)**
122 alunos de 1o e 4o Ano marcados como participantes ativos em `sisam_series_participantes` sem nenhuma avaliacao aplicada. Opcoes exclusivas (escolher uma):
- (a) `UPDATE sisam_series_participantes SET ativo=false WHERE serie IN ('1o Ano','4o Ano') AND ano_letivo='2026'` — remove as series da cobertura esperada.
- (b) Criar/seed a avaliacao para essas series.
Documentar a decisao em ADR via documentador-sisam.
Estimativa: 1h.

**4. Documentar divida consciente: `ano_letivo` como varchar sem FK (Baixa, documentacao)**
Cinco tabelas com `ano_letivo varchar` sem FK para `anos_letivos(ano)`. Mitigacao nao-destrutiva: trim/normalizacao no import (ja parcialmente feito). Proposta faseada futura: coluna `ano_letivo_id FK` adicionada em paralelo + backfill validado + corte da string. Registrar como ADR datado via documentador-sisam.
Estimativa: 0h de codigo; 1h de ADR.

**5. Trigger de banco em `turmas` (Baixa, so apos item 1) **
`turmas` nao tem trigger equivalente ao de `escolas` e `alunos`. Gap menor porque o codigo (porta `importar-completo/load.ts`) ja respeita o gate. Avaliar custo com performance-sisam (trigger por linha em import de turmas pode ser pesado) antes de criar. Alternativa: reforcar `NOT NULL DEFAULT 'gestor'` + `CHECK` como trava declarativa sem trigger.
Estimativa: 1.5-2h.

**6. Criterio de "pronto" do conjunto**
(a) As duas portas ETL marcam `origem=sisam_etl` e gravam governanca de forma simetrica — ATINGIDO (Ciclo 4). (b) Teste automatizado cobre a porta `importar-resultados` — PENDENTE (qa-sisam). (c) Indices duplicados removidos no demo com tsc/testes verdes — PENDENTE (aprovacao). (d) Decisoes dos gaps Baixos registradas em ADR — PENDENTE (documentador-sisam). (e) Protecao aplicada em producao — PENDENTE (usuario).

---

## 5. Acoes Executadas / Sugeridas

### APLICADO AUTOMATICAMENTE (codigo e banco nao destrutivo — somente no demo `tbbnswuqsqhulserwtcc`)

**[A1] Correcao do anti-padrao da porta ETL importar-resultados (Alta)**
Commit: `1e3e564`
Arquivo: `app/api/admin/importar-resultados/processar-linha.ts`

O INSERT em `alunos` dentro da porta de importacao de resultados v2 passou a:
- Gravar `origem=ORIGEM_SISAM_ETL` (importado de `@/lib/services/gestor/mestre.service`) e `origem_importacao_id`.
- Gatear a criacao via `podeCriarMestre(ORIGEM_SISAM_ETL, 'aluno')`.
- Detectar INSERT efetivo via `RETURNING *, (xmax = 0) AS criado` para distinguir de `ON CONFLICT/UPDATE`.
- Chamar `registrarMestreCriado({entidade:'aluno', entidadeId, nome, escolaNome, anoLetivo, importacaoId, usuarioId})` de `@/lib/services/importacao/governanca` somente em INSERT real, gerando trilha de governanca para o Gestor assumir.

`ContextoLinha` ganhou os campos `importacaoId`/`usuarioId`, propagados pelo `route.ts` (`usuarioId: usuario.id`). Padrao de referencia seguido: `lib/services/importacao/load.ts` (criacao de polo pelo ETL). Sem mudanca de schema — colunas `origem`/`origem_importacao_id` em `alunos` ja cobertas pela migration `add-origem-dado-mestre.sql` existente.

Verificacao: `npx tsc --noEmit` limpo; `npx vitest run` — 944/944 testes verdes (58 arquivos).

**[A2] Trigger de coerencia bidirecional de origem em `alunos` (Baixa)**
Commits: `458c0b4` (migration) + `2b074a2` (log)
Arquivo: `database/migrations/add-trigger-coerencia-origem-aluno.sql`
Aplicado: banco demo `tbbnswuqsqhulserwtcc`

Funcao `fn_alunos_coerencia_origem()` com trigger `BEFORE INSERT OR UPDATE OF origem, origem_importacao_id` em `public.alunos`. Garante coerencia bidirecional:
- `origem_importacao_id NOT NULL` exige `origem='sisam_etl'`.
- `origem='sisam_etl'` exige `origem_importacao_id NOT NULL`.
- Origens `gestor` e `seed` com `origem_importacao_id` NULL passam livremente.

Espelha o padrao de `add-trigger-gate-origem-escola.sql`, sem bloquear criacao legitima. Diagnostico pos-aplicacao: 1608 alunos, todos `origem='gestor'` sem `importacao_id`, nada bloqueado. Teste transacional confirmou bloqueio dos dois casos incoerentes (rollback aplicado). Producao nao tocada.

---

### SUGERIDO / PROPOSTO (nao aplicado — banco destrutivo, dados ou exige decisao humana)

**[S1] Aplicar governanca de origem em PRODUCAO (Alta)**
Migration `add-origem-dado-mestre.sql` (idempotente, nao destrutiva), `add-trigger-gate-origem-escola.sql` e `add-trigger-coerencia-origem-aluno.sql`. Exige: confirmar project_id real de producao com o usuario (`cjxejpgtuuqnbczpbdfe`); reconectar MCP; rodar `apply_migration`. Antes, validar `SELECT origem, COUNT(*) FROM alunos GROUP BY origem` em prod para detectar contaminacao pelo anti-padrao corrigido no [A1].
Nao autoaplicavel ate o usuario liberar.

**[S2] Aplicar `fix-indices-duplicados.sql` no demo (Media)**
Migration recriada (commit `16bae1a`). Indices UNIQUE duplicados a remover:
- `alunos.codigo_inep_aluno`: dropar `idx_alunos_codigo_inep` e `idx_alunos_codigo_inep_anti_dup`; manter `idx_alunos_inep_unique`.
- `alunos.cpf`: dropar `idx_alunos_cpf_anti_dup`; manter `idx_alunos_cpf_unique`.
- `professor_turmas`: dropar `idx_prof_turmas_disciplina_unique` e `idx_prof_turmas_polivalente_unique`; manter `idx_professor_turmas_disciplina_unique` e `idx_professor_turmas_polivalente_unique`.
Grep em `.ts/.tsx/.js`: zero referencias aos nomes dropados. Aguardando `apply_migration` no demo via especialista-banco-sisam.

**[S3] Corrigir divergencia config-vs-dados SISAM: 1o e 4o Ano 2026 (Baixa)**
`sisam_series_participantes` marca 1o e 4o Ano como participantes ativos em 2026 sem avaliacao aplicada. 122 alunos afetados (Boa Esperanca, Rio das Flores, Serra Verde). Decisao do time: (a) `UPDATE sisam_series_participantes SET ativo=false WHERE ...` ou (b) seed da avaliacao. UPDATE em config = destrutivo sem reversao trivial. Documentar em ADR.

**[S4] Documentar ADR: `ano_letivo` como varchar sem FK (Baixa, divida consciente)**
Cinco tabelas com `ano_letivo varchar` desacoplado de `anos_letivos(ano)`. Proposta faseada: trim no import + coluna `ano_letivo_id FK` em paralelo + backfill + corte. Documentar via documentador-sisam. Sem acao de codigo/banco agora.

**[S5] Trigger de coerencia em `turmas` (Baixa, so apos S1)**
Complementa [A2]. Avaliar custo com performance-sisam (import de turmas em lote) antes de criar trigger por linha. Alternativa: `CHECK` declarativo em `turmas` para coerencia de origem.
