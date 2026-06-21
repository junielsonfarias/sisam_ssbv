# Plano de Implementação — Auditoria Geral SISAM

> **Data:** 2026-06-20
> **Origem:** auditoria multi-agente (revisor, segurança/LGPD, performance, banco de dados).
> **Status:** plano aprovado para registro — execução pendente de decisão por onda.

---

## ⚠️ Ressalva de método (ler antes de aplicar qualquer coisa de banco)

A auditoria de banco rodou contra o projeto **demo** (`tbbnswuqsqhulserwtcc`).
A **produção** (`cjxejpgtuuqnbczpbdfe`) **não estava acessível** pelo MCP no momento da análise.

**Decisão registrada:** correções de banco (Onda 3) serão **validadas no demo primeiro**;
produção só recebe as migrations após reconectar o MCP e reconfirmar os advisors
(`get_advisors`) e `pg_stat_user_indexes` no banco real de produção.

> **Atualização 2026-06-21:** nesta fase de desenvolvimento, **produção = desenvolvimento = o
> mesmo banco**, que é o `educanet-demo` (`tbbnswuqsqhulserwtcc`) — é nele que o app roda e onde
> estão os dados reais (tabela `alunos` etc.). O ref `cjxejpgtuuqnbczpbdfe` citado acima **não é
> o banco ativo** (não possui as tabelas do sistema) — desconsiderar. Portanto as migrations já
> aplicadas no `educanet-demo` JÁ estão no banco em uso; não há um "banco de produção" separado
> pendente de aplicação nesta etapa.

---

## Veredito geral

Codebase **saudável**: `tsc --noEmit` limpo, **939 testes** passando (57 arquivos),
298 rotas com `force-dynamic`, **sem SQLi explorável ativo**, base de auth sólida
(JWT 15 min + refresh rotativo, bcrypt, 2FA anti-replay `jti`, rate limit em 2 camadas,
CSRF por Origin, HSTS/CSP). Achados são majoritariamente **autorização por escopo**,
**invalidação de cache** e **dívida técnica** — não bugs em produção.
**Exceção:** 1 vazamento de PII real (S1) que pede correção imediata.

---

## Achados por severidade

| #   | Sev    | Área        | Problema                                                                                  | Arquivo                                         |
|-----|--------|-------------|-------------------------------------------------------------------------------------------|-------------------------------------------------|
| S1  | 🔴→🟠  | Segurança   | `analise/dados` retorna provas de TODO o município p/ professor/responsável (sem escopo)  | `app/api/analise/dados/route.ts:17-57`          |
| S2  | 🟠     | Segurança   | `addAccessControl` fail-open: vínculo nulo → query sem WHERE = tabela inteira              | `lib/api-helpers.ts:188-208`                    |
| Q1  | 🟠     | Qualidade   | Importação em lote sem transação → alunos órfãos (`turma_id=null`) silenciosos             | `lib/services/importacao/batch.ts:38-91`        |
| P1  | 🟠     | Performance | `recalcular-niveis` invalida só cache de arquivo → dashboards stale                        | `app/api/admin/recalcular-niveis/route.ts:96`   |
| P2  | 🟠     | Performance | Mutações limpam só `dashboard:*`, deixam `executivo/evolucao/stats` stale                  | 8 rotas (ver abaixo)                            |
| P3  | 🟠     | Performance | Dashboard carrega 10.000 alunos num payload, pagina no cliente, sem virtualização          | `app/admin/sisam/dados/hooks/useDadosLoading.ts:395` |
| D1  | 🟠     | Banco       | Migrations do repo (`fix-fks`, `fix-search-path`) não aplicadas no banco                   | divergência repo↔banco                          |
| S3  | 🟡     | Segurança   | Folha/RH/ponto/saúde SEMED permitem escola/polo sem escopo (latente)                       | `folha`, `rh`, `ponto`, `saude` routes          |
| S4  | 🟡     | Segurança   | SQLi latente (código morto, variável não usada) em metas-escola                            | `app/api/admin/metas-escola/route.ts:46`        |
| D2  | 🟡     | Banco       | 11 índices duplicados + 85 FKs sem índice de cobertura                                     | advisors (duplicate_index / unindexed_fk)       |
| Q2  | 🟡     | Qualidade   | 94 arquivos > 400 linhas; cobertura de integração ~8% (25 arq. / 298 rotas)               | —                                               |
| Q3  | 🟡     | Qualidade   | ~17 carregamentos engolem erro (`.catch(()=>{})`, sem `res.ok`)                            | pages do gestor                                 |
| M3  | 🔵     | Segurança   | Terminal de dispositivo não reforça liveness no servidor (web reforça)                     | `app/api/facial/presencas/route.ts`             |
| B1  | 🔵     | Segurança   | Boletim público enumerável por `codigo` (mitigado por rate limit)                          | `app/api/boletim/route.ts:94-108`               |
| B2  | 🔵     | Segurança   | Comparação não timing-safe do `CRON_SECRET`                                                | `app/api/cron/notificar-infrequencia/route.ts:27` |
| D3  | 🔵     | Banco       | `pg_trgm` no schema `public`; 14 funções com search_path mutável (corrigir via D1)         | advisors                                        |

