# CLAUDE.md — Regras do Projeto SISAM

## Idioma
- Sempre responder em **portugues do Brasil**

---

## Registro de Horas (OBRIGATORIO)
Ao final de cada sessao de trabalho, **SEMPRE** atualizar `docs/HORAS-DESENVOLVIMENTO.md`:
1. Adicionar a nova sessao na tabela do mes correspondente
2. Atualizar subtotal do mes, tabela "Horas por Mes" e "Resumo Geral"
3. Adicionar marco na "Evolucao Acumulada" se houve entrega significativa
4. Calcular horas: timestamps primeiro/ultimo commit + 1h buffer, minimo 1.5h
5. Comandos para metricas:
   - Linhas: `find app components lib database -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l | tail -1`
   - Commits: `git log --oneline | wc -l`
   - Testes: `npx vitest run 2>&1 | grep "Tests"`

---

## Padrao de Commits
- Mensagens em **portugues**
- Prefixos: `feat`, `fix`, `refactor`, `ui`, `docs`, `test`, `chore`
- Sempre incluir `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
- Usar HEREDOC para mensagens multi-linha

---

## CI/CD
- GitHub Actions deve estar **verde** antes de considerar deploy pronto
- Node.js **20** no CI (Vitest 4.x requer Node 20.12+)
- Testes devem passar localmente (`npm test`) antes de push
- Rodar `npx tsc --noEmit` para verificar tipos antes de commit
- ESLint: `eslint.ignoreDuringBuilds: true` no next.config.js (lint roda como step separado)

---

## Arquitetura

### Stack
- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript 5.4
- **Banco**: PostgreSQL via Supabase (porta 6543 Transaction Mode)
- **Cache**: Upstash Redis (REST) + memoria + arquivo
- **Auth**: JWT em cookie httpOnly (bcryptjs)
- **Validacao**: Zod 100% em todas as APIs
- **PWA**: @ducanh2912/next-pwa (offline-first)
- **Testes**: Vitest (unitarios/integracao) + Playwright (E2E)

### Tipos de Usuario
`administrador`, `tecnico`, `polo`, `escola`, `professor`, `editor`, `publicador`

### Estrutura de Pastas
```
app/api/[categoria]/[recurso]/route.ts     → API Routes
app/[role]/[pagina]/page.tsx               → Pages
app/[role]/[pagina]/components/            → Componentes especificos da pagina
components/                                → Componentes reutilizaveis
components/ui/                             → UI genericos (modal, spinner, etc.)
components/site/                           → Site institucional
lib/services/[recurso].service.ts          → Service layer
lib/hooks/use[Nome].ts                     → Custom hooks
lib/schemas.ts                             → Schemas Zod centralizados
lib/types.ts                               → Interfaces TypeScript
lib/constants.ts                           → Constantes agrupadas por dominio
lib/cache/                                 → Cache (memory, file, redis, session)
lib/auth/                                  → Autenticacao
database/connection.ts                     → Pool PG com retry/health check
database/migrations/                       → SQL migrations
__tests__/unit/                            → Testes unitarios
__tests__/integration/api/                 → Testes de integracao
e2e/                                       → Testes E2E Playwright
```

---

## Padroes de Codigo

### API Routes — Padrao Obrigatorio
```typescript
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema Zod inline ou importado de lib/schemas.ts
const meuSchema = z.object({ ... })

// GET com autenticacao
export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const result = await pool.query('SELECT ... FROM ... WHERE ... = $1', [param])
  return NextResponse.json({ dados: result.rows })
})

// POST com validacao
export const POST = withAuth(['administrador'], async (request, usuario) => {
  const body = await request.json()
  const parsed = meuSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
  }
  // ... pool.query com $1, $2 (NUNCA string interpolation)
  return NextResponse.json(result.rows[0], { status: 201 })
})
```

**Regras:**
- SEMPRE `export const dynamic = 'force-dynamic'`
- SEMPRE usar `withAuth(tipos, handler)` para rotas protegidas
- SEMPRE queries parametrizadas ($1, $2) — NUNCA interpolacao
- SEMPRE retornar `{ mensagem: '...' }` em erros
- SEMPRE tratar `PG_ERRORS.UNIQUE_VIOLATION` quando relevante
- Usar `RETURNING *` ou colunas especificas em INSERT/UPDATE
- Invalidar cache apos mutacoes: `cacheDelPattern('chave:*')`

### Paginas — Padrao Obrigatorio
```typescript
'use client'

