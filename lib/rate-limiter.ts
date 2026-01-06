/**
 * Rate Limiter simples em memoria
 *
 * NOTA: Em producao com multiplas instancias (Vercel), considere usar Redis
 * Este rate limiter funciona bem para uma unica instancia ou desenvolvimento
 */

interface RateLimitEntry {
  count: number
  firstAttempt: number
  blockedUntil?: number
}

// Armazenamento em memoria (limpo quando servidor reinicia)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configuracoes
const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_ATTEMPTS = 5 // Maximo de tentativas na janela
const BLOCK_DURATION_MS = 30 * 60 * 1000 // 30 minutos de bloqueio
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // Limpar entradas antigas a cada 5 minutos

// Limpar entradas antigas periodicamente
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remover entradas antigas (mais de 1 hora sem atividade)
    if (now - entry.firstAttempt > 60 * 60 * 1000 && !entry.blockedUntil) {
      rateLimitStore.delete(key)
    }
    // Remover bloqueios expirados
    if (entry.blockedUntil && now > entry.blockedUntil) {
      rateLimitStore.delete(key)
    }
  }
}, CLEANUP_INTERVAL_MS)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  blockedUntil?: number
  message?: string
}

/**
 * Verifica se uma requisicao deve ser permitida baseado no rate limit
 *
 * @param identifier - Identificador unico (IP, email, etc)
 * @param maxAttempts - Numero maximo de tentativas (default: 5)
 * @param windowMs - Janela de tempo em ms (default: 15 minutos)
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = MAX_ATTEMPTS,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Se esta bloqueado, verificar se bloqueio expirou
  if (entry?.blockedUntil) {
    if (now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.blockedUntil,
        blockedUntil: entry.blockedUntil,
        message: `Muitas tentativas. Tente novamente em ${Math.ceil((entry.blockedUntil - now) / 1000 / 60)} minutos.`
      }
    }
    // Bloqueio expirou, remover entrada
    rateLimitStore.delete(identifier)
  }

  // Se nao tem entrada ou janela expirou, criar nova
  if (!entry || now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(identifier, {
      count: 1,
      firstAttempt: now
    })
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: now + windowMs
    }
  }

  // Incrementar contador
  entry.count++

  // Verificar se excedeu limite
  if (entry.count > maxAttempts) {
    // Bloquear
    entry.blockedUntil = now + BLOCK_DURATION_MS
    rateLimitStore.set(identifier, entry)
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      blockedUntil: entry.blockedUntil,
      message: `Muitas tentativas. Tente novamente em ${Math.ceil(BLOCK_DURATION_MS / 1000 / 60)} minutos.`
    }
  }

  rateLimitStore.set(identifier, entry)
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    resetAt: entry.firstAttempt + windowMs
  }
}

/**
 * Reseta o rate limit para um identificador (ex: apos login bem sucedido)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Extrai o IP do cliente da requisicao
 */
export function getClientIP(request: Request): string {
  // Tentar obter IP real (atraves de proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback para IP generico (nao ideal)
  return 'unknown'
}

/**
 * Cria identificador combinando IP e email (mais seguro)
 */
export function createRateLimitKey(ip: string, email?: string): string {
  if (email) {
    return `${ip}:${email.toLowerCase()}`
  }
  return ip
}
