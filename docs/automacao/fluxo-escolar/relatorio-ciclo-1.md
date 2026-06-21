# RELATORIO DO AGENTE - 2026-06-21 09:39

## 1. Status Geral do Sistema: Parcial

**Coracao do Sistema (Gestor Escolar): Medio**

A integridade referencial fisica do banco esta saudavel (0 orfaos, 0 duplicidades, ON DELETE NO ACTION consistente na cadeia polo -> escola -> turma -> aluno). Os modulos de consumo (Semed, Portal do Responsavel, Financeiro/PDDE/PNAE/PNATE/PNLD, Crons) operam em modo somente leitura sobre os mestres — comportamento correto. Porem o principio central do modelo ideal — *modulo externo nunca cria nem altera dado mestre* — e violado pelo ETL do Sisam (importar-completo), que e de fato o dono dos cadastros de polos, escolas, turmas e alunos no fluxo atual. Este gap e o maior risco de governanca do sistema e determina a classificacao "Medio" para o coracao.

---

## 2. Fluxo Atual Extraido

**Modelo IDEAL**: o Gestor Escolar e a fonte unica dos dados mestres (polos, escolas, turmas, alunos, matricula). Os modulos externos (Sisam/Semed/Financeiro/Portal) apenas consomem ou complementam; nunca criam nem alteram mestres.

**Fluxo ATUAL** (validado no codigo e no banco demo `tbbnswuqsqhulserwtcc`):

A cadeia relacional fisica esta correta: `polos.id <- escolas.polo_id <- turmas.escola_id <- alunos.turma_id`. O vinculo serie e textual (coluna `serie` VARCHAR sem FK para `series_escolares.id`); o ano letivo e textual (`ano_letivo` VARCHAR), sem FK para `anos_letivos.id` — acoplamento por convencao, nao por banco.

Os fluxos de consumo estao corretos:
- **Semed** (`kpis-semed.service` + `mv_sisam_media`): somente leitura/agregacao.
- **Portal do Responsavel** (`app/api/responsavel/*`): somente leitura com gate anti-IDOR por `responsaveis_alunos`.
- **Financeiro** (PDDE/PNAE/PNATE/PNLD services): referencia `escola_id`/`aluno_id` por FK; nao cria/altera mestre.
- **Crons** (`notificar-infrequencia`, `health-check`): notificacao + leitura, sem escrita em mestre.
- **Sync Offline do Professor** (`app/api/professor/sync/route.ts`): bidirecional, mas escreve apenas dados operacionais proprios (notas/frequencia via UPSERT transacional), nao cadastro mestre.

**Violacao central** (ETL Sisam `importar-completo`):
- `lib/services/importacao/load.ts` (`criarPolosEEscolas`): faz INSERT em `polos` e `escolas`.
- `lib/services/importacao/batch.ts` (`criarTurmas`, `criarAlunos`): faz INSERT em `turmas` e INSERT/UPDATE em `alunos` (inclui UPDATE de `turma_id` e `serie` de alunos ja existentes).
- Deduplicacao por nome normalizado, sem chave forte: 100% dos 1.608 alunos no demo estao sem CPF e sem `codigo_inep_aluno`.

**Outras observacoes de extracao**:
- `professor` nao vive em `servidores` (tabela vazia no demo): vive em `usuarios` (`tipo_usuario='professor'`, 157 registros); `professor_turmas.professor_id` e FK para `usuarios.id`.
- Nao existe tabela `matriculas` dedicada: matricula = `alunos.turma_id` + `alunos.situacao` + `alunos.data_matricula` (estado mutavel) + `historico_situacao` (trilha de transferencias, 918 linhas).
- `mv_sisam_media` existe e esta populada no demo, mas nenhum `.ts` chamava `REFRESH MATERIALIZED VIEW` apos importacao (risco de dado stale no painel Semed) — corrigido neste ciclo.
- `professor_turmas` tem 2 pares de indices UNIQUE duplicados; `frequencia_diaria.turma_id` tem 2 FKs conflitantes para `turmas.id` (NO ACTION vs CASCADE) — higiene de schema pendente.
- 93 turmas ativas sem nenhum aluno ativo (36 de 2024, 27 de 2025, 30 de 2026 — massa seed); 51 alunos ativos sem responsavel aprovado; 30 alunos sem `turma_id` (todos transferidos, coerente).

