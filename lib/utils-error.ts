/**
 * Utilitários para tratamento de erros de forma type-safe
 * @module lib/utils-error
 */

/**
 * Interface para erros com código (ex: erros de banco de dados)
 */
export interface ErrorWithCode extends Error {
  code?: string
}

/**
 * Interface para erros de banco de dados PostgreSQL
 */
export interface DatabaseError extends Error {
  code?: string
  detail?: string
  hint?: string
  position?: string
  schema?: string
  table?: string
  column?: string
  constraint?: string
}

/**
 * Extrai a mensagem de erro de forma type-safe
 * @param error - Erro capturado (unknown)
 * @returns Mensagem do erro ou mensagem padrão
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Erro desconhecido'
}

/**
 * Extrai o código de erro (para erros de banco de dados)
 * @param error - Erro capturado (unknown)
 * @returns Código do erro ou undefined
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as ErrorWithCode).code)
  }
  return undefined
}

/**
 * Extrai o stack trace de forma type-safe
 * @param error - Erro capturado (unknown)
 * @returns Stack trace ou undefined
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack
  }
  return undefined
}

/**
 * Converte erro unknown para Error com código
 * @param error - Erro capturado (unknown)
 * @returns Objeto com message, code e stack
 */
export function toErrorWithCode(error: unknown): ErrorWithCode {
  if (error instanceof Error) {
    return error as ErrorWithCode
  }
  const err = new Error(getErrorMessage(error)) as ErrorWithCode
  err.code = getErrorCode(error)
  return err
}

/**
 * Converte erro unknown para DatabaseError
 * @param error - Erro capturado (unknown)
 * @returns DatabaseError
 */
export function toDatabaseError(error: unknown): DatabaseError {
  if (error instanceof Error) {
    return error as DatabaseError
  }
  return new Error(getErrorMessage(error)) as DatabaseError
}

/**
 * Verifica se o erro é de conexão com banco de dados
 * @param error - Erro capturado (unknown)
 * @returns true se for erro de conexão
 */
export function isConnectionError(error: unknown): boolean {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  const connectionCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'ETIMEDOUT', 'ECONNRESET']
  const connectionMessages = [
    'connection refused',
    'connection terminated',
    'too many clients',
    'max clients reached',
    'connection error',
  ]

  if (code && connectionCodes.includes(code)) {
    return true
  }

  return connectionMessages.some(msg => message.includes(msg))
}

/**
 * Verifica se o erro é de autenticação do banco
 * @param error - Erro capturado (unknown)
 * @returns true se for erro de autenticação
 */
export function isAuthError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code === '28P01' || code === '28000'
}

/**
 * Verifica se o erro é recuperável (pode tentar novamente)
 * @param error - Erro capturado (unknown)
 * @returns true se for erro recuperável
 */
export function isRecoverableError(error: unknown): boolean {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  const recoverableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED']
  const recoverableMessages = [
    'too many clients',
    'connection terminated',
    'socket hang up',
    'read econnreset',
  ]

  if (code && recoverableCodes.includes(code)) {
    return true
  }

  return recoverableMessages.some(msg => message.includes(msg))
}

/**
 * Formata erro para resposta de API
 * @param error - Erro capturado (unknown)
 * @param includeDetails - Se deve incluir detalhes (apenas em dev)
 * @returns Objeto formatado para resposta
 */
export function formatErrorResponse(
  error: unknown,
  includeDetails: boolean = process.env.NODE_ENV === 'development'
): { mensagem: string; erro?: string; detalhes?: string } {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)

  return {
    mensagem: 'Erro interno do servidor',
    erro: code,
    detalhes: includeDetails ? message : undefined,
  }
}
