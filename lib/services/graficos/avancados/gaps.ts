/**
 * Gráfico: Gaps
 *
 * @module services/graficos/avancados/gaps
 */

import pool from '@/database/connection'

import type { GapsItem } from '../types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getCampoNota,
} from '../helpers'

export async function fetchGaps(whereClause: string, params: (string | null)[], disciplina: string | null, deveRemoverLimites: boolean): Promise<{ gaps: GapsItem[]; gaps_disciplina: string }> {
  const notaConfig = getCampoNota(disciplina)
  const whereGaps = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`

  const query = `
    SELECT
      COALESCE(e.nome, 'Geral') as categoria,
      ROUND(MAX(CAST(${notaConfig.campo} AS DECIMAL)), 2) as melhor_media,
      ROUND(MIN(CAST(${notaConfig.campo} AS DECIMAL)), 2) as pior_media,
      ROUND(AVG(CAST(${notaConfig.campo} AS DECIMAL)), 2) as media_geral,
      ROUND(MAX(CAST(${notaConfig.campo} AS DECIMAL)) - MIN(CAST(${notaConfig.campo} AS DECIMAL)), 2) as gap,
      COUNT(*) as total_alunos
    FROM resultados_consolidados_unificada rc
    LEFT JOIN escolas e ON rc.escola_id = e.id
    ${whereGaps}
    GROUP BY e.id, e.nome
    HAVING COUNT(*) > 0
    ORDER BY gap DESC
    ${deveRemoverLimites ? '' : 'LIMIT 30'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchGaps')
  return {
    gaps: rows.length > 0
      ? rows.map((r) => ({
          categoria: r.categoria,
          melhor_media: parseDbNumber(r.melhor_media),
          pior_media: parseDbNumber(r.pior_media),
          media_geral: parseDbNumber(r.media_geral),
          gap: parseDbNumber(r.gap),
          total_alunos: parseDbInt(r.total_alunos)
        }))
      : [],
    gaps_disciplina: notaConfig.label
  }
}