---

## 3. Comparacao com o Modelo Ideal

| Modulo / Integracao | Status Atual | Gap | Prioridade |
|---|---|---|---|
| Sisam (ETL importar-completo) -> Gestor (cadastros mestres) | `load.ts` faz INSERT em polos/escolas; `batch.ts` faz INSERT/UPDATE em turmas e alunos (inclui UPDATE de `turma_id`/`serie` de existentes) | Violacao do principio central: modulo externo cria e altera dados mestres. Deveria apenas consumir mestres e gravar so resultados | **Alta** |
| Sisam (ETL) -> Gestor (gate de habilitacao por escola) | `gestor_escolar_habilitado` existe em `escolas`, mas o ETL nao consultava essa flag ao criar/alterar mestre | ETL ignorava o gate de modulo; criava cadastro mestre para escolas fora da responsabilidade do Gestor | **Media** — corrigido no ciclo |
| Sisam <-> Gestor (deduplicacao / chave de identidade) | Dedup por nome normalizado. Demo: 100% dos 1.608 alunos sem CPF e sem INEP | Identidade fraca: risco de duplicar ou sobrescrever o aluno errado em importacoes futuras | **Alta** |
| Gestor/Sisam -> Semed (`mv_sisam_media`) | MV existe e esta populada, mas nenhum `.ts` chamava REFRESH apos importacao | Painel Semed stale apos cada importacao ate refresh manual | **Media** — corrigido no ciclo |
| Gestor (governanca) — rastreabilidade de origem do dado mestre | Nenhuma coluna `origem`/`fonte`/`importado` em alunos/escolas/turmas/polos | Impossivel distinguir cadastro criado pelo Gestor do criado pelo ETL; sem auditoria de origem | **Media** — corrigido no ciclo |
| Gestor (catalogo de series) — fonte unica de regras de avaliacao | 3 representacoes coexistindo: `series_escolares` (canonico), `series_escola` (oferta, `serie` VARCHAR), `configuracao_series` (config SISAM, `serie` VARCHAR). Vinculo turma/aluno e textual, sem FK para `series_escolares.id` | Tripla fonte da verdade para regras de nota/serie; consistencia garantida pela aplicacao, nao pelo banco | **Media** — Fase 1 (FK nullable + backfill) corrigida no ciclo |
| Gestor — modelo de matricula / historico de migracoes | Matricula = `alunos.turma_id` + `alunos.situacao` (estado mutavel). Sem tabela `matriculas` dedicada; sem UNIQUE (aluno, turma, ano) | Historico de migracoes depende so de `historico_situacao`; vinculo mutavel sobrescrito pelo ETL dificulta reconstruir matricula de ano anterior | **Baixa** |
| Sisam -> Boletim (Gestor) — bidirecional necessario | Resultados do Sisam NAO retornam para `notas_escolares`/boletim; `notas_escolares` nao tem `avaliacao_id` | Boletim nao reflete desempenho na Avaliacao Municipal de forma integrada | **Baixa** |
| Higiene de schema — indices/FKs duplicados | `professor_turmas`: 2 pares de indices UNIQUE duplicados. `frequencia_diaria.turma_id`: 2 FKs conflitantes (NO ACTION vs CASCADE). Arquivo `fix-indices-duplicados.sql` nao versionado (git status) | Overhead de escrita e comportamento de delete ambiguo (CASCADE vs NO ACTION) | **Baixa** |

---

## 4. Recomendacoes de Melhoria (Priorizadas)

