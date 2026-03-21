import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware Global
 * - Rate limiting por tipo de endpoint
 * - Headers de segurança em todas as respostas
 * - Request ID para rastreabilidade
 * - Métricas de request (contadores e latência)
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
}

// Armazenamento em memória (limpo quando servidor reinicia)
const rateLimitStore = new Map<string, RateLimitEntry>()

// ============================================================================
// MÉTRICAS DE REQUEST (em memória — reseta ao reiniciar)
// ============================================================================
interface RequestMetrics {
  totalRequests: number
  totalErrors: number // 4xx + 5xx
  requestsByMethod: Record<string, number>
  requestsByStatus: Record<string, number>
  startedAt: number
}

const metrics: RequestMetrics = {
  totalRequests: 0,
  totalErrors: 0,
  requestsByMethod: {},
  requestsByStatus: {},
  startedAt: Date.now(),
}

/** Retorna métricas para o endpoint /api/health */
export function getRequestMetrics() {
  return {
    ...metrics,
    uptimeSeconds: Math.round((Date.now() - metrics.startedAt) / 1000),
    requestsPerMinute: metrics.totalRequests > 0
      ? Math.round(metrics.totalRequests / ((Date.now() - metrics.startedAt) / 60000) * 100) / 100
      : 0,
  }
}

/** Gera um ID curto para rastreabilidade */
function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// Configurações por tipo de operação
// Ajustado para suportar 50+ usuários simultâneos em ambiente municipal (mesmo IP por escola)
const RATE_LIMITS = {
  // APIs de escrita: 120 requisições por minuto (50 usuários × ~2 writes/min)
  write: { maxRequests: 120, windowMs: 60 * 1000 },
  // APIs de leitura: 600 requisições por minuto (50 usuários × ~12 reads/min)
  read: { maxRequests: 600, windowMs: 60 * 1000 },
  // APIs de importação: 15 requisições por minuto (operações pesadas)
  import: { maxRequests: 15, windowMs: 60 * 1000 },
  // APIs de dispositivos faciais: 300 requisições por minuto (alta frequência de scans)
  device: { maxRequests: 300, windowMs: 60 * 1000 },
}

// Endpoints excluídos do rate limiting (já têm próprio ou são públicos)
const EXCLUDED_PATHS = [
  '/api/auth/login',      // Tem rate limiting próprio
  '/api/auth/logout',     // Logout não precisa
  '/api/auth/verificar',  // Chamado frequentemente por todas as páginas
  '/api/health',          // Health check
  '/api/init',            // Inicialização
  '/api/site-config',     // Site institucional (público)
  '/api/boletim',         // Consulta pública de boletim escolar
  '/api/auth/cadastro-professor', // Tem rate limiting próprio (3/15min)
  '/api/admin/facial/presenca-terminal', // Terminal facial — alta frequência
]

// Endpoints de importação (mais restritivos)
const IMPORT_PATHS = [
  '/api/admin/importar',
  '/api/admin/importar-completo',
  '/api/admin/importar-cadastros',
  '/api/admin/importar-resultados',
]

// Endpoints de dispositivos faciais (alta frequência)
const DEVICE_PATHS = [
  '/api/facial/',
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
const MAX_RATE_LIMIT_ENTRIES = 5000

function cleanupOldEntries() {
  const now = Date.now()
  const maxAge = 2 * 60 * 1000 // 2 minutos (mais agressivo)

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest > maxAge) {
      rateLimitStore.delete(key)
    }
  }

  // Se ainda muito grande, limpar os mais antigos
  if (rateLimitStore.size > MAX_RATE_LIMIT_ENTRIES) {
    const entries = Array.from(rateLimitStore.entries())
      .sort((a, b) => a[1].firstRequest - b[1].firstRequest)
    const toDelete = Math.ceil(rateLimitStore.size * 0.5)
    for (let i = 0; i < toDelete; i++) {
      rateLimitStore.delete(entries[i][0])
    }
  }
}

// Limpar a cada 2 minutos
let lastCleanup = Date.now()

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Requisições que não são API — aplicar apenas headers de segurança
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    addSecurityHeaders(response, undefined, pathname)
    return response
  }

  // Métricas: contagem por método
  const method = request.method
  metrics.totalRequests++
  metrics.requestsByMethod[method] = (metrics.requestsByMethod[method] || 0) + 1

  // Request ID para rastreabilidade
  const requestId = generateRequestId()

  // Verificar se endpoint está excluído do rate limiting (mas recebe headers de segurança)
  if (EXCLUDED_PATHS.some(path => pathname.startsWith(path))) {
    const response = NextResponse.next()
    addSecurityHeaders(response, requestId, pathname)
    return response
  }

  // Limpar entradas antigas periodicamente
  const now = Date.now()
  if (now - lastCleanup > 2 * 60 * 1000) {
    cleanupOldEntries()
    lastCleanup = now
  }

  // Determinar tipo de rate limit
  let rateLimitConfig = RATE_LIMITS.read

  // Endpoints de dispositivos faciais (alta frequência)
  if (DEVICE_PATHS.some(path => pathname.startsWith(path))) {
    rateLimitConfig = RATE_LIMITS.device
  }
  // Endpoints de importação
  else if (IMPORT_PATHS.some(path => pathname.startsWith(path))) {
    rateLimitConfig = RATE_LIMITS.import
  }
  // Métodos de escrita
  else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    rateLimitConfig = RATE_LIMITS.write
  }

  // Proteção CSRF: verificar Origin header em mutations (reforça SameSite=lax)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    // Permitir requests sem origin (same-origin navigation, mobile apps)
    // mas bloquear se origin não bate com host
    if (origin && host) {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        const blockedResponse = NextResponse.json(
          { mensagem: 'Requisição bloqueada: origem inválida' },
          { status: 403 }
        )
        addSecurityHeaders(blockedResponse, undefined, pathname)
        return blockedResponse
      }
    }
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

    const blockedResponse = NextResponse.json(
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
    metrics.totalErrors++
    metrics.requestsByStatus['429'] = (metrics.requestsByStatus['429'] || 0) + 1
    addSecurityHeaders(blockedResponse, requestId, pathname)
    return blockedResponse
  }

  // Adicionar headers de rate limit na resposta
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.resetAt.toString())

  // Headers de segurança + request ID
  addSecurityHeaders(response, requestId, pathname)

  return response
}

/**
 * Headers de segurança e rastreabilidade aplicados em todas as respostas
 */
function addSecurityHeaders(response: NextResponse, requestId?: string, pathname?: string) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // camera=(self) necessário para reconhecimento facial
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')

  // CSP diferenciado para terminal facial (precisa de wasm, camera, blob URLs)
  const isTerminal = pathname?.startsWith('/terminal') || pathname?.startsWith('/admin/terminal-facial') || pathname?.startsWith('/admin/facial-enrollment')
  if (isTerminal) {
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: mediastream:; font-src 'self' data:; connect-src 'self' https: http:; media-src 'self' blob: mediastream:; worker-src 'self' blob:; frame-ancestors 'none'")
  } else {
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'")
  }

  if (requestId) {
    response.headers.set('X-Request-Id', requestId)
  }
}

// Configurar quais paths o middleware deve interceptar
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|logo.png|models|uploads|sw.js|manifest.json|icons).*)',
  ],
}
