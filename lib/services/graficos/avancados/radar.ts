/**
 * Gráfico: Radar
 *
 * @module services/graficos/avancados/radar
 */

import pool from '@/database/connection'

import type { RadarItem } from '../types'

import {
  parseDbNumber,
  safeQuery,
} from '../helpers'

export async function fetchRadar(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<RadarItem[]> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

  const query = `
    SELECT
      COALESCE(e.nome, 'Geral') as nome,
      CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END)
           THEN true ELSE false END as anos_iniciais,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as pt
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY e.id, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
    ORDER BY e.nome
    ${deveRemoverLimites ? '' : 'LIMIT 10'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchRadar')
  return rows.length > 0
    ? rows.map((r) => ({
        nome: r.nome,
        anos_iniciais: r.anos_iniciais,
        LP: parseDbNumber(r.lp),
        CH: r.anos_iniciais ? null : parseDbNumber(r.ch),
        MAT: parseDbNumber(r.mat),
        CN: r.anos_iniciais ? null : parseDbNumber(r.cn),
        PT: r.anos_iniciais ? (parseDbNumber(r.pt) || null) : null
      }))
    : []
}