**1. (Alta) Refatorar o ETL do Sisam para modo match-only**
O gap que quebra o principio de fonte unica e deve liderar o proximo ciclo de correcao. Por padrao, ao nao encontrar polo/escola/turma/aluno por chave forte, o ETL deve registrar divergencia (tabela de pendencias) em vez de criar o cadastro mestre. Criacao de mestre deve ficar atras de flag explicito do admin do Gestor (`permitir_criacao_cadastro = false` por padrao). Coordenar: `revisor-sisam` (mapear pontos de escrita em `load.ts`/`batch.ts`) + `especialista-banco-sisam` (chaves de match) + `implementador-sisam` (refator). Estimativa: 3-5 dias.

**2. (Alta) Definir chave de identidade forte para aluno/escola antes de qualquer refator de dedup**
Sem chave forte (hoje 100% dos alunos no demo sem CPF/INEP), qualquer refator de dedup continua fragil. Chave em cascata: 1) `codigo_inep_aluno`, 2) `cpf`, 3) codigo interno — nome+nascimento apenas como fallback de baixa confianca que vira pendencia manual. Backfill de CPF/`codigo_inep_aluno` e pre-requisito de dados externos (planilha oficial). Coordenar: `especialista-banco-sisam` (indices unicos parciais) + dados (backfill). Estimativa: 2-3 dias de codigo + backfill dependente de dados externos.

**3. (Media — quick wins ja aplicados neste ciclo)**
- REFRESH automatico da `mv_sisam_media` ao fim do import (commit `213d7d9`).
- Gate por `gestor_escolar_habilitado` no ETL (commit `910a53a`).
- Colunas `origem`/`origem_importacao_id` em alunos/escolas/turmas/polos via migration idempotente (commit `5abb24e`, aplicado no demo).
- FK nullable `serie_id` em turmas/alunos com backfill (commit `106f29e`, aplicado no demo).

**4. (Media) Registrar ADRs antes de mexer em modelagem estrutural**
Tres decisoes exigem ADR aprovado antes de qualquer implementacao:
- Fonte canonica de series (`series_escolares` vs `configuracao_series`).
- Tabela `matriculas` dedicada (historico imutavel por ano).
- Bidirecionalidade Sisam -> boletim (nota derivada ou secao complementar).
Nao implementar sem ADR — divida consciente registrada.

**5. (Baixa) Higiene de schema: indices/FKs duplicados**
Revisar e consolidar `database/migrations/fix-indices-duplicados.sql` (arquivo nao versionado). Envolve DROP de indice/constraint (destrutivo de schema) — vira proposta apos confirmacao em producao. Acionar `especialista-banco-sisam`.

**6. (Transversal) Validar achados contra producao real**
O MCP expoe somente o demo (`tbbnswuqsqhulserwtcc`); a producao real do SISAM (`cjxejpgtuuqnbczpbdfe`) nao estava acessivel. Antes de aplicar correcoes em producao, repetir todas as checagens de consistencia contra `cjxejpgtuuqnbczpbdfe`.

**Ordem de execucao sugerida para o proximo ciclo:**
Fase 1 — analise: `revisor-sisam` mapeia escritas do ETL em paralelo com `seguranca-sisam` (PII/auditoria) e `performance-sisam` (N+1 do sync, MV).
Fase 2 — banco nao destrutivo: indices unicos de chave forte, consolidacao de `configuracao_series`.
Fase 3 — codigo: ETL match-only + gate habilitado aprimorado.
Fase 4 — QA: `qa-sisam` testa import nos modos match-only e criacao.
Fase 5 — docs/horas: ADRs + HORAS-DESENVOLVIMENTO.

---

## 5. Acoes Executadas / Sugeridas

### APLICADAS AUTOMATICAMENTE neste ciclo

