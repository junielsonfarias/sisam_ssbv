/**
 * Funções de validação centralizadas
 * Evita duplicação e garante consistência em toda a aplicação
 */

// Regex para validação de UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Regex para validação de email (RFC 5322 simplificado)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false
  return UUID_REGEX.test(id)
}

/**
 * Valida UUID e lança erro se inválido
 * @throws Error se o UUID for inválido
 */
export function validateUUID(id: string | null | undefined, fieldName: string = 'id'): void {
  if (!isValidUUID(id)) {
    throw new Error(`${fieldName} inválido: deve ser um UUID válido`)
  }
}

/**
 * Valida se uma string é um email válido
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  // Mínimo de 5 caracteres (a@b.c)
  if (email.length < 5 || email.length > 254) return false
  return EMAIL_REGEX.test(email)
}

/**
 * Valida email e lança erro se inválido
 * @throws Error se o email for inválido
 */
export function validateEmail(email: string | null | undefined): void {
  if (!isValidEmail(email)) {
    throw new Error('Email inválido')
  }
}

/**
 * Valida se uma senha atende aos requisitos mínimos de segurança
 * Requisitos: mínimo 12 caracteres, pelo menos uma letra e um número
 */
export function isValidPassword(password: string | null | undefined): boolean {
  if (!password || typeof password !== 'string') return false
  if (password.length < 12) return false
  // Pelo menos uma letra e um número
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  return hasLetter && hasNumber
}

/**
 * Valida senha com mensagem de erro específica
 */
export function validatePassword(password: string | null | undefined): { valid: boolean; message?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Senha é obrigatória' }
  }
  if (password.length < 12) {
    return { valid: false, message: 'Senha deve ter pelo menos 12 caracteres' }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos uma letra' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Senha deve conter pelo menos um número' }
  }
  return { valid: true }
}

/**
 * Sanitiza string para evitar XSS básico
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Valida se é um número inteiro positivo
 */
export function isPositiveInteger(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0
  }
  if (typeof value === 'string') {
    const num = parseInt(value, 10)
    return !isNaN(num) && num > 0 && num.toString() === value
  }
  return false
}

/**
 * Parseia string para número inteiro com valor padrão
 */
export function parseIntSafe(value: string | null | undefined, defaultValue: number = 0): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Parseia string para float com valor padrão
 */
export function parseFloatSafe(value: string | null | undefined, defaultValue: number = 0): number {
  if (!value) return defaultValue
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Valida série escolar (2, 3, 5, 6, 7, 8, 9)
 */
export function isValidSerie(serie: string | null | undefined): boolean {
  if (!serie) return false
  const numero = serie.match(/(\d+)/)?.[1]
  if (!numero) return false
  const seriesValidas = ['2', '3', '5', '6', '7', '8', '9']
  return seriesValidas.includes(numero)
}

/**
 * Valida ano letivo (formato YYYY)
 */
export function isValidAnoLetivo(ano: string | null | undefined): boolean {
  if (!ano || typeof ano !== 'string') return false
  if (!/^\d{4}$/.test(ano)) return false
  const anoNum = parseInt(ano, 10)
  return anoNum >= 2020 && anoNum <= 2100
}

/**
 * Valida presença (P ou F)
 */
export function isValidPresenca(presenca: string | null | undefined): boolean {
  if (!presenca) return false
  return ['P', 'p', 'F', 'f'].includes(presenca)
}

/**
 * Valida resposta de questão (A, B, C, D, E)
 */
export function isValidResposta(resposta: string | null | undefined): boolean {
  if (!resposta) return false
  return ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'].includes(resposta)
}

/**
 * Valida nota (0 a 10)
 */
export function isValidNota(nota: number | string | null | undefined): boolean {
  if (nota === null || nota === undefined) return false
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  return !isNaN(num) && num >= 0 && num <= 10
}

/**
 * Valida tipo de usuário
 */
export function isValidTipoUsuario(tipo: string | null | undefined): boolean {
  if (!tipo) return false
  const tiposValidos = ['administrador', 'tecnico', 'polo', 'escola', 'admin'] // admin é legacy
  return tiposValidos.includes(tipo.toLowerCase())
}

// ============================================
// Utilitários de Tratamento de Erros
// ============================================

/**
 * Interface para erros de banco de dados do PostgreSQL
 */
export interface DatabaseError extends Error {
  code?: string
  constraint?: string
  detail?: string
  schema?: string
  table?: string
  column?: string
}

/**
 * Verifica se um erro é um Error object
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

/**
 * Verifica se é um erro de banco de dados PostgreSQL
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return isError(error) && 'code' in error
}

/**
 * Extrai mensagem de erro de forma segura
 * Funciona com Error, string, ou objeto desconhecido
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Erro desconhecido'
}

/**
 * Extrai código de erro de banco de dados
 * Retorna undefined se não for erro de banco
 */
export function getDatabaseErrorCode(error: unknown): string | undefined {
  if (isDatabaseError(error)) {
    return error.code
  }
  return undefined
}

/**
 * Verifica se é um erro de constraint de unicidade (chave duplicada)
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return getDatabaseErrorCode(error) === '23505'
}

/**
 * Verifica se é um erro de chave estrangeira
 */
export function isForeignKeyError(error: unknown): boolean {
  const code = getDatabaseErrorCode(error)
  return code === '23503' || code === '23502'
}

/**
 * Verifica se é um erro de aborto (fetch cancelado)
 */
export function isAbortError(error: unknown): boolean {
  return isError(error) && error.name === 'AbortError'
}

/**
 * Cria resposta de erro padronizada para API
 */
export function createErrorResponse(error: unknown, context?: string): { mensagem: string; detalhes?: string } {
  const message = getErrorMessage(error)

  // Log para debug (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${context || 'API Error'}]:`, error)
  }

  // Erro de constraint de unicidade
  if (isUniqueConstraintError(error)) {
    return { mensagem: 'Registro duplicado. Este item já existe.' }
  }

  // Erro de chave estrangeira
  if (isForeignKeyError(error)) {
    return { mensagem: 'Erro de referência. Verifique os dados relacionados.' }
  }

  // Erro genérico
  return {
    mensagem: 'Erro interno do servidor',
    detalhes: process.env.NODE_ENV !== 'production' ? message : undefined
  }
}
