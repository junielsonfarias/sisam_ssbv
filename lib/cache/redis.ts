/**
 * Redis Cache - Cache distribuido opcional
 *
 * Se REDIS_URL estiver configurada, usa Redis como cache distribuido.
 * Caso contrario, todas as operacoes retornam null/void (fallback gracioso).
 * Isso garante que o sistema funciona sem Redis em dev e producao atual.
 *
 * @module lib/cache/redis
 */

import Redis from 'ioredis'

let redis: Redis | null = null
let connectionFailed = false

function getRedis(): Redis | null {
  if (redis) return redis
  if (connectionFailed) return null

  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 5) {
          connectionFailed = true
          console.error('[Redis] Desistindo apos 5 tentativas')
          return null
        }
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
      connectTimeout: 5000,
    })

    redis.on('error', (err: Error) => {
      console.error('[Redis] Error:', err.message)
    })

    return redis
  } catch {
    connectionFailed = true
    return null
  }
}

/**
 * Gera chave de cache com prefixo padrao
 */
export function cacheKey(prefix: string, ...parts: (string | undefined)[]): string {
  return `sisam:${prefix}:${parts.filter(Boolean).join(':')}`
}

/**
 * Busca valor do Redis (retorna null se Redis indisponivel)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const val = await r.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

/**
 * Salva valor no Redis com TTL em segundos
 */
export async function cacheSet(key: string, data: unknown, ttlSeconds: number = 300): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    await r.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {
    /* non-blocking */
  }
}

/**
 * Remove chave do Redis
 */
export async function cacheDel(key: string): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    await r.del(key)
  } catch {
    /* non-blocking */
  }
}

/**
 * Remove chaves por padrao (ex: 'publicacoes:*')
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    const keys = await r.keys(`sisam:${pattern}`)
    if (keys.length > 0) await r.del(...keys)
  } catch {
    /* non-blocking */
  }
}

/**
 * Higher-order cache wrapper
 *
 * Tenta obter do Redis; se nao encontrar, executa fetcher e salva resultado.
 * Se Redis nao estiver disponivel, executa fetcher diretamente.
 */
export async function withRedisCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  await cacheSet(key, data, ttlSeconds)
  return data
}
