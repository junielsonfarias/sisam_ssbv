Crie middleware de seguranca completo no padrao SISAM.

Entrada: $ARGUMENTS (nivel: "basico", "avancado" ou "completo")

## Criar `middleware.ts` na raiz do projeto

### 1. Rate Limiting por tipo de operacao
```typescript
const RATE_LIMITS = {
  write: { maxRequests: 120, windowMs: 60000 },   // 120 writes/min
  read: { maxRequests: 600, windowMs: 60000 },     // 600 reads/min
  import: { maxRequests: 15, windowMs: 60000 },    // 15 imports/min
  device: { maxRequests: 300, windowMs: 60000 },   // 300 device calls/min
}
```
- Map em memoria por IP + tipo
- Classificar por metodo: GET=read, POST/PUT/DELETE=write
- Paths de importacao detectados por URL
- Excluir paths publicos (health, login, site-config)
- Retornar 429 com header Retry-After

### 2. CSRF Protection
```typescript
// Validar Origin header em mutacoes (POST, PUT, DELETE, PATCH)
const origin = request.headers.get('origin')
const host = request.headers.get('host')
if (isMutation && origin && !origin.includes(host)) {
  return NextResponse.json({ mensagem: 'CSRF detectado' }, { status: 403 })
}
```

### 3. Security Headers
```typescript
const response = NextResponse.next()
response.headers.set('X-Content-Type-Options', 'nosniff')
response.headers.set('X-Frame-Options', 'DENY')
response.headers.set('X-XSS-Protection', '1; mode=block')
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

// HSTS em producao
if (process.env.NODE_ENV === 'production') {
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}
```

### 4. CSP (Content Security Policy)
```typescript
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.upstash.io",
  "frame-src 'self'",
].join('; ')
response.headers.set('Content-Security-Policy', csp)
```
- CSP diferenciado por rota (ex: terminal facial precisa de camera)

### 5. Request Tracing
```typescript
const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
response.headers.set('X-Request-Id', requestId)
```

### 6. Metricas
```typescript
interface RequestMetrics {
  totalRequests: number
  totalErrors: number
  requestsByMethod: Record<string, number>
  startedAt: number
}
// Expor via getRequestMetrics() para /api/health
```

### 7. Config do matcher
```typescript
export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico|icons|models).*)'],
}
```

### Nivel basico: headers + CSRF
### Nivel avancado: + rate limiting + CSP
### Nivel completo: + metricas + tracing + CSP por rota
