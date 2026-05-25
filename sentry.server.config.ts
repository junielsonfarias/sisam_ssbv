/**
 * Configuração do Sentry no server (Node.js, API routes, Server Components).
 *
 * Captura erros server-side, queries lentas, exceptions não tratadas.
 *
 * Para ativar: definir SENTRY_DSN no .env
 */

import * as Sentry from '@sentry/nextjs'

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENV,

    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

    // Não envia PII por padrão
    sendDefaultPii: false,

    // Sanitização do payload
    beforeSend(event) {
      // Remove cookies e headers de auth
      if (event.request) {
        delete event.request.cookies
        if (event.request.headers) {
          const clean: Record<string, string> = {}
          for (const [k, v] of Object.entries(event.request.headers)) {
            const lk = k.toLowerCase()
            if (['authorization', 'cookie', 'set-cookie', 'x-csrf-token'].includes(lk)) continue
            clean[k] = String(v)
          }
          event.request.headers = clean
        }
        // Body é descartado para não enviar dados pessoais
        delete event.request.data
        // Limpa query strings com tokens
        if (event.request.query_string) {
          event.request.query_string = String(event.request.query_string).replace(
            /(token|jwt|key|secret|password|senha)=[^&]+/gi,
            '$1=***'
          )
        }
      }

      // Remove campos sensíveis dos extras/contexts
      if (event.extra) {
        for (const key of Object.keys(event.extra)) {
          if (/senha|password|token|secret|cpf|email/i.test(key)) {
            event.extra[key] = '***'
          }
        }
      }

      return event
    },

    ignoreErrors: [
      // Erros transientes esperados
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      // Erros do usuário (não são bugs)
      'Not authorized',
      'Não autorizado',
    ],
  })
}
