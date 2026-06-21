# ADR-001 — ETL Sisam em modo match-only + tabela de divergências

**Status:** Proposta (aguardando decisão do time)
**Data:** 2026-06-21
**Autores:** FlowSchoolAgent (ciclos 1–6) · documentador-sisam

---

## Contexto

O ETL `importar-completo` é a porta de entrada de dados da Avaliação Municipal
(Sisam) no banco educanet. Ele percorre três arquivos: `lib/services/importacao/load.ts`
(polos, escolas, questões) e `lib/services/importacao/batch/turmas.ts` +
`batch/alunos.ts` (turmas e alunos). Hoje, quando o ETL não encontra uma turma
ou um aluno pelo nome normalizado, ele os cria diretamente nas tabelas mestras
do Gestor Escolar.

Isso viola o princípio central definido nos ciclos de auditoria:
**Gestor Escolar é a única fonte de dado mestre** — polos, escolas, turmas e
alunos devem ser criados exclusivamente pelo Gestor; módulos externos apenas
consomem.

O problema foi agravado pelo fato de que, no banco educanet-demo, **100% dos
1.608 alunos não possuem CPF nem `codigo_inep_aluno`** (vide
`relatorio-ciclo-1.md` §2 e `relatorio-ciclo-2.md` §3). Sem chave forte, a
correspondência entre o dado ETL e o dado mestre é feita por nome normalizado —
fraca e suscetível a duplicações silenciosas.

### O que já foi implementado (Ciclos 1–6)

| Item | Arquivo / Commit | Status |
|------|-----------------|--------|
| Gate de habilitação `getEtlGateMode()` (modos `estrito` / `transicao`) | `lib/services/importacao/config.ts` | Ativo em código |
| Coluna `origem` + `origem_importacao_id` em `polos`, `escolas`, `turmas`, `alunos` | `database/migrations/add-origem-dado-mestre.sql` | Aplicado no demo |
| Triggers de coerência de origem em `escolas` (`trg_escolas_gate_origem`), `alunos` (`trg_alunos_coerencia_origem`), `turmas` (`trg_turmas_coerencia_origem`) | migrations ciclos 3, 4 e 6 | Aplicado no demo |
| Contador `divergentes` exposto na UI de importação | `app/api/admin/importacoes/auditoria-governanca/route.ts` | Código pronto |
| Registro de divergências em `divergencias_historico` | `database/migrations/004_divergencias_historico.sql` | Aplicado |

O modo padrão do gate já é `estrito` (`ETL_GATE_MESTRE=estrito`). O que falta
é a **tabela dedicada** `importacao_divergencias` e a mudança efetiva de
comportamento no ETL para não criar em modo estrito, apenas registrar.

---

## Decisão proposta

**Consolidar o ETL em modo match-only (estrito) por padrão**, com as seguintes
regras:

1. Ao processar uma linha do Excel, o ETL tenta casar escola / turma / aluno
   por chave forte (INEP > CPF > código interno > nome+nascimento como último
   recurso, com flag de baixa confiança).
2. Se não encontrar correspondência, **registra uma divergência** na tabela
   `importacao_divergencias` (nome proposto) em vez de criar o registro mestre.
3. Criação de mestre pelo ETL só ocorre atrás de flag explícito do
   administrador do Gestor (`ETL_GATE_MESTRE=transicao` no ambiente) — nunca
   habilitado por padrão em produção.
4. A tela de importação exibe as divergências com ação "Cadastrar no Gestor" ou
   "Vincular a existente", tornando a reconciliação intencional e auditada.

A recomendação clara é: **implementar e ativar o modo match-only em produção**
antes de qualquer nova rodada de importação de avaliação 2026.

---

## Alternativas consideradas

### A1 — Manter criação automática (status quo)

**Prós:** zero mudança de código; importação funciona mesmo com dado mestre
ausente no Gestor.

**Contras:** viola o princípio de fonte única; turmas e alunos criados pelo ETL
aparecem mesclados aos cadastrados pelo Gestor sem rastreabilidade clara; risco
de duplicação por nome normalizado sem chave forte (já observado: 100% dos
alunos sem CPF/INEP no demo).

### A2 — Match-only estrito puro (sem modo transição)

**Prós:** implementação mais simples; não há caminho de criação pelo ETL.

