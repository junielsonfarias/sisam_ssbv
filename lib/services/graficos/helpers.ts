/**
 * Funções auxiliares do módulo de gráficos
 *
 * @module services/graficos/helpers
 */

import pool from '@/database/connection'
import { safeQuery as _safeQuery } from '@/lib/api-helpers'
import { Usuario } from '@/lib/types'
import { NumericValue, parseDbInt as _parseDbInt, parseDbNumber as _parseDbNumber } from '@/lib/utils-numeros'

import type { DbValue, DbRow, GraficosFiltros, BuildFiltersResult } from './types'

/** Wrappers que aceitam DbValue (inclui boolean do PostgreSQL) */
export function parseDbInt(valor: DbValue, valorPadrao: number = 0): number {
  return _parseDbInt(valor as NumericValue, valorPadrao)
}
export function parseDbNumber(valor: DbValue, valorPadrao: number = 0): number {
  return _parseDbNumber(valor as NumericValue, valorPadrao)
}

// Wrapper tipado para safeQuery
export async function safeQuery(poolRef: typeof pool, sql: string, params: unknown[] = [], label?: string): Promise<DbRow[]> {
  return _safeQuery(poolRef, sql, params, label) as Promise<DbRow[]>
}

/**
 * Gera filtro de range de questões baseado na série e disciplina.
 *
 * Configuração de questões por série:
 * - 2º/3º Ano: LP=14 (Q1-Q14), MAT=14 (Q15-Q28)
 * - 5º Ano: LP=14 (Q1-Q14), MAT=20 (Q15-Q34)
 * - 8º/9º Ano: LP=20 (Q1-Q20), CH=10 (Q21-Q30), MAT=20 (Q31-Q50), CN=10 (Q51-Q60)
 */
