/**
 * Helpers compartilhados para rotas de API
 *
 * Elimina duplicação de: paginação, filtros WHERE, parsing de params,
 * controle de acesso por polo/escola, e busca textual.
 *
 * @module lib/api-helpers
 */

import { NextRequest } from 'next/server'
import { Usuario } from './types'
import { LIMITES } from './constants'

// ============================================================================
// TIPOS
// ============================================================================

export interface Paginacao {
  pagina: number
  limite: number
  offset: number
}

export interface PaginacaoResponse {
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  temProxima: boolean
  temAnterior: boolean
}

export interface WhereClauseResult {
  conditions: string[]
  params: (string | number | boolean | null)[]
  paramIndex: number
}

export interface SearchParamsMap {
  [key: string]: string | null
}

// ============================================================================
// PAGINAÇÃO
// ============================================================================

/**
 * Extrai e valida parâmetros de paginação do request.
 * Padrão: página 1, limite 50, máximo 10000.
 */
export function parsePaginacao(
  searchParams: URLSearchParams,
  opts?: { camposPagina?: string; camposLimite?: string; limiteMax?: number; limitePadrao?: number }
): Paginacao {
  const campoPagina = opts?.camposPagina || 'pagina'
  const campoLimite = opts?.camposLimite || 'limite'
  const limiteMax = opts?.limiteMax || 10000
  const limitePadrao = opts?.limitePadrao || LIMITES.PAGINACAO_PADRAO

  const pagina = Math.max(1, parseInt(searchParams.get(campoPagina) || '1', 10) || 1)
  const limite = Math.min(limiteMax, Math.max(1, parseInt(searchParams.get(campoLimite) || String(limitePadrao), 10) || limitePadrao))
  const offset = (pagina - 1) * limite

  return { pagina, limite, offset }
}

/**
 * Monta objeto de paginação para resposta da API
 */
export function buildPaginacaoResponse(paginacao: Paginacao, total: number): PaginacaoResponse {
  const totalPaginas = Math.ceil(total / paginacao.limite)
  return {
    pagina: paginacao.pagina,
    limite: paginacao.limite,
    total,
    totalPaginas,
    temProxima: paginacao.pagina < totalPaginas,
    temAnterior: paginacao.pagina > 1,
  }
}

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

/**
 * Cria uma instância limpa do builder de WHERE clause
 */
export function createWhereBuilder(startIndex: number = 1): WhereClauseResult {
  return {
    conditions: [],
    params: [],
    paramIndex: startIndex,
  }
}

/**
 * Adiciona condição ao builder se o valor existir (não null/undefined/vazio)
 */
export function addCondition(
  builder: WhereClauseResult,
  field: string,
  value: string | number | boolean | null | undefined,
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'ILIKE' | 'LIKE' = '='
): WhereClauseResult {
  if (value === null || value === undefined || value === '') return builder

  builder.conditions.push(`${field} ${operator} $${builder.paramIndex}`)
  builder.params.push(value as string | number | boolean)
  builder.paramIndex++
  return builder
}

/**
 * Adiciona condição IN (...) ao builder
 */
export function addInCondition(
  builder: WhereClauseResult,
  field: string,
  values: (string | number)[]
): WhereClauseResult {
  if (!values || values.length === 0) return builder

  const placeholders = values.map((_, i) => `$${builder.paramIndex + i}`).join(', ')
  builder.conditions.push(`${field} IN (${placeholders})`)
  builder.params.push(...values)
  builder.paramIndex += values.length
  return builder
}

/**
 * Adiciona busca textual ILIKE em múltiplos campos
 */
export function addSearchCondition(
  builder: WhereClauseResult,
  fields: string[],
  searchTerm: string | null | undefined
): WhereClauseResult {
  if (!searchTerm || searchTerm.trim() === '') return builder

  const term = `%${searchTerm.trim()}%`
  const orClauses = fields.map(f => `${f} ILIKE $${builder.paramIndex}`).join(' OR ')
  builder.conditions.push(`(${orClauses})`)
  builder.params.push(term)
  builder.paramIndex++
  return builder
}

/**
 * Adiciona condição raw (SQL literal com placeholders)
 */
export function addRawCondition(
  builder: WhereClauseResult,
  sql: string,
  values: (string | number | boolean | null)[] = []
): WhereClauseResult {
  builder.conditions.push(sql)
  builder.params.push(...values)
  builder.paramIndex += values.length
  return builder
}

/**
 * Gera a string WHERE final (ou string vazia se sem condições)
 */
export function buildWhereString(builder: WhereClauseResult, prefix: string = 'WHERE'): string {
  if (builder.conditions.length === 0) return ''
  return `${prefix} ${builder.conditions.join(' AND ')}`
}

/**
 * Gera string de condições sem o WHERE (para compor com queries existentes)
 */
