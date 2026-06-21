# RELATORIO DO AGENTE - 2026-06-21 (Ciclo 3)

## 1. Status Geral do Sistema: Parcial

**Coracao do Sistema (Gestor Escolar): Medio**

O Ciclo 3 fechou os quatro gaps autoaplicaveis identificados na fase EXTRACAO: inverteu o default do gate ETL de `transicao` para `estrito` (modulo externo nao cria mais dado mestre por padrao), implementou o elo de regularizacao persistindo divergencias de mestre em `divergencias_historico` com acao `Assumir no Gestor`, adicionou defesa em profundidade no banco com trigger `BEFORE INSERT OR UPDATE` bloqueando `origem='sisam_etl'` em `escolas`, e corrigiu a orfandade de ano_letivo cadastrando o ano 2024 (`status='fechado'`) em `anos_letivos`.

A classificacao continua **Medio** porque tres gaps de banco destrutivo e de dados em producao permanecem abertos: indices UNIQUE duplicados nao foram removidos (exige `DROP INDEX` e validacao previa), FKs conflitantes em `notas_escolares` e `frequencia_diaria` aguardam decisao de semantica, e a governanca de origem NUNCA foi aplicada em producao (`cjxejpgtuuqnbczpbdfe`) — toda a protecao do Ciclo 1, 2 e 3 existe apenas no demo `tbbnswuqsqhulserwtcc`.

---

## 2. Fluxo Atual Extraido

**Banco validado**: `tbbnswuqsqhulserwtcc` (educanet-demo, PostgreSQL 17.6, us-west-2, ACTIVE_HEALTHY). O projeto de producao `cjxejpgtuuqnbczpbdfe` (~3.755 alunos) nao estava acessivel via MCP neste ciclo; toda a extracao e analise de banco refletem o demo.

**Encadeamento mestre confirmado (cadeia plana)**: `polos` -> `escolas` -> `turmas` -> `alunos`. Matricula implicita em `alunos` (nao existe tabela `matriculas`); `alunos.escola_id NOT NULL`, `alunos.turma_id` e `alunos.serie_id` por FK. Professor = `usuarios.tipo_usuario='professor'` (sem tabela propria); vinculo de ensino em `professor_turmas`.

**Volumes no demo**: 2 polos, 5 escolas, 16 series_escolares, 14 disciplinas, 183 turmas ativas, 1.608 alunos ativos, 157 professores-usuarios, 331 vinculos professor_turmas. Integridade referencial: 0 orfaos em todas as FKs auditadas.

**10 integracoes mapeadas (codigo + banco):**

1. **Gestor (importar-cadastros) -> Gestor**: porta legitima de criacao de mestre via planilha Excel. Transacional (withTransaction/withSavepoint), `origem='gestor'` explicito, invalida cache 3 camadas. Conforme.
2. **Sisam ETL completo (importar-completo) -> Gestor**: criava mestre sem gate (Ciclos 1 e 2 adicionaram gate para escola/polo; Ciclo 3 mudou o default para `estrito`). Agora turma/aluno inexistente vira divergencia registrada em `divergencias_historico`, nunca INSERT. Modo `transicao` continua disponivel atras de `ETL_GATE_MESTRE=transicao`. Conforme com ressalva (ver secao 3).
3. **Sisam ETL simples (importar) -> resultados_provas**: somente upsert de resultados; exige escola e aluno ja cadastrados (lanca erro caso contrario). Nao toca mestre. Conforme.
4. **Semed (kpis-semed) -> Gestor**: leitura agregada de alunos/escolas/frequencia/desempenho/programas. Nao muta mestre. Conforme.
5. **Portal Responsavel <-> Gestor**: escrita apenas em `responsaveis_alunos` (status `pendente`, aprovacao da escola). Leitura de `resultados_consolidados` via vinculo aprovado. BIDIRECIONAL FRACO — nunca altera aluno/escola/turma. Conforme.
6. **Professor offline sync -> Gestor/movimento**: GET baixa mestre; POST grava somente `notas_escolares` e `frequencia_diaria` em transacao com `ON CONFLICT`. Nao cria/altera mestre. Conforme.
7. **Facial sync (dispositivo) -> Gestor**: pull incremental autenticado por device API key; le alunos + embeddings + consentimento; escreve apenas `logs_dispositivos`. Quase unidirecional. Conforme.
8. **Periodos letivos (sincronizar-semestres) -> periodos_letivos**: derivacao interna (2 semestres dos 4 bimestres). Interno ao Gestor. Conforme.
9. **Jobs cron (notificar-infrequencia, health-check)**: disparos agendados protegidos por `CRON_SECRET`; nao tocam cadastro mestre. Conforme.
10. **Financeiro (PDDE/PNAE/PNATE)**: consumidores sob SEMED; nao criam/alteram mestre escolar. Conforme.