**8 rotas do P2:** `alunos/[id]/route.ts:275`, `frequencia/route.ts:166`,
`metas-escola/route.ts:148`, `matriculas/turmas/route.ts:83`, `matriculas/alunos/route.ts:46`,
`controle-vagas/route.ts:117,142`, `escolas/[id]/route.ts:162`.

---

## Plano de implementação (4 ondas)

### 🔴 Onda 1 — Segurança (imediato, ~1 dia) — `implementador-sisam` + `qa-sisam`

1. **S1** — Restringir `analise/dados` a `[administrador, tecnico, polo, escola]`;
   `professor`/`responsavel`/`editor`/`publicador` → **403**. *(maior prioridade — vaza PII em massa).*
   Antes: verificar se alguma tela legítima de professor consome o endpoint.
2. **S2** — Tornar `addAccessControl` **fail-closed**: vínculo `escola_id`/`polo_id` nulo →
   condição impossível (`campo = NULL` que nunca casa), nunca tabela inteira.
   Revisar também `lib/auth.ts` (`podeAcessarPolo`) e `alunos/[id]/route.ts:53`.
   Adicionar teste unitário do builder com `polo_id = null`.
3. **S4** — Remover a linha morta de SQLi em `metas-escola/route.ts:46`.
4. `qa-sisam` trava o comportamento com testes de autorização (403 esperado, escopo correto).

**Critério de aceite:** professor/responsável recebem 403 em `analise/dados`;
conta com vínculo nulo recebe vazio/403; suíte verde.

### 🟠 Onda 2 — Integridade e cache (~2 dias) — `implementador-sisam` + `qa-sisam`

5. **Q1** — Importação transacional: `pool.connect()` + `BEGIN/COMMIT`, **SAVEPOINT por item**
   (preservando o fallback individual existente). Turma que não resolve para id real →
   acumular em lista de **rejeitados** no `ImportacaoResultado`, **nunca** inserir `turma_id=null`.
   Atenção ao Transaction Mode (porta 6543): manter batches pequenos. Liberar client no `finally`.
6. **P1 + P2** — Criar helper único `invalidarCachesDashboard()` em `lib/cache` cobrindo as
   **3 camadas** + todos os prefixos (`dashboard`, `dashboard-gestor`, `executivo`, `evolucao`,
   `stats`, `alunos-risco`, `graficos`, `alunos`). Aplicar em `recalcular-niveis` + nas 8 mutações.
7. **Q3** — Trocar `.catch(()=>{})` / catch vazio por `res.ok` + `toast.error` nos ~17 carregamentos.
   **Não** tocar nos `await res.json().catch(() => ({}))` (parsing seguro idiomático, correto).
