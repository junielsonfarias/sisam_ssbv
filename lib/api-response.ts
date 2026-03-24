import { NextResponse } from 'next/server'
import { PG_ERRORS } from '@/lib/constants'

/**
 * Códigos de erro padronizados da API
 * Usar em todas as rotas para consistência
 */
export const API_ERRORS = {
  // Auth
  NAO_AUTORIZADO: 'NAO_AUTORIZADO',
  SESSAO_EXPIRADA: 'SESSAO_EXPIRADA',
  SEM_PERMISSAO: 'SEM_PERMISSAO',

  // Validação
  CAMPOS_OBRIGATORIOS: 'CAMPOS_OBRIGATORIOS',
  DADOS_INVALIDOS: 'DADOS_INVALIDOS',
  REGISTRO_DUPLICADO: 'REGISTRO_DUPLICADO',
  REGISTRO_NAO_ENCONTRADO: 'REGISTRO_NAO_ENCONTRADO',

  // Banco
  ERRO_BANCO: 'ERRO_BANCO',
  CONEXAO_BANCO: 'CONEXAO_BANCO',
  TIMEOUT_BANCO: 'TIMEOUT_BANCO',

  // Rate limit
  RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',

  // Geral
  ERRO_INTERNO: 'ERRO_INTERNO',
  VINCULOS_EXISTENTES: 'VINCULOS_EXISTENTES',
} as const

type ApiErrorCode = typeof API_ERRORS[keyof typeof API_ERRORS]

interface ErrorResponseOptions {
  mensagem: string
  erro?: ApiErrorCode
  status?: number
  detalhes?: string
}

/**
 * Cria resposta de erro padronizada
 */
export function apiError({
  mensagem,
  erro = API_ERRORS.ERRO_INTERNO,
  status = 500,
  detalhes,
}: ErrorResponseOptions) {
  const body: Record<string, unknown> = { mensagem, erro }
  if (detalhes && process.env.NODE_ENV === 'development') {
    body.detalhes = detalhes
  }
  return NextResponse.json(body, { status })
}

/** 401 - Não autorizado */
export function apiUnauthorized(mensagem = 'Não autorizado') {
  return apiError({ mensagem, erro: API_ERRORS.NAO_AUTORIZADO, status: 401 })
}

/** 403 - Sem permissão */
export function apiForbidden(mensagem = 'Sem permissão para esta ação') {
  return apiError({ mensagem, erro: API_ERRORS.SEM_PERMISSAO, status: 403 })
}

/** 404 - Não encontrado */
export function apiNotFound(mensagem = 'Registro não encontrado') {
  return apiError({ mensagem, erro: API_ERRORS.REGISTRO_NAO_ENCONTRADO, status: 404 })
}

/** 400 - Dados inválidos */
export function apiBadRequest(mensagem: string) {
  return apiError({ mensagem, erro: API_ERRORS.DADOS_INVALIDOS, status: 400 })
}

/**
 * Extrai mensagem de erro de forma segura de qualquer valor.
 * Útil em blocos catch com error: unknown.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return (error as Error).message
  if (typeof error === 'string') return error
  return 'Erro desconhecido'
}

/**
 * Extrai código de erro PostgreSQL/Node de forma segura.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return undefined
}

/** 500 - Erro interno com classificação de erro de banco */
export function apiServerError(error: unknown, contexto?: string) {
  const message = getErrorMessage(error)
  const code = getErrorCode(error)
  let erro: ApiErrorCode = API_ERRORS.ERRO_INTERNO

  if (code === PG_ERRORS.CONNECTION_REFUSED || code === PG_ERRORS.HOST_NOT_FOUND || code === PG_ERRORS.NETWORK_UNREACHABLE) {
    erro = API_ERRORS.CONEXAO_BANCO
  } else if (code === PG_ERRORS.CONNECTION_TIMEOUT || code === PG_ERRORS.QUERY_CANCELED) {
    erro = API_ERRORS.TIMEOUT_BANCO
  } else if (code === PG_ERRORS.UNIQUE_VIOLATION) {
    return apiError({
      mensagem: 'Registro duplicado',
      erro: API_ERRORS.REGISTRO_DUPLICADO,
      status: 400,
    })
  }

  if (contexto) {
    console.error(`[${contexto}] Erro:`, message)
  }

  return apiError({
    mensagem: 'Erro interno do servidor',
    erro,
    detalhes: message,
  })
}
