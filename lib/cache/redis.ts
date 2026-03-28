/**
 * Redis Cache - Cache distribuído via Upstash Redis (REST)
 *
 * Usa @upstash/redis (HTTP-based) — perfeito para Vercel serverless.
 * Se UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN estiverem configurados, usa Redis.
 * Caso contrário, fallback para ioredis com REDIS_URL, ou execução direta.
 *
 * @module lib/cache/redis
 */

import { Redis as UpstashRedis } from '@upstash/redis'

let redis: UpstashRedis | null = null

function getRedis(): UpstashRedis | null {
  if (redis) return redis

  const restUrl = process.env.UPSTASH_REDIS_REST_URL
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!restUrl || !restToken) return null

  try {
    redis = new UpstashRedis({ url: restUrl, token: restToken })
    return redis
  } catch {
    return null
  }
}

/**
 * Gera chave de cache com prefixo padrão
 */
export function cacheKey(prefix: string, ...parts: (string | undefined)[]): string {
  return `sisam:${prefix}:${parts.filter(Boolean).join(':')}`
}

/**
 * Busca valor do Redis (retorna null se Redis indisponível)
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const val = await r.get<T>(key)
    return val ?? null
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
    await r.set(key, JSON.stringify(data), { ex: ttlSeconds })
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
 * Remove chaves por padrão (ex: 'publicacoes:*')
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const r = getRedis()
  if (!r) return
  try {
    const fullPattern = `sisam:${pattern}`
    let cursor = 0
    do {
      const result = await r.scan(cursor, { match: fullPattern, count: 100 })
      cursor = Number(result[0])
      const keys = result[1] as string[]
      if (keys.length > 0) {
        const pipeline = r.pipeline()
        keys.forEach(k => pipeline.del(k))
        await pipeline.exec()
      }
    } while (cursor !== 0)
  } catch {
    /* non-blocking */
  }
}

/**
 * Higher-order cache wrapper
 *
 * Tenta obter do Redis; se não encontrar, executa fetcher e salva resultado.
 * Se Redis não estiver disponível, executa fetcher diretamente.
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