#### 1. Gate de habilitacao no ETL Sisam
- **Commit**: `910a53a` (2026-06-21 09:32)
- **Tipo**: codigo
- **Arquivos alterados**: `lib/services/importacao/load.ts`, `lib/services/importacao/types.ts`, `lib/services/importacao/index.ts`
- **O que foi feito**: Em `criarPolosEEscolas`, quando a escola do Excel nao existe no cadastro mestre, o ETL deixou de fazer INSERT. Agora incrementa `resultado.escolas.divergentes`, registra mensagem no array `erros` (persistido em `importacoes.erros`) e loga warning. Escolas ja existentes continuam apenas vinculadas, sem alterar mestre. Adicionado campo `divergentes: number` em `ImportacaoResultado.escolas` e inicializado em `index.ts`.
- **Verificacao**: `npx tsc --noEmit` EXIT 0; `npx vitest run` 57 arquivos / 939 testes passando.
- **Pendencia fora de escopo**: a UI `ProgressoImportacao.tsx` (tipada como `any`) ainda nao exibe o novo contador `divergentes` — ajuste de frontend para o proximo ciclo.

#### 2. REFRESH automatico da mv_sisam_media apos importacao
- **Commit**: `213d7d9` (2026-06-21 09:34)
- **Tipo**: codigo + migration idempotente
- **Arquivos alterados**: `lib/services/importacao/validate.ts`
- **Migration criada**: `database/migrations/refresh-mv-sisam-media-indice-unico.sql` (idempotente, nao destrutiva — garante `idx_mv_sisam_media_id`, pre-requisito do `REFRESH CONCURRENTLY`)
- **O que foi feito**: Adicionada funcao `atualizarMvSisamMedia()` em `validate.ts`, chamada ao final da Fase 10 (`validarImportacao`) no orquestrador. Executa `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sisam_media` com fallback para REFRESH simples. Falha no refresh nao derruba a importacao (tratamento tolerante: `log.warn`/`log.error`).
- **Verificacao**: `npx tsc --noEmit` limpo; `npx vitest run` 57 arquivos / 939 testes passando.
- **Observacao**: a migration foi commitada mas ainda nao aplicada no banco (nenhum `apply_migration` foi solicitado nesta tarefa).

#### 3. Rastreabilidade de origem do dado mestre (banco — demo)
- **Commit**: `5abb24e` (2026-06-21 09:36) + log atualizado em `708ba88`
- **Tipo**: banco-naodestrutivo
- **Migration criada e aplicada no demo**: `database/migrations/add-origem-dado-mestre.sql`
- **O que foi feito**: Adiciona em `alunos`, `escolas`, `turmas` e `polos`:
  - `origem VARCHAR(16) NOT NULL DEFAULT 'gestor'` com `CHECK IN ('gestor','sisam_etl','seed')`
  - `origem_importacao_id UUID NULLABLE` com FK para `importacoes(id) ON DELETE SET NULL` e indice parcial
- **Verificacao pos-aplicacao no demo**: 4 tabelas com as 2 colunas, 4 CHECK e 4 FK confirmados.
- **Producao**: nao acessivel pelo MCP neste ciclo — aplicar separadamente contra `cjxejpgtuuqnbczpbdfe`.
- **Handoff**: `implementador-sisam` grava `origem='sisam_etl'` e `origem_importacao_id` no ETL; `documentador-sisam` faz ADR da fonte unica.

#### 4. FK nullable serie_id em turmas/alunos (Fase 1 do catalogo de series)
- **Commit**: `106f29e` (2026-06-21 09:39)
- **Tipo**: banco-naodestrutivo
- **Migration criada e aplicada no demo**: `database/migrations/add-serie-id-fk-turmas-alunos.sql`
- **O que foi feito**: `ADD COLUMN IF NOT EXISTS serie_id UUID NULLABLE` em `turmas` e `alunos`; FK -> `series_escolares(id) ON DELETE SET NULL`; indices `idx_turmas_serie_id` e `idx_alunos_serie_id`; backfill por match de nome/codigo (case/space-insensitive) sem dropar a coluna textual `serie`.
- **Verificacao pos-migration no demo**: 183/183 turmas e 1.608/1.608 alunos vinculados; 0 orfaos; ambas as FKs criadas.
- **Producao**: nao acessivel pelo MCP neste ciclo.
- **Fase 2 futura**: ADR de fonte canonica + consolidar `configuracao_series` em `series_escolares` — acionar `documentador-sisam`.

