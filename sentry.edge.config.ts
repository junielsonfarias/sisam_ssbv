/**
 * Configuração do Sentry no Edge Runtime (middleware Next.js).
 */

import * as Sentry from '@sentry/nextjs'

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
const ENV = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  })
}