8. **Q2 (testes)** — Cobrir importação (feliz + falha parcial pós-Q1), `fechamento-ano` e
   `resultados-consolidados` com testes de integração (mock `pool.query` + `@/lib/cache`).

### 🟡 Onda 3 — Banco — **validar no DEMO primeiro**, prod só após reconfirmar advisors — `especialista-banco-sisam`

> Pré-requisito p/ prod: reconectar MCP a `cjxejpgtuuqnbczpbdfe` e rodar
> `get_advisors(security)`, `get_advisors(performance)` e `pg_stat_user_indexes`.

9. **D1** — Reconciliar repo↔banco: aplicar `fix-fks-sem-on-delete.sql` e
   `fix-search-path-funcoes.sql` (já existem no repo, idempotentes) no demo; confirmar/aplicar em prod.
   Definir fonte única da verdade de migrations.
10. **D2** — Aplicar `database/migrations/fix-indices-duplicados.sql` (já criado, não aplicado):
    remove os 11 índices duplicados com `DROP INDEX IF EXISTS`/`CONCURRENTLY`.
    Validar que os pares UNIQUE (suporte a `ON CONFLICT`) mantêm o índice que cobre as mesmas colunas.
    Criar índices só para as **FKs do caminho quente** (notificacoes aluno/turma/polo,
    documentos_emitidos.escola_id, registrado_por de notas/frequência) — **não** os 85.
    **Não** dropar índices por `unused_index` no demo (estatística não confiável).
11. **S3** — Decisão de produto sobre folha/RH/ponto/saúde SEMED: remover escola/polo da
    allow-list **ou** escopar por `servidor_lotacoes`. Confirmar `acesso_semed=true` em prod antes.

### 🔵 Onda 4 — Dívida técnica e higiene (contínuo)

12. **P3** — Paginação **server-side** (LIMIT/keyset) + virtualização (`components/ui/virtual-list.tsx`)
    no dashboard de alunos; cachear no Redis só a página + total, não o array inteiro.
    Mover filtro/ordenação do cliente para o backend. *(maior esforço — fazer depois de P1/P2).*
13. **Q2 (decomposição)** — Fatiar os 10 piores arquivos > 400 linhas (top: `responsavel/filho/page.tsx:858`,
    `gestor/alunos/page.tsx:778`, `estatisticas/queries.ts:759`, `ed-infantil/page.tsx:759`).
    Pages → componentes/hooks; services → subpasta com barrel `index.ts`. **Não** mexer em tipos puros.
14. **Higiene:** M3 (liveness device online), B1 (boletim + nascimento), B2 (`crypto.timingSafeEqual`),
    D3 (`pg_trgm` → schema `extensions`), remover `app/api/test-dns/route.ts` (já é 404).

---

## Não tocar (decisões registradas)

- **RLS sem policy em ~118 tabelas** — **intencional** (defesa em profundidade). App conecta via
  role que bypassa RLS; autorização real é o `withAuth`. **Não** abrir policies SELECT — vazaria PII.
- `database/connection.ts` (exceção de config de pool) e arquivos de tipos puros
  (`dashboard/types.ts`, `lib/dados/types.ts`, `lib/relatorios/tipos.ts`).
- `await res.json().catch(() => ({}))` — parsing seguro correto.

---

## Paralelização

- **Onda 1:** S1, S2, S4 independentes (S1→S2 mesma área de acesso é boa sequência).
- **Onda 2:** P1/P2 e Q3 independentes; Q1 antes do teste de falha parcial (item 8).
- **Onda 3:** D1, D2 independentes; S3 depende de decisão de produto.
- **Onda 4:** itens independentes entre si.

---

## Artefatos já produzidos pela auditoria

- `database/migrations/fix-indices-duplicados.sql` — **criado, não aplicado** (D2).
- `database/migrations/fix-fks-sem-on-delete.sql` — já existia, **aplicar** (D1/M3 banco).
- `database/migrations/fix-search-path-funcoes.sql` — já existia, **aplicar** (D1/M4 banco).
