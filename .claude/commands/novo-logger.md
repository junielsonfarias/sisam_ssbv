Crie um sistema de logging estruturado no padrao SISAM.

Entrada: $ARGUMENTS (nivel: "basico" ou "completo")

## Criar `lib/logger.ts`
```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  module?: string
  userId?: string
  requestId?: string
  data?: Record<string, unknown>
}

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const config = {
  minLevel: (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  enabled: process.env.LOG_ENABLED !== 'false',
}

function formatMessage(level: LogLevel, module: string, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`
  return `${prefix} ${message}`
}

export function createLogger(module: string) {
  return {
    debug: (msg: string, context?: LogContext) => log('debug', module, msg, context),
    info: (msg: string, context?: LogContext) => log('info', module, msg, context),
    warn: (msg: string, context?: LogContext) => log('warn', module, msg, context),
    error: (msg: string, error?: unknown, context?: LogContext) => {
      const errMsg = error instanceof Error ? error.message : String(error || '')
      log('error', module, errMsg ? `${msg}: ${errMsg}` : msg, context)
    },
  }
}

function log(level: LogLevel, module: string, message: string, context?: LogContext) {
  if (!config.enabled || LOG_LEVELS[level] < LOG_LEVELS[config.minLevel]) return
  const formatted = formatMessage(level, module, message, context)
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  consoleFn(formatted)
  if (context?.data) consoleFn('  Data:', JSON.stringify(context.data, null, 2))
}
```

## Uso
```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('MeuServico')

log.info('Operacao iniciada', { data: { userId: '123' } })
log.error('Falha na operacao', error, { data: { query: sql } })
log.warn('Cache expirado')
log.debug('Dados processados', { data: { count: 50 } })
```

## Regras
- NUNCA logar senhas, tokens, dados pessoais
- Em producao: nivel minimo 'info'
- Em desenvolvimento: nivel 'debug'
- Erros SEMPRE logados com stack trace
- Prefixo [AUDIT] para acoes de seguranca: login, logout, criar usuario, deletar