export function buildConditionsString(builder: WhereClauseResult): string {
  if (builder.conditions.length === 0) return '1=1'
  return builder.conditions.join(' AND ')
}

// ============================================================================
// CONTROLE DE ACESSO
// ============================================================================

/**
 * Adiciona filtros de controle de acesso baseados no tipo de usuário.
 * Polo vê apenas suas escolas, escola vê apenas seus dados.
 */
export function addAccessControl(
  builder: WhereClauseResult,
  usuario: Usuario,
  config?: {
    escolaAlias?: string
    escolaIdField?: string
    poloIdField?: string
  }
): WhereClauseResult {
  const alias = config?.escolaAlias || 'e'
  const escolaIdField = config?.escolaIdField || `${alias}.id`
  const poloIdField = config?.poloIdField || `${alias}.polo_id`

  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    addCondition(builder, poloIdField, usuario.polo_id)
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    addCondition(builder, escolaIdField, usuario.escola_id)
  }

  return builder
}

// ============================================================================
// PARSING DE SEARCH PARAMS
// ============================================================================

/**
 * Extrai múltiplos parâmetros de uma vez do URLSearchParams
 */
export function parseSearchParams(
  searchParams: URLSearchParams,
  keys: string[]
): SearchParamsMap {
  const result: SearchParamsMap = {}
  for (const key of keys) {
    result[key] = searchParams.get(key)
  }
  return result
}

/**
 * Extrai valor inteiro de search param, com valor padrão
 */
