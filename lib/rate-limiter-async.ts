/**
 * Rate Limiter assíncrono — persiste em Redis (Upstash) quando disponível.
 *
 * Diferença do `rate-limiter.ts` (síncrono, em memória):
 *  - Persiste entre reinícios e funciona em múltiplas instâncias serverless
 *  - Atomic via INCR + EXPIRE
 *  - Fallback automático para o store em memória se Redis indisponível
 *
 * Usado no fluxo de login para criar uma camada adicional por usuário
 * (independente de IP), prevenindo brute-force distribuído.
 *
 * @module lib/rate-limiter-async
 */

import { checkRateLimit as checkRateLimitMem, resetRateLimit as resetRateLimitMem, type RateLimitResult } from './rate-limiter'
import { Redis as UpstashRedis } from '@upstash/redis'

let redisClient: UpstashRedis | null = null
let redisInitTried = false

function getRedis(): UpstashRedis | null {
  if (redisInitTried) return redisClient
  redisInitTried = true

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    redisClient = new UpstashRedis({ url, token })
    return redisClient
  } catch {
    return null
  }
}

const PREFIX = 'sisam:ratelimit:'

/**
 * Versão async do rate limit que persiste em Redis quando configurado.
 *
 * Comportamento:
 *  - Cada chamada incrementa um contador no Redis (key TTL = windowMs)
 *  - Se exceder maxAttempts, marca uma chave de bloqueio (TTL = blockMs)
 *  - Bloqueio é verificado antes do incremento
 *
 * @param identifier — chave única (ex: email do usuário)
 * @param maxAttempts — tentativas permitidas na janela
 * @param windowMs — duração da janela
 * @param blockMs — duração do bloqueio quando exceder
 */
export async function checkRateLimitAsync(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000,
  blockMs: number = 30 * 60 * 1000
): Promise<RateLimitResult> {
  const redis = getRedis()
  if (!redis) {
    // Fallback para versão síncrona em memória
    return checkRateLimitMem(identifier, maxAttempts, windowMs)
  }

  const now = Date.now()
  const counterKey = `${PREFIX}cnt:${identifier}`
  const blockKey = `${PREFIX}blk:${identifier}`

  try {
    // Verificar bloqueio existente
    const blocked = await redis.get<number>(blockKey)
    if (blocked && blocked > now) {
      const minutos = Math.ceil((blocked - now) / 1000 / 60)
      return {
        allowed: false,
        remaining: 0,
        resetAt: blocked,
        blockedUntil: blocked,
        message: `Muitas tentativas. Tente novamente em ${minutos} minutos.`,
      }
    }

    // Incrementar contador e setar TTL
    const count = await redis.incr(counterKey)
    if (count === 1) {
      await redis.expire(counterKey, Math.ceil(windowMs / 1000))
    }

    if (count > maxAttempts) {
      // Bloquear
      const blockedUntil = now + blockMs
      await redis.set(blockKey, blockedUntil, { ex: Math.ceil(blockMs / 1000) })
      await redis.del(counterKey)
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        blockedUntil,
        message: `Muitas tentativas. Tente novamente em ${Math.ceil(blockMs / 1000 / 60)} minutos.`,
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - count),
      resetAt: now + windowMs,
    }
  } catch {
    // Em caso de erro no Redis, fallback para memória (degraded mode)
    return checkRateLimitMem(identifier, maxAttempts, windowMs)
  }
}

/**
 * Reseta o rate limit para um identificador (ex: após login bem sucedido).
 * Limpa tanto Redis quanto memória.
 */
export async function resetRateLimitAsync(identifier: string): Promise<void> {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.del(`${PREFIX}cnt:${identifier}`, `${PREFIX}blk:${identifier}`)
    } catch {
      // ignora
    }
  }
  resetRateLimitMem(identifier)
}

/**
 * Cria chave de rate limit por usuário (apenas email, sem IP).
 * Útil para detectar brute-force distribuído mesmo com IPs diferentes.
 */
export function createRateLimitKeyPorUsuario(email: string): string {
  return `usuario:${email.toLowerCase().trim()}`
}
