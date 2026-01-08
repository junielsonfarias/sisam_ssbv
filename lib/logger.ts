/**
 * Sistema de Logging Centralizado
 *
 * Este módulo fornece um logger configurável que pode ser usado em todo
 * o sistema para registro de eventos, erros e depuração.
 *
 * Níveis de log:
 * - debug: Informações detalhadas para desenvolvimento
 * - info: Informações gerais de execução
 * - warn: Avisos que não impedem a execução
 * - error: Erros que precisam de atenção
 *
 * Configuração via variáveis de ambiente:
 * - LOG_LEVEL: Nível mínimo de log (debug, info, warn, error)
 * - LOG_ENABLED: Se o logging está habilitado (true/false)
 *
 * @module lib/logger
 */

// ============================================================================
// TIPOS E CONFIGURAÇÃO
// ============================================================================

/**
 * Níveis de log disponíveis
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Contexto adicional para o log
 */
export interface LogContext {
  /** Módulo ou componente que gerou o log */
  module?: string
  /** ID do usuário (se aplicável) */
  userId?: string
  /** ID da requisição (se aplicável) */
  requestId?: string
  /** Dados adicionais */
  data?: Record<string, unknown>
}

/**
 * Configuração do logger
 */
interface LoggerConfig {
  /** Nível mínimo de log a ser registrado */
  minLevel: LogLevel
  /** Se o logging está habilitado */
  enabled: boolean
  /** Se deve incluir timestamp */
  includeTimestamp: boolean
  /** Se deve colorir output (apenas desenvolvimento) */
  colorize: boolean
}

/**
 * Prioridade dos níveis de log (maior = mais importante)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

/**
 * Cores ANSI para cada nível (terminal)
 */
const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m'  // Red
}

const RESET_COLOR = '\x1b[0m'

// ============================================================================
// CONFIGURAÇÃO DO LOGGER
// ============================================================================

/**
 * Obtém a configuração do logger a partir de variáveis de ambiente
 */
function getLoggerConfig(): LoggerConfig {
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel
  const validLevel = LOG_LEVELS[logLevel] !== undefined ? logLevel : 'info'

  return {
    minLevel: validLevel,
    enabled: process.env.LOG_ENABLED !== 'false',
    includeTimestamp: true,
    colorize: process.env.NODE_ENV === 'development'
  }
}

// Cache da configuração
let cachedConfig: LoggerConfig | null = null

function getConfig(): LoggerConfig {
  if (!cachedConfig) {
    cachedConfig = getLoggerConfig()
  }
  return cachedConfig
}

/**
 * Reseta o cache de configuração (útil para testes)
 */
export function resetLoggerConfig(): void {
  cachedConfig = null
}

// ============================================================================
// FORMATAÇÃO
// ============================================================================

/**
 * Formata o timestamp para o log
 */
function formatTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Formata a mensagem de log
 */
function formatMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const config = getConfig()
  const parts: string[] = []

  // Timestamp
  if (config.includeTimestamp) {
    parts.push(`[${formatTimestamp()}]`)
  }

  // Nível
  const levelStr = level.toUpperCase().padEnd(5)
  if (config.colorize) {
    parts.push(`${LOG_COLORS[level]}${levelStr}${RESET_COLOR}`)
  } else {
    parts.push(levelStr)
  }

  // Módulo (se presente)
  if (context?.module) {
    parts.push(`[${context.module}]`)
  }

  // Mensagem principal
  parts.push(message)

  // Contexto adicional
  if (context?.userId) {
    parts.push(`(user: ${context.userId})`)
  }
  if (context?.requestId) {
    parts.push(`(req: ${context.requestId})`)
  }

  return parts.join(' ')
}

/**
 * Formata dados adicionais para exibição
 */