**Contras:** inviabiliza ambientes que ainda não migraram o cadastro para o
Gestor; pode travar rodadas de avaliação enquanto o backfill não ocorre.

### A3 — Match-only com modo transição (proposta atual)

**Prós:** permite operação segura em ambientes legados via flag de ambiente;
cria com rastreabilidade total (`origem='sisam_etl'`, `origem_importacao_id`);
divergências ficam visíveis para regularização.

**Contras:** o modo `transicao` precisa ser explicitamente desligado após a
migração, criando risco de esquecimento. Requer disciplina operacional.

A proposta adotada é A3, que já é parcialmente implementada.

---

## Consequências

### Impacto positivo

- Remove o maior risco de governança identificado nos seis ciclos de auditoria.
- Faz o Gestor Escolar ser, de fato, a fonte única de dado mestre.
- Divergências tornam-se visíveis e auditáveis antes de afetar relatórios e
  boletins.

### Dependência crítica

Esta decisão depende do ADR-002 (chave de identidade forte): sem CPF/INEP
preenchidos, o match-only cai no fallback nome+nascimento, de baixa confiança.
O match-only total só é eficaz após backfill de INEP/CPF ou definição de
código interno forte.

### Migração necessária

1. Criar tabela `importacao_divergencias` (aluno/turma não encontrados por
   chave forte) com colunas: `importacao_id`, `tipo` (`turma`|`aluno`),
   `dado_etl` JSONB, `chave_tentada`, `status` (`pendente`|`vinculado`|
   `ignorado`), `criado_em`, `resolvido_por`.
2. Remover o bloco de INSERT de turmas/alunos do ETL em modo estrito; substituir
   por `registrarDivergencia()`.
3. Criar UI de triagem de divergências em `/admin/importacoes/[id]/divergencias`.
4. Manter `ETL_GATE_MESTRE=transicao` no `.env.local` de desenvolvimento durante
   a migração; definir data de corte para produção.

### Riscos

- Importações que hoje "funcionam" por criar automaticamente passarão a gerar
  divergências, exigindo ação manual do Gestor antes de reimportar. Isso pode
  causar atraso em rodadas de avaliação se o Gestor não estiver com os
  cadastros atualizados.
- O modo transição, se esquecido ligado, reintroduz o anti-padrão.

---

## Plano de migração (aditivo primeiro)

| Passo | Ação | Quem | Observação |
|-------|------|------|------------|
| 1 | Criar `importacao_divergencias` (migration aditiva, sem DROP) | especialista-banco-sisam | Idempotente |
| 2 | Implementar `registrarDivergencia()` em `lib/services/importacao/governanca.ts` | implementador-sisam | Paralelo ao passo 1 |
| 3 | Adaptar `batch/turmas.ts` e `batch/alunos.ts` para chamar `registrarDivergencia` em vez de INSERT quando modo estrito | implementador-sisam | Cobrir com testes Vitest |
| 4 | Criar tela de triagem em `/admin/importacoes/[id]/divergencias` | frontend-sisam | Depende dos passos 1–3 |
| 5 | Validar em educanet-demo com importação de arquivo real | qa-sisam | Checar que 0 mestres são criados pelo ETL |
| 6 | Definir data de corte e desativar `ETL_GATE_MESTRE=transicao` em produção | time (decisão humana) | Após passo 5 verde |

---

## Referências

- `docs/automacao/fluxo-escolar/relatorio-ciclo-1.md` §2, §4 (identificação do anti-padrão)
- `docs/automacao/fluxo-escolar/relatorio-ciclo-2.md` §3, §4 (implementação do gate)
- `docs/automacao/fluxo-escolar/relatorio-ciclo-4.md` §2 (gate consolidado + governança bidirecional)
- `docs/automacao/fluxo-escolar/relatorio-ciclo-6.md` §2 (estado atual, trigger `trg_turmas_coerencia_origem`)
- `lib/services/importacao/config.ts` — `getEtlGateMode()`
- `lib/services/importacao/batch/turmas.ts` e `batch/alunos.ts` — ponto de criação a ser refatorado
- `database/migrations/004_divergencias_historico.sql` — precursor da tabela proposta
- `app/api/admin/importacoes/auditoria-governanca/route.ts` — endpoint de saúde do gate (Ciclo 5)
- ADR-002 (dependência: chave de identidade forte para alunos)
