Configure a conexao com Supabase PostgreSQL no padrao SISAM (pool inteligente, retry, health check).

Entrada: $ARGUMENTS (url do supabase ou "default" para template)

## 1. Criar `database/connection.ts`
Pool PostgreSQL com:
- Deteccao automatica de Transaction Mode (porta 6543) vs Session Mode (5432)
- Pool size ajustado: 40 conexoes em Transaction Mode, 8 em Session Mode
- Retry com backoff exponencial (4 tentativas: 300ms, 600ms, 1200ms, 2400ms)
- Health check periodico com reconexao automatica
- Fila de queries (max 50 concorrentes, max 500 na fila, timeout 30s)
- SSL com rejectUnauthorized false (padrao Supabase)
- `allowExitOnIdle: true` (importante para serverless/Vercel)
- `keepAlive: true` com delay 10s
- IPv4 forcado em producao (`family: 4`)
- Timezone UTC forçado em todas conexoes
- Wrapper com lazy initialization e hot-reload de config

## 2. Criar `.env.example`
```
DB_HOST=seu-host.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.seu-project-ref
DB_PASSWORD=sua-senha
DB_SSL=true
JWT_SECRET=gere-com-openssl-rand-hex-32
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## 3. Criar `lib/constants.ts` com constantes de DB
```typescript
export const PG_ERRORS = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  UNDEFINED_TABLE: '42P01',
  NOT_NULL_VIOLATION: '23502',
} as const

export const TIMEOUT = {
  QUERY: 30000,
  STATEMENT: 30000,
  IDLE_SUPABASE: 20000,
  IDLE_DEFAULT: 30000,
  HEALTH_CHECK_INTERVAL: 60000,
} as const

export const RETRY = {
  MAX_TENTATIVAS: 4,
  DELAY_BASE_MS: 300,
  DELAY_MAX_MS: 3000,
} as const

export const POOL = {
  MAX_CONCURRENT_QUERIES: 50,
  MAX_QUEUE_SIZE: 500,
  QUEUE_ITEM_TIMEOUT: 30000,
} as const
```

## 4. Criar helper `lib/validation.ts`
- `DatabaseError` interface com code, detail, hint, table, constraint
- `isValidUUID()`, `validateUUID()`
- `isValidEmail()`, `validateEmail()`
- `safeErrorResponse()` — nunca expoe detalhes internos

## 5. Validar conexao
Criar script `scripts/testar-conexao.js` para verificar se a conexao funciona.

## 6. Verificar next.config
Adicionar validacao de env vars obrigatorias no build:
```javascript
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']
```