import ProtectedRoute from '@/components/protected-route'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function MinhaPage() {
  const toast = useToast()
  const [dados, setDados] = useState<Tipo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  const carregar = async () => { ... }

  if (carregando) return <ProtectedRoute tiposPermitidos={[...]}><LoadingSpinner centered /></ProtectedRoute>

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
      {/* conteudo */}
    </ProtectedRoute>
  )
}
```

**Regras:**
- SEMPRE `'use client'` no topo
- SEMPRE envolver com `<ProtectedRoute tiposPermitidos={[...]}>`
- SEMPRE usar `useToast()` para feedback: `toast.success()`, `toast.error()`
- SEMPRE mostrar `<LoadingSpinner>` enquanto carrega
- Verificar `res.ok` antes de usar resposta do fetch

### Componentes — Convenções
- Arquivo: `kebab-case.tsx` → Export: `PascalCase`
- Props tipadas com interface
- Dark mode SEMPRE: `dark:bg-slate-800 dark:text-white`
- Formularios: `<Campo>` + `<Secao>` reutilizaveis
- Tabelas: desktop (`hidden sm:block`) + mobile cards (`sm:hidden`)

### Estilo — Tailwind
```
Cores institucionais: blue (NUNCA emerald em paginas publicas)
Primario/acoes: indigo-600 (hover: indigo-700)
Sucesso: green-600 (badge: bg-green-100 text-green-700)
Alerta: amber-600 (badge: bg-amber-100 text-amber-700)
Erro: red-600 (badge: bg-red-100 text-red-700)
Fundo: white / dark:slate-800
Borda: gray-200 / dark:slate-700
Input: rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm
Label: text-xs font-medium text-gray-500 dark:text-gray-400 mb-1
Card: bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700
```

### Responsividade
- Mobile-first: estilos base sao mobile, adicionar `sm:`, `md:`, `lg:` para telas maiores
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- Inputs grandes em formularios: `py-4 sm:py-5 text-base sm:text-lg`
- Containers sem max-w restritivo: `w-full max-w-none` ou `max-w-7xl`

### Imports — Ordem
1. Next.js/React (`next/server`, `react`)
2. Libs externas (`lucide-react`, `zod`, `pg`)
3. Projeto `@/lib/...`, `@/components/...`, `@/database/...`
4. Types com `import type { ... }`
- NUNCA imports relativos (`../../../`) — SEMPRE alias `@/`

### TypeScript
- Interfaces com JSDoc para entidades publicas
- `any` permitido APENAS em rows de queries DB (`pool.query`)
- Schemas Zod com `.transform()` para normalizacao
- Constantes com `as const`
- Tipos de erro: `(error as DatabaseError).code`

### Service Layer (`lib/services/`)
- Um arquivo por recurso: `[recurso].service.ts`
- Interfaces para DB rows e retornos tipados
- JSDoc com descricao e "Usado por:"
- Usar `createWhereBuilder()` para WHERE dinamicos
- Retornar `result.rows` direto (tipado)

### Cache
- Redis: `withRedisCache(key, ttl, fn)` para GET publicas
- Memoria: `memoryCache.get/set` para dashboards
- Arquivo: `verificarCache/carregarCache/salvarCache` para dados pesados
- Invalidar com `cacheDelPattern('chave:*')` apos mutacoes
- Incluir `_cache: { origem: 'memoria' | 'arquivo' | 'banco' }` em respostas

### Testes
- Unitarios em `__tests__/unit/` com `vitest`
- Integracao em `__tests__/integration/api/` com mocks de `pool.query`
- E2E em `e2e/` com `playwright`
- Mockar `@/database/connection` e `@/lib/cache` nos testes
- Verificar status HTTP + campos da resposta JSON

---

## Skills Disponiveis (/commands)

### Setup e Inicializacao
| Comando | Descricao |
|---------|-----------|
| `/setup-nextjs` | Projeto Next.js 14 completo com todas dependencias e config |
| `/setup-supabase` | Conexao Supabase com pool inteligente, retry, health check |
| `/setup-prisma-vps` | Prisma ORM para PostgreSQL em VPS com Docker |
| `/setup-ci` | GitHub Actions CI (tsc + lint + vitest + build) |
| `/setup-pwa` | PWA com service worker, offline-first, manifest |
| `/setup-testes` | Vitest + Playwright completo |

### Frontend e Design
| Comando | Descricao |
|---------|-----------|
| `/design-system` | Sistema de design: CSS vars, dark mode, componentes base |
| `/novo-layout` | Layout com sidebar colapsavel, header, dark mode |
| `/novo-dashboard` | Dashboard com KPIs, graficos Recharts, filtros |
| `/novo-formulario` | Formulario com secoes, validacao Zod, responsivo |
| `/nova-tabela-responsiva` | Tabela desktop + cards mobile, paginacao, busca |
| `/novo-componente` | Componente React reutilizavel com dark mode |
| `/nova-pagina` | Pagina completa com ProtectedRoute, loading, toast |

### Backend e API
| Comando | Descricao |
|---------|-----------|
| `/nova-api` | Endpoint com withAuth, Zod, pool.query |
| `/nova-autenticacao-jwt` | Sistema auth completo: JWT, bcrypt, cookies, protected route |
| `/novo-middleware-seguranca` | Rate limiting, CSRF, CSP, security headers |
| `/novo-crud-completo` | CRUD completo: API + pagina + service + testes |
| `/novo-upload-arquivo` | Upload com validacao, leitura Excel, export CSV |
| `/novo-cache-strategy` | Cache 3 camadas: Redis + memoria + arquivo |
| `/novo-logger` | Logger estruturado com niveis e contexto |
| `/novo-service` | Service layer com tipos e WHERE builder |

### Banco de Dados
| Comando | Descricao |
|---------|-----------|
| `/novo-schema-supabase` | Schema SQL com UUID, timestamps, indices, triggers |
| `/novo-schema-prisma` | Schema Prisma com relacoes, enums, map snake_case |
| `/nova-migracao` | Migration SQL com header padrao e indices |
| `/novo-seed` | Seed de dados iniciais (admin, polos, escolas) |
| `/novo-indice-performance` | Indices de performance, pg_trgm, ANALYZE |

### Utilitarios
| Comando | Descricao |
|---------|-----------|
| `/novo-modulo` | Modulo completo: SQL + API + pagina + testes |
| `/novo-teste` | Testes unitarios, integracao ou E2E |
| `/verificar-projeto` | Verificacao completa: TS + testes + lint + metricas |
| `/atualizar-horas` | Atualizar registro de horas de desenvolvimento |
