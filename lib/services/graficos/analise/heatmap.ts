/**
 * Gráfico: Heatmap
 *
 * @module services/graficos/analise/heatmap
 */

import pool from '@/database/connection'

import type { HeatmapItem } from '../types'

import {
  parseDbNumber,
  safeQuery,
  getMediaGeralSQLLocal,
} from '../helpers'

export async function fetchHeatmap(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<HeatmapItem[]> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
  const mediaGeralCalc = getMediaGeralSQLLocal()

  const query = `
    SELECT
      e.id as escola_id,
      e.nome as escola_nome,
      CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END)
           THEN true ELSE false END as anos_iniciais,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_pt,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_geral
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY e.id, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
    ORDER BY e.nome
    ${deveRemoverLimites ? '' : 'LIMIT 50'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchHeatmap')
  return rows.length > 0
    ? rows.map((r) => ({
        escola: r.escola_nome,
        escola_id: r.escola_id,
        anos_iniciais: r.anos_iniciais,
        LP: parseDbNumber(r.media_lp),
        CH: r.anos_iniciais ? null : parseDbNumber(r.media_ch),
        MAT: parseDbNumber(r.media_mat),
        CN: r.anos_iniciais ? null : parseDbNumber(r.media_cn),
        PT: r.anos_iniciais ? (parseDbNumber(r.media_pt) || null) : null,
        Geral: parseDbNumber(r.media_geral)
      }))
    : []
}