**Inconsistencias de dominio no demo (nao corrigidas — exigem decisao humana ou sao escopo de producao):**
- 36 turmas ativas de 2024 agora tem o ano-pai cadastrado (corrigido no Ciclo 3), mas as turmas permanecem ativas e vazias (0 alunos). Inativar via UPDATE em massa e destrutivo e foi registrado como proposta.
- 51 alunos ativos sem responsavel vinculado (lacuna de seed, nao corrupção).
- 24 alunos da escola-modelo (criados em 18/06/2026) sem resultados SISAM (seed incompleto).
- Governanca de origem (`colunas origem/origem_importacao_id`) aplicada APENAS no demo; producao (`cjxejpgtuuqnbczpbdfe`) intocada.

---

## 3. Comparacao com o Modelo Ideal

| Modulo / Integracao | Status Atual | Gap | Prioridade |
|---|---|---|---|
| Gestor Escolar como fonte unica (politica em codigo) | APLICADO — `mestre.service.ts` + gate estrito por padrao (Ciclo 3) | Gate ETL em `transicao` era o default; corrigido. Bypass via `ETL_GATE_MESTRE=transicao` existe intencionalmente como valvula de escape documentada. | Alta — fechado |
| Gestor Escolar como fonte unica (defesa no banco) | PARCIAL — trigger `trg_escolas_gate_origem` em `escolas` bloqueia `sisam_etl` (Ciclo 3); `turmas`/`alunos` sem trava equivalente no banco | Apenas `escolas` tem trigger. `turmas` e `alunos` sao protegidas so por codigo. Script/job que esqueca do service reintroduz anti-padrao silenciosamente. | Media |
| Regularizacao / historico de migracoes (elo ETL->Gestor) | APLICADO — `divergencias_historico` recebe push do ETL em caso de recusa (`estrito`) ou criacao rastreavel (`transicao`); tipos `mestre_criado_etl` e `mestre_ausente_gestor`; acao `Assumir no Gestor` em `app/admin/gestor/divergencias` (Ciclo 3) | Antes as divergencias de mestre somiam ao fim da importacao (string efemera em `erros[]`). Agora sao persistidas e acionaveis. Fechado. | Alta — fechado |
| Rastreabilidade de origem (colunas `origem`/`origem_importacao_id`) | PARCIAL — colunas existem no demo (todas com `origem='gestor'`); migration `add-origem-dado-mestre.sql` NUNCA aplicada em producao | Producao (`cjxejpgtuuqnbczpbdfe`) nao tem as colunas. ETL em prod pode criar mestre sem rastreio. | Alta — aberto |
| Anti-duplicacao de dado mestre | PARCIAL — indices UNIQUE existem, mas ha DUPLICATAS de UNIQUE na mesma coluna (`idx_alunos_codigo_inep` + `idx_alunos_codigo_inep_anti_dup` + `idx_alunos_inep_unique`; pares similares em `usuarios` e `professor_turmas`); migration `fix-indices-duplicados.sql` aparece no git status mas nao estava no working tree | Overhead de escrita duplicado; ambiguidade de qual indice e o canonico. A migration que resolveria isso esta desaparecida. | Media — aberto |
| Integridade do calendario (ano_letivo com ano-pai) | APLICADO — ano 2024 inserido em `anos_letivos` com `status='fechado'` (migration `fix-ano-letivo-2024-orfao.sql`, Ciclo 3); 0 turmas orfas de ano-pai | 36 turmas ativas e vazias de 2024 permanecem ativas. Inativar e destrutivo (proposta pendente). | Media — parcial |
| FK de movimento (propagacao mestre -> consumidores) | ABERTO — `notas_escolares` e `frequencia_diaria` tem FK DUPLICADA em `turma_id` com `ON DELETE` conflitante (SET NULL vs NO ACTION / CASCADE vs NO ACTION) | Comportamento imprevisivel ao deletar turma. Exige decisao de semantica e `DROP CONSTRAINT`. | Baixa — aberto |
| Bidirecional resultado Sisam -> boletim | CONFORME — `resultados_consolidados` consumidos pelo portal/boletim via vinculo aprovado; professor-sync sobe somente notas/frequencia | Nenhum gap. | N/A |
| Governanca aplicada em PRODUCAO | ABERTO — toda protecao dos ciclos 1, 2, 3 esta no demo; project_id de prod (`cjxejpgtuuqnbczpbdfe`) nao acessivel via MCP nesta sessao | Risco real concentrado em prod. O project_id `umtfcjxytmrybwlcqzdq` citado em tarefas anteriores e de outro projeto (`rateio.direto`), NAO e o SISAM prod. | Alta — aberto |

