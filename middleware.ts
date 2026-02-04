import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Rate Limiter Global em Memória
 *
 * Configurações diferentes para diferentes tipos de endpoints:
 * - APIs de escrita (POST/PUT/DELETE): mais restritivo
 * - APIs de leitura (GET): menos restritivo
 * - Login: já tem rate limiting próprio
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
}

// Armazenamento em memória (limpo quando servidor reinicia)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Configurações por tipo de operação
// Ajustado para suportar 15-20 usuários simultâneos em ambiente escolar (mesmo IP)
const RATE_LIMITS = {
  // APIs de escrita: 60 requisições por minuto
  write: { maxRequests: 60, windowMs: 60 * 1000 },
  // APIs de leitura: 300 requisições por minuto (suporta ~20 usuários no mesmo IP)
  read: { maxRequests: 300, windowMs: 60 * 1000 },
  // APIs de importação: 10 requisições por minuto (operações pesadas)
  import: { maxRequests: 10, windowMs: 60 * 1000 },
}

// Endpoints excluídos do rate limiting (já têm próprio ou são públicos)
const EXCLUDED_PATHS = [
  '/api/auth/login',      // Tem rate limiting próprio
  '/api/auth/logout',     // Logout não precisa
  '/api/health',          // Health check
  '/api/init',            // Inicialização
]

// Endpoints de importação (mais restritivos)
const IMPORT_PATHS = [
  '/api/admin/importar',
  '/api/admin/importar-completo',
  '/api/admin/importar-cadastros',
  '/api/admin/importar-resultados',
]

/**
 * Extrai IP do cliente da requisição
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  return 'unknown'
}

/**
 * Verifica rate limit
 */
function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Se não tem entrada ou janela expirou, criar nova
  if (!entry || now - entry.firstRequest > windowMs) {
    rateLimitStore.set(key, { count: 1, firstRequest: now })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  // Incrementar contador
  entry.count++
  rateLimitStore.set(key, entry)

  // Verificar se excedeu limite
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.firstRequest + windowMs
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.firstRequest + windowMs
  }
}

/**
 * Limpa entradas antigas periodicamente
 */
function cleanupOldEntries() {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutos

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest > maxAge) {
      rateLimitStore.delete(key)
    }
  }
}

// Limpar a cada 2 minutos
let lastCleanup = Date.now()

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Ignorar requisições que não são API
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Verificar se endpoint está excluído
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Limpar entradas antigas periodicamente
  const now = Date.now()
  if (now - lastCleanup > 2 * 60 * 1000) {
    cleanupOldEntries()
    lastCleanup = now
  }

  // Determinar tipo de rate limit
  const method = request.method
  let rateLimitConfig = RATE_LIMITS.read

  // Endpoints de importação
  if (IMPORT_PATHS.some(path => pathname.startsWith(path))) {
    rateLimitConfig = RATE_LIMITS.import
  }
  // Métodos de escrita
  else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    rateLimitConfig = RATE_LIMITS.write
  }

  // Criar chave única: IP + pathname + método
  const clientIP = getClientIP(request)
  const rateLimitKey = `${clientIP}:${pathname}:${method}`

  // Verificar rate limit
  const result = checkRateLimit(
    rateLimitKey,
    rateLimitConfig.maxRequests,
    rateLimitConfig.windowMs
  )

  // Se não permitido, retornar 429
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - now) / 1000)

    return NextResponse.json(
      {
        mensagem: 'Muitas requisições. Tente novamente em alguns segundos.',
        erro: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
        }
      }
    )
  }

  // Adicionar headers de rate limit na resposta
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.resetAt.toString())

  return response
}

// Configurar quais paths o middleware deve interceptar
export const config = {
  matcher: '/api/:path*',
}
