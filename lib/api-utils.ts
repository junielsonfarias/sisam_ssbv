/**
 * Utilitários para respostas de API padronizadas
 *
 * Este módulo fornece funções auxiliares para criar respostas HTTP
 * consistentes em todas as APIs do sistema.
 *
 * @module lib/api-utils
 */

import { NextResponse } from 'next/server'

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Códigos de erro padronizados do sistema
 */
export type CodigoErro =
  | 'NAO_AUTORIZADO'
  | 'PROIBIDO'
  | 'NAO_ENCONTRADO'
  | 'PARAMETRO_INVALIDO'
  | 'ERRO_VALIDACAO'
  | 'ERRO_BANCO'
  | 'ERRO_INTERNO'
  | 'SERVICO_INDISPONIVEL'

/**
 * Estrutura padrão de resposta de erro
 */
export interface RespostaErro {
  mensagem: string
  codigo?: CodigoErro
  detalhes?: string
  campos?: Record<string, string>
}

/**
 * Opções para resposta de erro
 */
interface OpcoesErro {
  codigo?: CodigoErro
  detalhes?: string
  campos?: Record<string, string>
}

// ============================================================================
// RESPOSTAS DE SUCESSO
// ============================================================================

/**
 * Retorna resposta 200 OK com dados
 */
export function ok<T>(dados: T) {
  return NextResponse.json(dados, { status: 200 })
}

/**
 * Retorna resposta 201 Created com dados
 */
export function created<T>(dados: T) {
  return NextResponse.json(dados, { status: 201 })
}

/**
 * Retorna resposta 204 No Content
 */
export function noContent() {
  return new NextResponse(null, { status: 204 })
}

// ============================================================================
// RESPOSTAS DE ERRO
// ============================================================================

/**
 * Retorna resposta 400 Bad Request
 *
 * @param mensagem - Mensagem de erro
 * @param opcoes - Opções adicionais (codigo, detalhes, campos)
 *
 * @example
 * return badRequest('ID do aluno é obrigatório')
 *
 * @example
 * return badRequest('Dados inválidos', {
 *   codigo: 'ERRO_VALIDACAO',
 *   campos: { email: 'Email inválido', senha: 'Senha muito curta' }
 * })
 */
export function badRequest(mensagem: string, opcoes?: OpcoesErro) {
  const resposta: RespostaErro = {
    mensagem,
    codigo: opcoes?.codigo || 'PARAMETRO_INVALIDO',
    ...opcoes
  }
  return NextResponse.json(resposta, { status: 400 })
}

/**
 * Retorna resposta 401 Unauthorized
 *
 * @param mensagem - Mensagem de erro (padrão: 'Não autenticado')
 */
export function unauthorized(mensagem: string = 'Não autenticado') {
  const resposta: RespostaErro = {
    mensagem,
    codigo: 'NAO_AUTORIZADO'
  }
  return NextResponse.json(resposta, { status: 401 })
}

/**
 * Retorna resposta 403 Forbidden
 *
 * @param mensagem - Mensagem de erro (padrão: 'Não autorizado')
 */
export function forbidden(mensagem: string = 'Não autorizado') {
  const resposta: RespostaErro = {
    mensagem,
    codigo: 'PROIBIDO'
  }
  return NextResponse.json(resposta, { status: 403 })
}

/**
 * Retorna resposta 404 Not Found
 *
 * @param mensagem - Mensagem de erro (padrão: 'Recurso não encontrado')
 */
export function notFound(mensagem: string = 'Recurso não encontrado') {
  const resposta: RespostaErro = {
    mensagem,
    codigo: 'NAO_ENCONTRADO'
  }
  return NextResponse.json(resposta, { status: 404 })
}

/**
 * Retorna resposta 500 Internal Server Error
 *
 * @param mensagem - Mensagem de erro (padrão: 'Erro interno do servidor')
 * @param error - Objeto de erro original (detalhes mostrados apenas em dev)
 */
export function internalError(mensagem: string = 'Erro interno do servidor', error?: unknown) {
  const resposta: RespostaErro = {
    mensagem,
    codigo: 'ERRO_INTERNO'
  }

  // Incluir detalhes do erro apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development' && error) {
    resposta.detalhes = error instanceof Error ? error.message : String(error)
  }

  return NextResponse.json(resposta, { status: 500 })
}

/**
 * Retorna resposta 503 Service Unavailable
 *
 * @param mensagem - Mensagem de erro (padrão: 'Serviço temporariamente indisponível')
 */
export function serviceUnavailable(mensagem: string = 'Serviço temporariamente indisponível') {
  const resposta: RespostaErro = {
    mensagem,
    codigo: 'SERVICO_INDISPONIVEL'
  }
  return NextResponse.json(resposta, { status: 503 })
}

// ============================================================================
// UTILITÁRIOS DE RESPOSTA ESPECIAIS
// ============================================================================

/**
 * Retorna resposta 200 com dados padrão em caso de erro
 * Útil para não quebrar o frontend quando há falhas parciais
 *
 * @param dados - Dados com valores padrão
 * @param erro - Erro original (mostrado apenas em dev)
 */
export function okComFallback<T extends object>(dados: T, erro?: unknown) {
  const resposta = { ...dados } as T & { erro?: string }

  if (process.env.NODE_ENV === 'development' && erro) {
    resposta.erro = erro instanceof Error ? erro.message : String(erro)
  }

  return NextResponse.json(resposta, { status: 200 })
}

/**
 * Retorna resposta com metadados de cache
 *
 * @param dados - Dados da resposta
 * @param origem - Origem dos dados ('cache' ou 'banco')
 */
export function okComCache<T>(dados: T, origem: 'cache' | 'banco') {
  return NextResponse.json({
    ...dados,
    _cache: {
      origem,
      timestamp: new Date().toISOString()
    }
  }, { status: 200 })
}

// ============================================================================
// HELPERS DE VALIDAÇÃO
// ============================================================================

/**
 * Valida se um parâmetro obrigatório está presente
 *
 * @param valor - Valor a ser validado
 * @param nome - Nome do parâmetro para mensagem de erro
 * @returns NextResponse de erro se inválido, null se válido
 *
 * @example
 * const erro = validarParametroObrigatorio(alunoId, 'aluno_id')
 * if (erro) return erro
 */
export function validarParametroObrigatorio(
  valor: string | null | undefined,
  nome: string
): NextResponse | null {
  if (!valor || valor.trim() === '') {
    return badRequest(`${nome} é obrigatório`)
  }
  return null
}

/**
 * Valida se pelo menos um dos parâmetros está presente
 *
 * @param valores - Objeto com os valores a validar
 * @returns NextResponse de erro se nenhum válido, null se pelo menos um válido
 *
 * @example
 * const erro = validarPeloMenosUm({ aluno_id, aluno_nome, aluno_codigo })
 * if (erro) return erro
 */
export function validarPeloMenosUm(
  valores: Record<string, string | null | undefined>
): NextResponse | null {
  const temAlgum = Object.values(valores).some(v => v && v.trim() !== '')

  if (!temAlgum) {
    const nomes = Object.keys(valores).join(', ')
    return badRequest(`É necessário informar pelo menos um: ${nomes}`)
  }

  return null
}