---

## 4. Recomendacoes de Melhoria (Priorizadas)

**1. Aplicar governanca em PRODUCAO (Alta, nao autoaplicavel, exige usuario)**
Confirmar com o usuario o project_id real de producao (contexto-sisam.md diz `cjxejpgtuuqnbczpbdfe`; o MCP nao o listou nesta sessao). Apos confirmacao, rodar `add-origem-dado-mestre.sql` (idempotente, nao destrutiva) em prod via `apply_migration`. Backfill de origem do legado (default `'gestor'` para registros pre-existentes) e uma assuncao conservadora — documentar como divida. Sem isso, os ciclos 1, 2 e 3 protegem apenas o demo.
Estimativa: 1-2h (aplicar) + analise de backfill.

**2. Estender defesa em profundidade no banco para `turmas` e `alunos` (Media, autoaplicavel)**
O trigger `trg_escolas_gate_origem` (Ciclo 3) cobre apenas `escolas`. Criar triggers equivalentes para `turmas` e `alunos` que bloqueiem `origem='sisam_etl'` quando o gate for `estrito` — ou, alternativa mais leve, adicionar `NOT NULL DEFAULT 'gestor'` e revisar o `CHECK` para que seja a trava canonica. Avaliar custo com `performance-sisam` (trigger por linha em import grande).
Estimativa: 3-4h.

**3. Recuperar/recriar `fix-indices-duplicados.sql` (Media, banco destrutivo, proposta)**
A migration aparece no `git status` mas nao foi encontrada no working tree. Recriar como migration idempotente com `DROP INDEX IF EXISTS` dos indices redundantes, mantendo UM canonico por coluna (preferir o `*_unique` parcial `WHERE IS NOT NULL`). Antes do DROP, validar via `pg_indexes.indexdef` que sao de fato equivalentes — auditorias passadas tiveram falsos positivos. Confirmar com o usuario o paradeiro do arquivo original.
Estimativa: 2-3h.

**4. Resolver FKs duplicadas em `notas_escolares` e `frequencia_diaria` (Baixa, banco destrutivo, proposta)**
`notas_escolares.turma_id` tem duas FKs com `ON DELETE` conflitante (SET NULL e NO ACTION); `frequencia_diaria.turma_id` tem CASCADE e NO ACTION. Definir semantica desejada (recomendado: SET NULL — preserva movimento historico ao deletar turma) e remover a FK conflitante via `DROP CONSTRAINT`. Exige decisao de negocio e validacao via `pg_constraint` antes de qualquer DROP.
Estimativa: 2-3h.

