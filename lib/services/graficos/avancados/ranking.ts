/**
 * Gráfico: Ranking (escolas e turmas)
 *
 * @module services/graficos/avancados/ranking
 */

import pool from '@/database/connection'
import { getMediaAnosIniciaisSQL, getMediaAnosFinaisSQL } from '@/lib/api-helpers'

import type {
  GraficosFiltros,
  RankingItem,
  RankingMeta,
} from '../types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getCampoNota,
} from '../helpers'

export async function fetchRanking(
  whereClause: string,
  params: (string | null)[],
  filtros: GraficosFiltros,
  deveRemoverLimites: boolean
): Promise<{ ranking: RankingItem[]; ranking_disciplina: string; ranking_meta?: RankingMeta }> {
  const tipoRanking = filtros.tipoRanking || 'escolas'
  const notaConfig = getCampoNota(filtros.disciplina)
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

  if (tipoRanking === 'escolas') {
    const query = `
      SELECT
        e.id,
        e.nome,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) as total_alunos,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN CAST(${notaConfig.campo} AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_producao,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN
          ${getMediaAnosIniciaisSQL('rc')}
        ELSE NULL END), 2) as media_ai,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN
          ${getMediaAnosFinaisSQL('rc')}
        ELSE NULL END), 2) as media_af,
        COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
        COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
      GROUP BY e.id, e.nome
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) > 0
      ORDER BY media_geral DESC NULLS LAST
      ${deveRemoverLimites ? '' : 'LIMIT 50'}
    `
    const rows = await safeQuery(pool, query, params, 'fetchRanking:escolas')
    const totalAnosIniciais = rows.reduce((acc: number, r) => acc + parseDbInt(r.count_anos_iniciais), 0)
    const totalAnosFinais = rows.reduce((acc: number, r) => acc + parseDbInt(r.count_anos_finais), 0)

    return {
      ranking: rows.length > 0
        ? rows.map((r, index) => ({
            posicao: index + 1,
            id: r.id,
            nome: r.nome,
            total_alunos: parseDbInt(r.total_alunos),
            media_geral: parseDbNumber(r.media_geral),
            media_lp: parseDbNumber(r.media_lp),
            media_ch: parseDbNumber(r.media_ch),
            media_mat: parseDbNumber(r.media_mat),
            media_cn: parseDbNumber(r.media_cn),
            media_producao: parseDbNumber(r.media_producao),
            media_ai: parseDbNumber(r.media_ai),
            media_af: parseDbNumber(r.media_af)
          }))
        : [],
      ranking_disciplina: notaConfig.label,
      ranking_meta: {
        tem_anos_iniciais: totalAnosIniciais > 0,
        tem_anos_finais: totalAnosFinais > 0
      }
    }
  }

  if (tipoRanking === 'turmas') {
    const whereRankingTurmas = whereClause
      ? `${whereClause} AND rc.turma_id IS NOT NULL`
      : 'WHERE rc.turma_id IS NOT NULL'

    const query = `
      SELECT
        t.id,
        t.codigo,
        t.nome,
        t.serie as turma_serie,
        e.nome as escola_nome,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) as total_alunos,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN CAST(${notaConfig.campo} AS DECIMAL) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_producao,
        CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > 0 THEN true ELSE false END as anos_iniciais
      FROM resultados_consolidados_unificada rc
      INNER JOIN turmas t ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereRankingTurmas}
      GROUP BY t.id, t.codigo, t.nome, t.serie, e.nome
      HAVING COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN rc.aluno_id END) > 0
      ORDER BY media_geral DESC NULLS LAST
      ${deveRemoverLimites ? '' : 'LIMIT 50'}
    `
    const rows = await safeQuery(pool, query, params, 'fetchRanking:turmas')
    return {
      ranking: rows.map((r, index) => ({
        posicao: index + 1,
        id: r.id,
        nome: r.codigo || r.nome || 'Turma',
        serie: r.turma_serie,
        escola: r.escola_nome,
        total_alunos: parseDbInt(r.total_alunos),
        media_geral: parseDbNumber(r.media_geral),
        media_lp: parseDbNumber(r.media_lp),
        media_mat: parseDbNumber(r.media_mat),
        media_ch: parseDbNumber(r.media_ch),
        media_cn: parseDbNumber(r.media_cn),
        media_producao: parseDbNumber(r.media_producao),
        anos_iniciais: r.anos_iniciais
      })),
      ranking_disciplina: notaConfig.label
    }
  }

  // Tipo ranking não reconhecido
  return { ranking: [], ranking_disciplina: notaConfig.label }
}