export function getQuestaoRangeFilter(serie: string | null, disciplina: string | null, tipoEnsino: string | null): string | null {
  const getNumeroSerie = (s: string) => {
    const match = s.match(/(\d+)/)
    return match ? match[1] : null
  }

  if (serie) {
    const numeroSerie = getNumeroSerie(serie)
    if (!numeroSerie) return null

    if (numeroSerie === '2' || numeroSerie === '3') {
      if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 14`
      if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 15 AND 28`
      if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 28`
    }
    if (numeroSerie === '5') {
      if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 14`
      if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 15 AND 34`
      if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 34`
    }
    if (['6', '7', '8', '9'].includes(numeroSerie)) {
      if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 20`
      if (disciplina === 'CH') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 21 AND 30`
      if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 31 AND 50`
      if (disciplina === 'CN') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 51 AND 60`
      if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 60`
    }
  }

  if (tipoEnsino === 'anos_iniciais') {
    if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 14`
    if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 15 AND 34`
    if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 34`
  }

  if (tipoEnsino === 'anos_finais') {
    if (disciplina === 'LP') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 20`
    if (disciplina === 'CH') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 21 AND 30`
    if (disciplina === 'MAT') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 31 AND 50`
    if (disciplina === 'CN') return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 51 AND 60`
    if (!disciplina) return `CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) BETWEEN 1 AND 60`
  }

  return null
}

/** Média geral SQL local (usa COALESCE sem CAST como no original) */
export function getMediaGeralSQLLocal(campoSerie: string = 'rc.serie'): string {
  const numeroSerie = `REGEXP_REPLACE(${campoSerie}::text, '[^0-9]', '', 'g')`
  return `CASE
    WHEN ${numeroSerie} IN ('2', '3', '5') THEN
      (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_producao, 0)) / 3.0
    ELSE
      (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_ch, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_cn, 0)) / 4.0
  END`
}

/**
 * Determina o campo de nota baseado na disciplina selecionada
 */
export function getCampoNota(disciplina: string | null): { campo: string; label: string; totalQuestoes: number; isCalculated?: boolean } {
  switch (disciplina) {
    case 'LP':
      return { campo: 'rc.nota_lp', label: 'Língua Portuguesa', totalQuestoes: 20 }
    case 'CH':
      return { campo: 'rc.nota_ch', label: 'Ciências Humanas', totalQuestoes: 10 }
    case 'MAT':
      return { campo: 'rc.nota_mat', label: 'Matemática', totalQuestoes: 20 }
    case 'CN':
      return { campo: 'rc.nota_cn', label: 'Ciências da Natureza', totalQuestoes: 10 }
    case 'PT':
      return { campo: 'rc.nota_producao', label: 'Produção Textual', totalQuestoes: 1 }
    default:
      return { campo: getMediaGeralSQLLocal(), label: 'Média Geral', totalQuestoes: 60, isCalculated: true }
  }
}

/** Verifica se escolaId é um valor válido (não vazio, não "undefined", não "Todas") */
export function isEscolaIdValida(escolaId: string | null): boolean {
  return !!(escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas')
}

/**
 * Monta WHERE clause principal para resultados_consolidados_unificada.
 * Aplica restrições de permissão por tipo de usuário e filtros opcionais.
 */
export function buildGraficosFilters(usuario: Usuario, filtros: GraficosFiltros): BuildFiltersResult {
  const whereConditions: string[] = []
  const params: (string | null)[] = []
  let paramIndex = 1

  // Restrições baseadas no tipo de usuário
  if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(usuario.escola_id)
    paramIndex++
  } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(usuario.polo_id)
    paramIndex++
  }

  if (filtros.anoLetivo) {
    whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
    params.push(filtros.anoLetivo)
    paramIndex++
  }

  // Admin e Técnico podem usar filtros adicionais
  if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  }

  if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') &&
      isEscolaIdValida(filtros.escolaId)) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  if (filtros.serie) {
    whereConditions.push(`rc.serie = $${paramIndex}`)
    params.push(filtros.serie)
    paramIndex++
  }

  if (filtros.turmaId) {
    whereConditions.push(`rc.turma_id = $${paramIndex}`)
    params.push(filtros.turmaId)
    paramIndex++
  }

  if (filtros.tipoEnsino === 'anos_iniciais') {
    whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`)
  } else if (filtros.tipoEnsino === 'anos_finais') {
    whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`)
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
  const deveRemoverLimites = !isEscolaIdValida(filtros.escolaId)

  return { whereClause, params, paramIndex, deveRemoverLimites }
}

export async function fetchSeriesDisponiveis(usuario: Usuario, filtros: GraficosFiltros): Promise<string[]> {
  const whereSeriesConditions: string[] = []
  const paramsSeries: (string | null)[] = []
  let paramSeriesIndex = 1

  if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    whereSeriesConditions.push(`rc.escola_id = $${paramSeriesIndex}`)
    paramsSeries.push(usuario.escola_id)
    paramSeriesIndex++
  } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    whereSeriesConditions.push(`e.polo_id = $${paramSeriesIndex}`)
    paramsSeries.push(usuario.polo_id)
    paramSeriesIndex++
  }

  if (filtros.anoLetivo) {
    whereSeriesConditions.push(`rc.ano_letivo = $${paramSeriesIndex}`)
    paramsSeries.push(filtros.anoLetivo)
    paramSeriesIndex++
  }

  const baseSeriesCondition = `rc.serie IS NOT NULL AND rc.serie != ''
    AND (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')
    AND rc.nota_lp IS NOT NULL`

  const whereSeriesClause = whereSeriesConditions.length > 0
    ? `WHERE ${whereSeriesConditions.join(' AND ')} AND ${baseSeriesCondition}`
    : `WHERE ${baseSeriesCondition}`

  const query = `
    SELECT DISTINCT COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')) || 'º Ano' as serie,
           COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'))::integer as serie_numero
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereSeriesClause}
    ORDER BY serie_numero
  `

  const rows = await safeQuery(pool, query, paramsSeries, 'fetchSeriesDisponiveis')
  return rows.map((r) => String(r.serie ?? '')).filter((s) => s.trim() !== '')
}