**5. Decidir destino das 36 turmas ativas vazias de 2024 (Media, banco destrutivo, proposta)**
O ano 2024 foi cadastrado (Ciclo 3). As turmas ainda estao `ativo=true` e vazias. Inativar via `UPDATE turmas SET ativo=false WHERE ano_letivo='2024' AND id NOT IN (SELECT turma_id FROM alunos WHERE turma_id IS NOT NULL)` e destrutivo (UPDATE em massa). Registrar como divida de limpeza de dados — decisao do time.
Estimativa: 0.5h (validar + executar).

**6. Documentar divida de modelagem: `ano_letivo` como varchar sem FK (Media, nao fazer agora)**
`ano_letivo` e `varchar` em cinco tabelas (`alunos`, `turmas`, `professor_turmas`, `periodos_letivos`, `series_escola`) sem FK para `anos_letivos(ano)`. Adicionar FK texto-texto seria restritivo e exigiria backfill e decisao de modelagem (varchar vs id numerico). Registrar como ADR via `documentador-sisam` e deixar como divida consciente para o proximo ciclo de modelagem.
Estimativa: 0h de codigo; 1h de documentacao.

**7. Criterio de "pronto" do conjunto**
Gate ETL estrito por padrao (aplicado) + divergencias de mestre persistidas e acionaveis (aplicado) + ano 2024 cadastrado (aplicado) + trigger de banco em escolas (aplicado) + governanca de origem aplicada em prod (pendente usuario) + `tsc --noEmit` verde e testes de integracao dos dois modos do gate passando (verificado no Ciclo 3: 944 testes, 58 arquivos, verde).

---

## 5. Acoes Executadas / Sugeridas

### APLICADO AUTOMATICAMENTE (codigo e banco nao destrutivo — somente no demo `tbbnswuqsqhulserwtcc`)

**[A1] Inversao do default do gate ETL para `estrito`**
Commit: `87db2c7`
Arquivo: `lib/services/importacao/config.ts`
`getEtlGateMode()` agora retorna `'estrito'` por padrao; retorna `'transicao'` somente se `ETL_GATE_MESTRE === 'transicao'` (antes era o inverso). Em modo estrito, turma/aluno inexistente vira divergencia registrada, nunca INSERT. Comentarios de doc em `config.ts` e `process.ts` atualizados. Criado teste de integracao `__tests__/integration/api/importacao-gate-mestre.test.ts` cobrindo os dois modos (estrito: arrays de insercao vazios + divergentes=1; transicao: cria com origem rastreavel) e o default de `getEtlGateMode`. Verificacao real: `npx tsc --noEmit` limpo; 944 testes passaram (5/5 no novo arquivo).

**[A2] Elo de regularizacao ETL -> Gestor via `divergencias_historico`**
Commit: `1bc2173`
Arquivos: `lib/divergencias/tipos.ts` (novos tipos `mestre_criado_etl` e `mestre_ausente_gestor`), `lib/divergencias/verificadores-mestre-etl.ts` (verificadores novos plugados em `executarTodasVerificacoes`), `lib/divergencias/corretores.ts` (corretor `corrigirMestreCriadoEtl` — seta `origem='gestor'`, limpa `origem_importacao_id`), `lib/services/importacao/governanca.ts` (servico novo: `registrarMestreAusente` e `registrarMestreCriado`), `lib/services/importacao/load.ts`, `process.ts` e `index.ts` (gravam divergencia ao recusar no gate estrito ou ao criar em transicao). Reuso total de `app/admin/gestor/divergencias` e de `/api/admin/divergencias/corrigir`. Sem DDL: tabela `divergencias_historico` e colunas de origem ja existiam. Verificacao real: `npx tsc --noEmit` limpo; 944 testes verdes.

