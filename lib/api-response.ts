import { NextResponse } from 'next/server'

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

/** 500 - Erro interno com classificação de erro de banco */
export function apiServerError(error: any, contexto?: string) {
  const err = error as Error & { code?: string }
  let erro: ApiErrorCode = API_ERRORS.ERRO_INTERNO

  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ENETUNREACH') {
    erro = API_ERRORS.CONEXAO_BANCO
  } else if (err.code === 'ETIMEDOUT' || err.code === '57014') {
    erro = API_ERRORS.TIMEOUT_BANCO
  } else if (err.code === '23505') {
    return apiError({
      mensagem: 'Registro duplicado',
      erro: API_ERRORS.REGISTRO_DUPLICADO,
      status: 400,
    })
  }

  if (contexto) {
    console.error(`[${contexto}] Erro:`, err?.message)
  }

  return apiError({
    mensagem: 'Erro interno do servidor',
    erro,
    detalhes: err?.message,
  })
}
