# CONTEXTO COMPARTILHADO — Time de Agentes SISAM

> **Fonte única da verdade** do time de agentes do SISAM. Todo agente do time
> **lê este arquivo no início** de qualquer tarefa antes de agir. Mantê-lo
> atualizado mantém o time sincronizado — se você descobrir um fato novo e
> durável sobre o sistema, sinalize para que seja registrado aqui.

Idioma do time: **sempre português do Brasil.**

---

## 1. O que é o SISAM
Sistema de gestão educacional municipal (SEMED). Multi-perfil, multi-módulo,
PWA offline-first. Deploy automático na Vercel ao dar push na `main`.

- **Produção real**: Supabase `cjxejpgtuuqnbczpbdfe` (~3.755 alunos).
- **Demo**: Supabase `tbbnswuqsqhulserwtcc` → `https://educanet-pi.vercel.app`
  (credenciais `*.demo@educanet.app` / `Educanet@2026`). `.env.local` aponta
  para o **banco de demo** (dev espelha educanet).
- O MCP Supabase nem sempre está conectado ao banco do SISAM — confirme com
  `list_projects` antes de afirmar que validou contra o banco real.

## 2. Stack
- **Next.js 14 (App Router)** · **TypeScript 5.4**
- **PostgreSQL via Supabase** (pooler porta 6543, Transaction Mode; sessão prefixo `aws-1`)
- **Cache 3 camadas**: Upstash Redis (REST) + memória (Map) + arquivo
- **Auth**: JWT em cookie httpOnly (bcryptjs) via `withAuth(tipos, handler)`
- **Validação**: Zod 100% em todas as APIs
- **PWA**: @ducanh2912/next-pwa · **Testes**: Vitest (unit/integração) + Playwright (E2E)
- CI: GitHub Actions deve estar **verde**; Node **20**; `npx tsc --noEmit` antes de commit.

## 3. Perfis de usuário
`administrador`, `tecnico`, `polo`, `escola`, `professor`, `editor`, `publicador`, `responsavel`

## 4. Módulos (permissão granular por colunas `acesso_*` em `usuarios`)
`sisam` · `gestor` · `semed` · `transparencia` · `admin`
(`educatec` = alias legado de `sisam`, auto-normalizado).

## 5. Mapa de pastas
```
app/api/[categoria]/[recurso]/route.ts   → API Routes
app/[role]/[pagina]/page.tsx             → Pages
app/[role]/[pagina]/components/          → componentes da página
components/ · components/ui/ · components/site/
lib/services/[recurso].service.ts        → service layer
lib/schemas.ts (e lib/schemas/) · lib/types.ts · lib/constants.ts
lib/cache/ (memory, file, redis, session) · lib/auth/ · lib/avaliacoes.ts
database/connection.ts · database/migrations/ · database/schema.sql
scripts/migrations/                      → migrations aplicadas via node (.js)
__tests__/unit/ · __tests__/integration/api/ · e2e/
docs/HORAS-DESENVOLVIMENTO.md            → registro de horas (obrigatório)
```
- **Máx. 400 linhas/arquivo** — acima disso, decompor em submódulos com barrel `index.ts` (fachada de re-export).

## 6. Padrões OBRIGATÓRIOS

**API Routes**
- `export const dynamic = 'force-dynamic'`
- `withAuth([tipos], handler)` com os tipos corretos para o recurso
- Validação Zod (`safeParse`/`validateRequest`); erro → `{ mensagem: '...' }` status 400
- Queries **parametrizadas** (`$1, $2`) — **NUNCA** interpolação de string (SQLi)
- `RETURNING` em INSERT/UPDATE · tratar `PG_ERRORS.UNIQUE_VIOLATION`
- **Invalidar cache após mutação**: `cacheDelPattern('chave:*')` (Redis, prefixa `sisam:`, usa SCAN) + `invalidateDashboardCache()`/`invalidateFiltrosCache()` (memória) + `limparTodosOsCaches()` (arquivo, só arquivo!)

**Pages**
- `'use client'` no topo · `<ProtectedRoute tiposPermitidos={[...]}>` envolvendo
- `useToast()` para feedback · `<LoadingSpinner centered />` no load · checar `res.ok`

**Componentes/estilo (Tailwind)**
- Arquivo `kebab-case.tsx` → export `PascalCase`; props com interface
- **Dark mode SEMPRE** (`dark:bg-slate-800 dark:text-white`)
- Tabelas: desktop (`hidden sm:block`) + cards mobile (`sm:hidden`); mobile-first
- Cores: **blue** em páginas públicas (NUNCA emerald); indigo-600 em ações; green/amber/red para estados
- Imports com alias `@/` (nunca `../../../`); types com `import type`; `any` só em rows de `pool.query`

