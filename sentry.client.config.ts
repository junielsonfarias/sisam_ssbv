/**
 * Configuração do Sentry no client (browser).
 *
 * Captura erros JavaScript/React não tratados, navegação SPA, Web Vitals.
 *
 * Sanitização:
 *  - Não enviamos request bodies por padrão
 *  - Removemos cookies, headers de autorização, query params com tokens
 *  - sendDefaultPii desabilitado (não envia IP, headers de autenticação)
 *
 * Para ativar: definir NEXT_PUBLIC_SENTRY_DSN no .env
 */

import * as Sentry from '@sentry/nextjs'

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'development'

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENV,

    // Performance tracing — 10% das transações em produção
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

    // Replay desabilitado (envia muitos dados, considerar habilitar depois)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // NÃO enviar PII por padrão (cookies, headers, IPs)
    sendDefaultPii: false,

    // Sanitização adicional antes de enviar evento
    beforeSend(event) {
      // Remove cookies e headers sensíveis
      if (event.request) {
        delete event.request.cookies
        if (event.request.headers) {
          const cleanHeaders: Record<string, string> = {}
          for (const [key, value] of Object.entries(event.request.headers)) {
            const lower = key.toLowerCase()
            if (['authorization', 'cookie', 'set-cookie', 'x-csrf-token'].includes(lower)) continue
            cleanHeaders[key] = String(value)
          }
          event.request.headers = cleanHeaders
        }
        // Limpa tokens em query strings
        if (event.request.query_string) {
          const qs = String(event.request.query_string)
          event.request.query_string = qs.replace(/(token|jwt|key|secret)=[^&]+/gi, '$1=***')
        }
      }
      return event
    },

    // Ignora erros conhecidos e ruidosos
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'NetworkError',
      'AbortError',
    ],
  })
}
