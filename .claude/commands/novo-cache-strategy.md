Crie uma estrategia de cache em 3 camadas no padrao SISAM.

Entrada: $ARGUMENTS (tipo: "redis", "memoria", "arquivo" ou "completo")

## Camada 1: Redis (Upstash REST — serverless)

### Instalar
```bash
npm install @upstash/redis
```

### Criar `lib/cache/redis.ts`
```typescript
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null

const PREFIX = 'app:'

export function cacheKey(...parts: string[]): string {
  return PREFIX + parts.filter(Boolean).join(':')
}

export async function withRedisCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  if (!redis) return fn()
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) return cached
  } catch { /* Redis offline — fallback */ }

  const data = await fn()
  try { await redis.set(key, JSON.stringify(data), { ex: ttlSeconds }) } catch {}
  return data
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis) return
  try {
    const keys = await redis.keys(PREFIX + pattern)
    if (keys.length > 0) await Promise.all(keys.map(k => redis!.del(k)))
  } catch {}
}
```

### TTLs recomendados
| Tipo | TTL | Exemplos |
|------|-----|----------|
| Publico | 120-300s | site-config, publicacoes |
| Dashboard | 60s | estatisticas, graficos |
| Referencia | 300-600s | series, disciplinas |
| Boletim | 60s | notas, frequencia |

## Camada 2: Memoria (LRU in-process)

### Criar `lib/cache/memory.ts`
```typescript
interface CacheEntry<T> { data: T; expiresAt: number }

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private maxEntries = 1000

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry || Date.now() > entry.expiresAt) { this.cache.delete(key); return null }
    return entry.data
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (this.cache.size >= this.maxEntries) this.evict()
    this.cache.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  private evict(): void {
    const now = Date.now()
    for (const [k, v] of this.cache) {
      if (now > v.expiresAt) this.cache.delete(k)
    }
    if (this.cache.size >= this.maxEntries) {
      const keys = Array.from(this.cache.keys()).slice(0, this.maxEntries * 0.2)
      keys.forEach(k => this.cache.delete(k))
    }
  }
}

export const memoryCache = new MemoryCache()
```

## Camada 3: Arquivo (persistente entre deploys)

### Criar `lib/cache/file.ts`
Para cache que sobrevive a restarts (dashboards pesados).
Salvar em `/tmp/cache/` com TTL em metadata.

## Uso na API
```typescript
// Endpoint publico com Redis
export async function GET(request: NextRequest) {
  const key = cacheKey('meu-recurso', 'all')
  const data = await withRedisCache(key, 300, async () => {
    return pool.query('SELECT * FROM recursos WHERE ativo = true')
  })
  return NextResponse.json(data)
}

// Dashboard com memoria + Redis
export const GET = withAuth(['admin'], async (request) => {
  const memKey = 'dashboard:admin'
  const cached = memoryCache.get(memKey)
  if (cached) return NextResponse.json({ ...cached, _cache: { origem: 'memoria' } })

  const data = await withRedisCache(cacheKey('dashboard'), 60, async () => {
    return await getDashboardData()
  })
  memoryCache.set(memKey, data, 60000)
  return NextResponse.json({ ...data, _cache: { origem: 'banco' } })
})
```

## Invalidacao apos mutacoes
```typescript
// No POST/PUT/DELETE:
await cacheDelPattern('recursos:*')
memoryCache.delete('dashboard:*')
```

## Graceful fallback
- Se Redis offline: funciona sem cache (fn() direto)
- Se memoria cheia: evict automatico (LRU)
- Nunca quebrar a API por falha de cache