## 7. Armadilhas recorrentes (caçar ativamente / não reintroduzir)
1. **`ativa` vs `ativo`** — `escolas`/`turmas`/`polos` usam `ativo` (masc); `pnae_nutricionistas`/`bncc_habilidades` usam `ativa` (fem). Errar = **falha silenciosa** (query vazia, sem erro).
2. **IDOR / controle de acesso** — endpoint que não filtra por polo/escola do `usuario` → vê/edita dado de outra unidade. Validar `WHERE` por escopo.
3. **Cherry-pick de `acesso_*`** — cliente nunca seleciona campos do payload à mão; propagar campos inteiros (4 pontos cliente + 5 backend).
4. **Cache no-op / residual** — cache configurado mas chave nunca invalidada, padrão errado, ou só o cache de arquivo invalidado (deixando Redis+memória stale). Dado velho em prod.
5. **Slug dinâmico** — APIs usam `[id]`, pages usam `[turmaId]`. Listar os irmãos da pasta antes de afirmar erro.
6. **Endpoint `?mode=`** — `/turmas` sem mode exige avaliação SISAM; CRUDs usam `?mode=listagem`.
7. **Import não-transacional / FK NULL** — lote sem savepoint por item; `resultados_provas.aluno_id` NULL escapa do `ON CONFLICT` e duplica; transferência sem registrar "entrada".
8. **`parseFloat` em `numeric` do PG** — PG devolve `numeric` como string; somas/comparações quebram sem conversão.
9. **Mascaramento de erro** — `safeQuery`/try-catch que engole o erro e devolve sucesso falso.
10. **`avaliacao_id` esquecido** — `resultados_*` exigem `avaliacao_id` NOT NULL; resolver via `resolverAvaliacaoId(param, anoLetivo)` (`@/lib/avaliacoes`).

## 8. Banco (alto nível)
- ~114 tabelas; 59 com RLS (100% das tabelas SEMED novas). Migrations em `database/migrations/*.sql` e `scripts/migrations/*.js`.
- Unicidade de resultados via `avaliacao_id`: `idx_resultados_provas_unique (aluno_id, questao_codigo, avaliacao_id)`; `resultados_consolidados (aluno_id, avaliacao_id)`.
- Auditoria SEMED: padrão `MODULO_VERBO_ENTIDADE`; **PII NUNCA vai para `detalhes`** (LGPD art. 11).

## 9. Regras de processo (valem para todo o time)
- **NUNCA `git push`** — push na `main` dispara deploy; é decisão exclusiva do usuário.
- **NÃO commitar por conta própria** sem pedido explícito. Quando pedido: msg pt-BR, prefixo (`feat`/`fix`/`refactor`/`ui`/`docs`/`test`/`chore`), HEREDOC p/ multi-linha, rodapé `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- **Não inventar "verde"** — rodar `npx tsc --noEmit` / testes e relatar o resultado real. Se pulou, dizer que pulou.
- **Validar achados** — auditorias passadas tiveram ~2 em 8 falsos positivos. Antes de afirmar bug, abrir o arquivo real; antes de fechar "OK", abrir 2-3 arquivos marcados como corretos (falsos negativos são silenciosos).
- **Registro de horas** — ao fim de sessão de trabalho, atualizar `docs/HORAS-DESENVOLVIMENTO.md` (ver `documentador-sisam`).

## 10. Severidades (vocabulário comum do time)
🔴 Crítico (segurança/perda de dado/quebra em prod) · 🟠 Alto (bug funcional) · 🟡 Médio (UX/dívida) · 🔵 Baixo (estilo/padrão).

## 11. Como o time colabora ("informações compartilhadas")
- O **`arquiteto-sisam`** recebe demandas amplas, planeja e produz um **mapa de delegação** (quem faz o quê, em que ordem, o que paraleliza).
- Especialistas de **análise** (`revisor-sisam`, `seguranca-sisam`, `performance-sisam`) entregam um **pacote de implementação** (formato no §12) — não escrevem código.
- Especialistas de **escrita** (`implementador-sisam`, `frontend-sisam`, `qa-sisam`, `especialista-banco-sisam`, `documentador-sisam`) consomem esse pacote e aplicam.
- **Handoff sempre estruturado** (§12) para que o próximo agente trabalhe sem reanalisar.
- Achados fora da sua área: **anote e reporte**, não saia corrigindo — o arquiteto roteia para o especialista certo.

## 12. Formato de handoff (pacote de implementação)
```
Tarefa: <verbo + objeto>
Arquivos a alterar: <lista exata>
Mudança: o quê e onde (função/linha/condição) — SEM colar o código final
Padrão SISAM a seguir: <regra/skill, ex: "queries parametrizadas", "/nova-api">
Critério de aceite: como saber que ficou certo (teste/query/comportamento)
Riscos/efeitos colaterais: cache a invalidar, migrations, telas afetadas
Ordem/dependências: o que precisa vir antes; o que pode paralelizar
Não tocar: <arquivos/áreas fora de escopo>
```
```