function formatData(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

// ============================================================================
// FUNÇÕES DE LOG
// ============================================================================

/**
 * Verifica se o log deve ser registrado baseado no nível
 */
function shouldLog(level: LogLevel): boolean {
  const config = getConfig()
  if (!config.enabled) return false
  return LOG_LEVELS[level] >= LOG_LEVELS[config.minLevel]
}

/**
 * Registra uma mensagem de debug
 *
 * Use para informações detalhadas durante desenvolvimento.
 * Não aparece em produção por padrão.
 *
 * @param message - Mensagem a ser registrada
 * @param context - Contexto adicional
 *
 * @example
 * logger.debug('Iniciando processamento', { module: 'Importação' })
 * logger.debug('Dados recebidos', { module: 'API', data: { count: 10 } })
 */
export function debug(message: string, context?: LogContext): void {
  if (!shouldLog('debug')) return
  console.debug(formatMessage('debug', message, context))
  if (context?.data) {
    console.debug(formatData(context.data))
  }
}

/**
 * Registra uma mensagem informativa
 *
 * Use para eventos normais de execução.
 *
 * @param message - Mensagem a ser registrada
 * @param context - Contexto adicional
 *
 * @example
 * logger.info('Usuário autenticado', { module: 'Auth', userId: '123' })
 * logger.info('Importação concluída', { module: 'Import', data: { total: 500 } })
 */
export function info(message: string, context?: LogContext): void {
  if (!shouldLog('info')) return
  console.info(formatMessage('info', message, context))
  if (context?.data) {
    console.info(formatData(context.data))
  }
}

/**
 * Registra um aviso
 *
 * Use para situações inesperadas que não impedem a execução.
 *
 * @param message - Mensagem de aviso
 * @param context - Contexto adicional
 *
 * @example
 * logger.warn('Cache expirado, buscando do banco', { module: 'Cache' })
 * logger.warn('Taxa de erro alta', { module: 'API', data: { rate: 0.15 } })
 */
export function warn(message: string, context?: LogContext): void {
  if (!shouldLog('warn')) return
  console.warn(formatMessage('warn', message, context))
  if (context?.data) {
    console.warn(formatData(context.data))
  }
}

/**
 * Registra um erro
 *
 * Use para erros que precisam de investigação.
 *
 * @param message - Mensagem de erro
 * @param error - Objeto de erro original
 * @param context - Contexto adicional
 *
 * @example
 * logger.error('Falha ao conectar ao banco', dbError, { module: 'Database' })
 * logger.error('Erro na importação', error, { module: 'Import', data: { linha: 42 } })
 */
export function error(message: string, error?: unknown, context?: LogContext): void {
  if (!shouldLog('error')) return

  console.error(formatMessage('error', message, context))

  if (error) {
    if (error instanceof Error) {
      console.error(`  → ${error.name}: ${error.message}`)
      if (error.stack && process.env.NODE_ENV === 'development') {
        console.error(error.stack)
      }
    } else {
      console.error(`  → ${String(error)}`)
    }
  }

  if (context?.data) {
    console.error(formatData(context.data))
  }
}

// ============================================================================
// LOGGER PARA MÓDULOS ESPECÍFICOS
// ============================================================================

/**
 * Cria um logger com contexto de módulo pré-configurado
 *
 * Útil para ter logs consistentes dentro de um módulo.
 *
 * @param moduleName - Nome do módulo
 * @returns Objeto com funções de log contextualizadas
 *
 * @example
 * const log = createLogger('AuthService')
 * log.info('Usuário autenticado')
 * log.error('Falha na autenticação', error)
 */
export function createLogger(moduleName: string) {
  return {
    debug: (message: string, context?: Omit<LogContext, 'module'>) =>
      debug(message, { ...context, module: moduleName }),

    info: (message: string, context?: Omit<LogContext, 'module'>) =>
      info(message, { ...context, module: moduleName }),

    warn: (message: string, context?: Omit<LogContext, 'module'>) =>
      warn(message, { ...context, module: moduleName }),

    error: (message: string, err?: unknown, context?: Omit<LogContext, 'module'>) =>
      error(message, err, { ...context, module: moduleName })
  }
}

// ============================================================================
// LOGGER DEFAULT
// ============================================================================

/**
 * Logger padrão para uso direto
 *
 * @example
 * import logger from '@/lib/logger'
 *
 * logger.info('Mensagem informativa')
 * logger.error('Algo deu errado', error)
 */
const logger = {
  debug,
  info,
  warn,
  error,
  createLogger
}

export default logger
