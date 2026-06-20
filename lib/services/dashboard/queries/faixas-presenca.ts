/**
 * Queries do Dashboard: faixas de nota e distribuição de presença
 *
 * @module services/dashboard/queries/faixas-presenca
 */

import pool from '@/database/connection'
import { safeQuery } from '@/lib/api-helpers'
import type { QueryParamValue } from '@/lib/types'
import type {
  FaixaNotaDbRow,
  PresencaDbRow,
} from '../types'

/**
 * Busca distribuição por faixa de nota
 */
export async function fetchFaixasNota(
  whereClause: string,
  params: QueryParamValue[],
  joinNivelAprendizagem: string,
  presenca: string | null
): Promise<FaixaNotaDbRow[]> {
  // Construir condições de faixas de nota
  const baseConditions = whereClause ? whereClause.replace('WHERE ', '') : ''
  const faixasConditions = baseConditions ? [baseConditions] : []
  if (!presenca) {
    faixasConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
  }
  faixasConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
  const faixasWhere = faixasConditions.length > 0 ? `WHERE ${faixasConditions.join(' AND ')}` : ''

  const sql = `
    SELECT faixa, quantidade FROM (
      SELECT
        CASE
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 0 AND CAST(rc.media_aluno AS DECIMAL) < 2 THEN '0 a 2'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 2 AND CAST(rc.media_aluno AS DECIMAL) < 4 THEN '2 a 4'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 AND CAST(rc.media_aluno AS DECIMAL) < 6 THEN '4 a 6'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 AND CAST(rc.media_aluno AS DECIMAL) < 8 THEN '6 a 8'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 AND CAST(rc.media_aluno AS DECIMAL) <= 10 THEN '8 a 10'
          ELSE 'N/A'
        END as faixa,
        CASE
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 0 AND CAST(rc.media_aluno AS DECIMAL) < 2 THEN 1
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 2 AND CAST(rc.media_aluno AS DECIMAL) < 4 THEN 2
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 AND CAST(rc.media_aluno AS DECIMAL) < 6 THEN 3
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 AND CAST(rc.media_aluno AS DECIMAL) < 8 THEN 4
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 AND CAST(rc.media_aluno AS DECIMAL) <= 10 THEN 5
          ELSE 6
        END as ordem,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${faixasWhere}
      GROUP BY faixa, ordem
    ) sub
    ORDER BY ordem
  `
  return safeQuery<FaixaNotaDbRow>(pool, sql, params, 'faixasNota')
}

/**
 * Busca distribuição de presença
 */
export async function fetchPresenca(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<PresencaDbRow[]> {
  const sql = `
    SELECT
      CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 'Presente'
        WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 'Faltante'
        ELSE 'Não informado'
      END as status,
      COUNT(*) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY
      CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 'Presente'
        WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 'Faltante'
        ELSE 'Não informado'
      END
    ORDER BY quantidade DESC
  `
  return safeQuery<PresencaDbRow>(pool, sql, paramsBase, 'presenca')
}