---

### SUGESTOES (nao aplicadas — destrutivo / dados / producao)

#### P1. Refatorar ETL Sisam para modo match-only (Alta prioridade)
- **Tipo**: codigo
- **Motivo da nao aplicacao**: mudanca arquitetural de alto impacto; exige mapeamento detalhado de `revisor-sisam` + definicao de chave forte (`especialista-banco-sisam`) antes de implementar.
- **Arquivos impactados**: `lib/services/importacao/load.ts`, `lib/services/importacao/batch.ts`, `lib/services/importacao/index.ts`, possivelmente nova tabela de divergencias.
- **Proximo passo**: `revisor-sisam` mapeia todos os pontos de escrita; `especialista-banco-sisam` define chaves de match em cascata; `implementador-sisam` executa o refator.

#### P2. Chave de identidade forte para aluno/escola (Alta prioridade)
- **Tipo**: dados + banco-naodestrutivo
- **Motivo da nao aplicacao**: backfill de CPF/`codigo_inep_aluno` depende de planilha oficial externa; sem os dados nao e possivel criar o indice unico parcial com seguranca.
- **Proximo passo**: obter planilha oficial com INEP/CPF dos alunos; `especialista-banco-sisam` define indices unicos parciais; dados faz backfill.

#### P3. Tabela matriculas dedicada (Baixa prioridade)
- **Tipo**: banco-naodestrutivo (com migracao de dados)
- **Motivo da nao aplicacao**: requer ADR aprovado antes — decisao de arquitetura nao tomada. Divida consciente.
- **Proximo passo**: `documentador-sisam` escreve ADR; decisao do time antes de implementar.

#### P4. Bidirecionalidade Sisam -> boletim (Baixa prioridade)
- **Tipo**: codigo
- **Motivo da nao aplicacao**: requer ADR e definicao de requisito de negocio (nota derivada vs secao complementar). Nao e erro de integridade.
- **Proximo passo**: `documentador-sisam` escreve ADR; decisao do time.

#### P5. Higiene de schema — indices/FKs duplicados (Baixa prioridade)
- **Tipo**: banco-destrutivo (DROP de indice/constraint)
- **Motivo da nao aplicacao**: envolve DROP — nao e aplicado automaticamente. Arquivo `database/migrations/fix-indices-duplicados.sql` esta presente mas nao versionado (git untracked).
- **Proximo passo**: `especialista-banco-sisam` revisa e valida a migration existente; aplicar em producao apos confirmacao manual.

#### P6. Aplicar migrations de codigo no banco de producao
- **Tipo**: banco-naodestrutivo
- **Motivo da nao aplicacao**: producao `cjxejpgtuuqnbczpbdfe` nao estava acessivel via MCP neste ciclo.
- **Migrations pendentes em producao**: `refresh-mv-sisam-media-indice-unico.sql`, `add-origem-dado-mestre.sql`, `add-serie-id-fk-turmas-alunos.sql`.
- **Proximo passo**: aplicar manualmente contra producao apos validacao; repetir checagens de consistencia.

---

*Validacao limitada: o MCP expoe somente o projeto demo (`tbbnswuqsqhulserwtcc`). As afirmacoes de dados (ex.: 100% sem CPF/INEP, MV populada, ausencia de coluna `origem`) valem para o demo. Antes de aplicar correcoes em producao, repetir todas as checagens contra `cjxejpgtuuqnbczpbdfe`.*

*Branch: `auto/fluxo-escolar` — commits de `9447ede` a `106f29e`. Nenhum push realizado.*