**[A3] Trigger de defesa em profundidade no banco (`escolas`)**
Commits: `f6ad69e`, `5085df7`
Arquivo: `database/migrations/add-trigger-gate-origem-escola.sql`
Funcao `fn_escolas_gate_origem()` com `SET search_path=''` (resolve advisor `function_search_path_mutable`) + trigger `trg_escolas_gate_origem BEFORE INSERT OR UPDATE OF origem` em `public.escolas`. Bloqueia `origem='sisam_etl'` (espelha `podeCriarMestre('sisam_etl','escola')=false`), exige `origem` definida e valida o pseudo-enum `gestor|sisam_etl|seed`. Aplicado SOMENTE no demo. Verificado: trigger ativa (`tgenabled=O`); teste funcional bloqueou `sisam_etl` (`insufficient_privilege`) e origem invalida (`check_violation`), permitiu `gestor`, zero residuos.

**[A4] Cadastro do ano letivo 2024 orfao**
Commit: `aa0f8cb`
Arquivo: `database/migrations/fix-ano-letivo-2024-orfao.sql`
`INSERT INTO anos_letivos (ano, status, ...) VALUES ('2024', 'fechado', ...) ON CONFLICT (ano) DO NOTHING`. Idempotente. Migration commitada antes de ser aplicada; aplicada no demo via MCP. Verificacao pos-aplicacao: `anos_letivos` agora contem 2024 (fechado), 2025 e 2026; turmas de 2024 orfas = 0.

---

### SUGERIDO (nao aplicado — banco destrutivo, dados em producao, ou exige decisao humana)

**[S1] Aplicar governanca de origem em PRODUCAO (Alta)**
Migration `add-origem-dado-mestre.sql` (idempotente, nao destrutiva). Exige: confirmar project_id real de producao com o usuario; reconectar MCP; rodar `apply_migration`; decidir backfill de legado. Nao autoaplicavel ate o usuario liberar.

**[S2] Recuperar / recriar `fix-indices-duplicados.sql` (Media)**
Indices UNIQUE duplicados confirmados no demo via `pg_indexes`: `alunos` tem tres indices sobre `codigo_inep` e dois sobre `cpf`; `usuarios` tem dois sobre `cpf`; `professor_turmas` tem dois pares de UNIQUE para disciplina e polivalente. Envolve `DROP INDEX IF EXISTS` — banco destrutivo. Validar `indexdef` antes de remover; confirmar paradeiro do arquivo original com o usuario.

**[S3] Resolver FKs conflitantes em `notas_escolares` e `frequencia_diaria` (Baixa)**
`fk_notas_turma` (SET NULL) e `notas_escolares_turma_id_fkey` (NO ACTION) na mesma coluna; idem `fk_freq_diaria_turma` (CASCADE) e `frequencia_diaria_turma_id_fkey` (NO ACTION). Requer `DROP CONSTRAINT` + recriar uma FK canonica (semantica recomendada: SET NULL). Decisao de negocio necessaria.

**[S4] Inativar turmas vazias de 2024 (Media)**
36 turmas com `ano_letivo='2024'`, `ativo=true`, 0 alunos. `UPDATE turmas SET ativo=false WHERE ano_letivo='2024'` e UPDATE em massa — tratado como destrutivo. Decisao do time sobre limpeza de dados historicos.

**[S5] Estender trigger de banco para `turmas` e `alunos` (Media)**
Complementa [A3]. Avaliar custo com `performance-sisam` antes de criar triggers por linha em tabelas de alto volume de import. Alternativa mais leve: reforcar `NOT NULL DEFAULT 'gestor'` + `CHECK` como trava declarativa sem trigger.

**[S6] Documentar ADR: `ano_letivo` como varchar sem FK (divida consciente)**
Cinco tabelas com `ano_letivo varchar` sem FK para `anos_letivos(ano)`. Decisao de modelagem (texto vs id numerico + backfill) nao foi tomada. Registrar como ADR datado via `documentador-sisam`.