export function parseIntParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue: number = 0
): number {
  const val = searchParams.get(key)
  if (!val) return defaultValue
  const parsed = parseInt(val, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Extrai valor boolean de search param
 */
export function parseBoolParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue: boolean = false
): boolean {
  const val = searchParams.get(key)
  if (!val) return defaultValue
  return val === 'true' || val === '1' || val === 'sim'
}

/**
 * Extrai URLSearchParams do request de forma segura
 */
export function getSearchParams(request: NextRequest): URLSearchParams {
  return request.nextUrl.searchParams
}

// ============================================================================
// SQL HELPERS
// ============================================================================

/**
 * Gera SQL de ORDER BY com validação de campo permitido
 */
export function buildOrderBy(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField: string = 'criado_em',
  defaultDir: 'ASC' | 'DESC' = 'DESC'
): string {
  const campo = searchParams.get('ordenar_por') || defaultField
  const direcao = (searchParams.get('direcao') || defaultDir).toUpperCase()

  const safeCampo = allowedFields.includes(campo) ? campo : defaultField
  const safeDir = direcao === 'ASC' ? 'ASC' : 'DESC'

  return `ORDER BY ${safeCampo} ${safeDir}`
}

/**
 * Gera SQL de LIMIT/OFFSET a partir da paginação
 */
export function buildLimitOffset(paginacao: Paginacao): string {
  return `LIMIT ${paginacao.limite} OFFSET ${paginacao.offset}`
}

// ============================================================================
// SAFE QUERY HELPER
// ============================================================================

/**
 * Executa uma query capturando erros. Retorna rows vazio em caso de falha.
 * Útil para queries paralelas onde falha individual não deve quebrar tudo.
 */
export async function safeQuery<T = Record<string, any>>(
  pool: { query: (sql: string, params?: unknown[]) => Promise<{ rows: T[] }> },
  sql: string,
  params: unknown[] = [],
  label?: string
): Promise<T[]> {
  try {
    const result = await pool.query(sql, params)
    return result.rows
  } catch (error) {
    if (label) {
      console.error(`[safeQuery] Erro em ${label}:`, error instanceof Error ? (error as Error).message : error)
    }
    return []
  }
}

// ============================================================================
// SÉRIE HELPERS
// ============================================================================

/**
 * Extrai o número da série (ex: "5º Ano" → "5", "9" → "9")
 */
export function extrairNumeroSerie(serie: string): string {
  return serie.replace(/[^0-9]/g, '')
}

/**
 * Verifica se a série pertence a anos iniciais (2, 3, 5)
 */
export function isAnosIniciais(serie: string): boolean {
  const num = extrairNumeroSerie(serie)
  return ['2', '3', '5'].includes(num)
}

/**
 * Verifica se a série pertence a anos finais (6, 7, 8, 9)
 */
export function isAnosFinais(serie: string): boolean {
  const num = extrairNumeroSerie(serie)
  return ['6', '7', '8', '9'].includes(num)
}

/**
 * Retorna o divisor de média correto para a série
 * Anos iniciais (2,3,5): 3 disciplinas (LP, MAT, PROD)
 * Anos finais (6-9): 4 disciplinas (LP, CH, MAT, CN)
 */
export function getDivisorSerie(serie: string): number {
  return isAnosIniciais(serie) ? 3 : 4
}

/**
 * Gera SQL CASE para cálculo de média geral baseado na série.
 * Usado quando todas as notas vêm do mesmo alias (ex: rc).
 */
export function getMediaGeralSQL(alias: string = 'rc'): string {
  return `CASE
    WHEN REGEXP_REPLACE(${alias}.serie::text, '[^0-9]', '', 'g') IN ('2','3','5')
    THEN (COALESCE(CAST(${alias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_producao AS DECIMAL), 0)) / 3.0
    ELSE (COALESCE(CAST(${alias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_ch AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_cn AS DECIMAL), 0)) / 4.0
  END`
}

/**
 * Gera SQL CASE para média geral com aliases diferentes para anos iniciais vs finais.
 * Usado quando anos iniciais (2,3,5) leem de rc_table e finais leem de rc.
 * @param serieAlias - alias que tem a coluna serie (ex: 'rc')
 * @param aiAlias    - alias para notas de anos iniciais (ex: 'rc_table')
 * @param afAlias    - alias para notas de anos finais (ex: 'rc')
 */
export function getMediaGeralMixedSQL(serieAlias: string = 'rc', aiAlias: string = 'rc_table', afAlias: string = 'rc'): string {
  return `CASE
    WHEN REGEXP_REPLACE(${serieAlias}.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
      (COALESCE(CAST(${aiAlias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${aiAlias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${aiAlias}.nota_producao AS DECIMAL), 0)) / 3.0
    ELSE
      (COALESCE(CAST(${afAlias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${afAlias}.nota_ch AS DECIMAL), 0) + COALESCE(CAST(${afAlias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${afAlias}.nota_cn AS DECIMAL), 0)) / 4.0
  END`
}

/**
 * Variante ROUND(..., 2) do cálculo de média mista (rc_table/rc).
 */
export function getMediaGeralMixedRoundedSQL(serieAlias: string = 'rc', aiAlias: string = 'rc_table', afAlias: string = 'rc'): string {
  return `CASE
    WHEN REGEXP_REPLACE(${serieAlias}.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
      ROUND((COALESCE(CAST(${aiAlias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${aiAlias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${aiAlias}.nota_producao AS DECIMAL), 0)) / 3.0, 2)
    ELSE
      ROUND((COALESCE(CAST(${afAlias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${afAlias}.nota_ch AS DECIMAL), 0) + COALESCE(CAST(${afAlias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${afAlias}.nota_cn AS DECIMAL), 0)) / 4.0, 2)
  END`
}

/**
 * Gera SQL ROUND(AVG(CASE WHEN presença='P' THEN media ELSE NULL END), 2)
 * Usado em queries agregadas para calcular media_geral com filtro de presença.
 */
export function getMediaGeralAvgSQL(alias: string = 'rc'): string {
  return `ROUND(AVG(CASE
    WHEN (${alias}.presenca = 'P' OR ${alias}.presenca = 'p') THEN
      ${getMediaGeralSQL(alias)}
    ELSE NULL
  END), 2)`
}

/**
 * Gera SQL para média de anos iniciais (séries 2,3,5): LP + MAT + PROD / 3
 */
export function getMediaAnosIniciaisSQL(alias: string = 'rc'): string {
  return `(COALESCE(CAST(${alias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_producao AS DECIMAL), 0)) / 3.0`
}

/**
 * Gera SQL para média de anos finais (séries 6-9): LP + CH + MAT + CN / 4
 */
export function getMediaAnosFinaisSQL(alias: string = 'rc'): string {
  return `(COALESCE(CAST(${alias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_ch AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_cn AS DECIMAL), 0)) / 4.0`
}

/**
 * SQL para filtrar presença válida
 */
export function getPresencaSQL(alias: string = 'rc'): string {
  return `(${alias}.presenca = 'P' OR ${alias}.presenca = 'p')`
}

// ============================================================================
// VALIDAÇÃO DE UPLOAD
// ============================================================================

const UPLOAD_MIMES_EXCEL = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/csv',
]

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * Valida arquivo de upload (MIME type e tamanho).
 * Retorna null se válido, ou string com mensagem de erro.
 */
export function validarArquivoUpload(
  arquivo: File,
  opcoes?: { mimes?: string[]; maxSize?: number }
): string | null {
  const mimes = opcoes?.mimes ?? UPLOAD_MIMES_EXCEL
  const maxSize = opcoes?.maxSize ?? MAX_UPLOAD_SIZE

  if (!mimes.includes(arquivo.type) && arquivo.type !== '') {
    return `Tipo de arquivo não permitido (${arquivo.type || 'desconhecido'}). Envie .xlsx, .xls ou .csv`
  }

  if (arquivo.size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024))
    return `Arquivo muito grande (${Math.round(arquivo.size / (1024 * 1024))}MB). Máximo: ${maxMB}MB`
  }

  return null
}
