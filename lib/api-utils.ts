/**
 * Utilitários para respostas de API padronizadas
 *
 * Este módulo fornece funções auxiliares para criar respostas HTTP
 * consistentes em todas as APIs do sistema.
 *
 * @module lib/api-utils
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from './auth'
import { Usuario, TipoUsuario } from './types'

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

// ============================================================================
// AUTENTICAÇÃO E AUTORIZAÇÃO
// ============================================================================

/**
 * Resultado da verificação de autenticação
 */
export interface AuthResult {
  usuario: Usuario
}

/**
 * Tipo do handler de API autenticado
 */
export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthResult
) => Promise<NextResponse>

/**
 * Verifica autenticação e autorização para uma requisição
 * Retorna o usuário se autorizado, ou resposta de erro
 *
 * @param request - Requisição Next.js
 * @param tiposPermitidos - Tipos de usuário permitidos
 * @returns Usuario ou NextResponse de erro
 *
 * @example
 * const auth = await verificarAuth(request, ['administrador', 'tecnico'])
 * if (auth instanceof NextResponse) return auth
 * const { usuario } = auth
 */
export async function verificarAuth(
  request: NextRequest,
  tiposPermitidos: TipoUsuario[]
): Promise<AuthResult | NextResponse> {
  const usuario = await getUsuarioFromRequest(request)

  if (!usuario) {
    return unauthorized('Não autenticado')
  }

  if (!verificarPermissao(usuario, tiposPermitidos)) {
    return forbidden('Não autorizado para esta operação')
  }

  return { usuario }
}

/**
 * Decorator para handlers de API que requerem autenticação
 * Elimina a necessidade de repetir a verificação de auth em cada rota
 *
 * @param tiposPermitidos - Tipos de usuário permitidos
 * @param handler - Handler da API
 *
 * @example
 * export const GET = withAuth(['administrador', 'tecnico'], async (request, { usuario }) => {
 *   // usuário já está autenticado e autorizado aqui
 *   return ok({ dados: [] })
 * })
 */
export function withAuth(
  tiposPermitidos: TipoUsuario[],
  handler: AuthenticatedHandler
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await verificarAuth(request, tiposPermitidos)

    if (auth instanceof NextResponse) {
      return auth
    }

    return handler(request, auth)
  }
}

// ============================================================================
// CONSTRUTOR DE QUERIES COM CONTROLE DE ACESSO
// ============================================================================

/**
 * Configuração de filtros de acesso baseado no tipo de usuário
 */
export interface AccessControlConfig {
  /** Alias da tabela de escolas (ex: 'e' ou 'escolas') */
  escolaAlias?: string
  /** Alias da tabela de polos (ex: 'p' ou 'polos') */
  poloAlias?: string
  /** Campo que referencia polo_id na tabela de escolas */
  poloIdField?: string
  /** Campo que referencia escola_id */
  escolaIdField?: string
}

/**
 * Resultado do controle de acesso para queries
 */
export interface AccessControlResult {
  /** Condições WHERE a serem adicionadas */
  conditions: string[]
  /** Parâmetros para as condições */
  params: (string | number)[]
  /** Próximo índice de parâmetro disponível */
  nextParamIndex: number
}

/**
 * Gera condições de filtro baseadas no tipo de usuário
 * Útil para restringir acesso a dados por polo ou escola
 *
 * @param usuario - Usuário autenticado
 * @param paramIndex - Índice inicial para parâmetros ($1, $2, etc)
 * @param config - Configuração dos aliases de tabela
 *
 * @example
 * const { conditions, params, nextParamIndex } = buildAccessControl(usuario, 1, {
 *   escolaAlias: 'e',
 *   poloIdField: 'polo_id'
 * })
 *
 * let query = 'SELECT * FROM escolas e WHERE 1=1'
 * if (conditions.length > 0) {
 *   query += ' AND ' + conditions.join(' AND ')
 * }
 */
export function buildAccessControl(
  usuario: Usuario,
  paramIndex: number = 1,
  config: AccessControlConfig = {}
): AccessControlResult {
  const {
    escolaAlias = 'e',
    poloIdField = 'polo_id',
    escolaIdField = 'id'
  } = config

  const conditions: string[] = []
  const params: (string | number)[] = []
  let currentIndex = paramIndex

  // Usuário tipo polo: filtrar por polo_id
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    conditions.push(`${escolaAlias}.${poloIdField} = $${currentIndex}`)
    params.push(usuario.polo_id)
    currentIndex++
  }
  // Usuário tipo escola: filtrar por escola_id
  else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    conditions.push(`${escolaAlias}.${escolaIdField} = $${currentIndex}`)
    params.push(usuario.escola_id)
    currentIndex++
  }

  return {
    conditions,
    params,
    nextParamIndex: currentIndex
  }
}

/**
 * Cria resposta padronizada para endpoints offline
 *
 * @param dados - Array de dados
 *
 * @example
 * return createOfflineResponse(result.rows)
 */
export function createOfflineResponse<T>(dados: T[]) {
  return NextResponse.json({
    dados,
    total: dados.length,
    sincronizado_em: new Date().toISOString()
  })
}
