/**
 * Gráfico: Médias por Etapa
 *
 * @module services/graficos/avancados/medias-etapa
 */

import pool from '@/database/connection'
import { getMediaAnosIniciaisSQL, getMediaAnosFinaisSQL } from '@/lib/api-helpers'

import type {
  MediasEtapaItem,
  MediasEtapaTotais,
} from '../types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getMediaGeralSQLLocal,
} from '../helpers'

export async function fetchMediasEtapa(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<{ medias_etapa: MediasEtapaItem[]; medias_etapa_totais: MediasEtapaTotais }> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
  const mediaGeralCalc = getMediaGeralSQLLocal()

  const query = `
    SELECT
      COALESCE(e.nome, 'Geral') as escola,
      e.id as escola_id,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN
        ${getMediaAnosIniciaisSQL('rc')}
      ELSE NULL END), 2) as media_ai,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN
        ${getMediaAnosFinaisSQL('rc')}
      ELSE NULL END), 2) as media_af,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_geral,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as total_ai,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as total_af,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY e.id, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
    ORDER BY media_geral DESC NULLS LAST
    ${deveRemoverLimites ? '' : 'LIMIT 30'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchMediasEtapa')

  const medias_etapa = rows.length > 0
    ? rows.map((r) => ({
        escola: r.escola,
        escola_id: r.escola_id,
        media_ai: parseDbNumber(r.media_ai) || null,
        media_af: parseDbNumber(r.media_af) || null,
        media_geral: parseDbNumber(r.media_geral),
        total_ai: parseDbInt(r.total_ai),
        total_af: parseDbInt(r.total_af),
        total_alunos: parseDbInt(r.total_alunos)
      }))
    : []

  const totaisGerais = rows.reduce<MediasEtapaTotais>((acc, r) => ({
    total_ai: acc.total_ai + parseDbInt(r.total_ai),
    total_af: acc.total_af + parseDbInt(r.total_af),
    total_alunos: acc.total_alunos + parseDbInt(r.total_alunos)
  }), { total_ai: 0, total_af: 0, total_alunos: 0 })

  return { medias_etapa, medias_etapa_totais: totaisGerais }
}
