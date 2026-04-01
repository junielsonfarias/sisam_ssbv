/**
 * Funções fetch de gráficos avançados
 *
 * Contém: fetchRanking, fetchAprovacao, fetchGaps, fetchRadar,
 * fetchNiveisDisciplina, fetchMediasEtapa, fetchNiveisTurma
 *
 * @module services/graficos/fetch-avancados
 */

import pool from '@/database/connection'
import { getMediaAnosIniciaisSQL, getMediaAnosFinaisSQL } from '@/lib/api-helpers'

import type {
  GraficosFiltros,
  RankingItem,
  RankingMeta,
  AprovacaoItem,
  GapsItem,
  RadarItem,
  NiveisCounts,
  NiveisDisciplinaData,
  MediasEtapaItem,
  MediasEtapaTotais,
  NiveisTurmaItem,
} from './types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getCampoNota,
  getMediaGeralSQLLocal,
} from './helpers'

// ============================================================================
// GRÁFICO: RANKING
// ============================================================================

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

// ============================================================================
// GRÁFICO: APROVAÇÃO
// ============================================================================

export async function fetchAprovacao(whereClause: string, params: (string | null)[], disciplina: string | null, deveRemoverLimites: boolean): Promise<{ aprovacao: AprovacaoItem[]; aprovacao_disciplina: string }> {
  const notaConfig = getCampoNota(disciplina)
  const whereAprovacao = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`

  const query = `
    SELECT
      COALESCE(e.nome, 'Geral') as categoria,
      COUNT(*) as total_alunos,
      SUM(CASE WHEN CAST(${notaConfig.campo} AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_6,
      SUM(CASE WHEN CAST(${notaConfig.campo} AS DECIMAL) >= 7.0 THEN 1 ELSE 0 END) as aprovados_7,
      SUM(CASE WHEN CAST(${notaConfig.campo} AS DECIMAL) >= 8.0 THEN 1 ELSE 0 END) as aprovados_8,
      ROUND(AVG(CAST(${notaConfig.campo} AS DECIMAL)), 2) as media_geral
    FROM resultados_consolidados_unificada rc
    LEFT JOIN escolas e ON rc.escola_id = e.id
    ${whereAprovacao}
    GROUP BY e.id, e.nome
    HAVING COUNT(*) > 0
    ORDER BY media_geral DESC NULLS LAST
    ${deveRemoverLimites ? '' : 'LIMIT 30'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchAprovacao')
  return {
    aprovacao: rows.length > 0
      ? rows.map((r) => {
          const totalAlunos = parseDbInt(r.total_alunos) || 1
          return {
            categoria: r.categoria,
            total_alunos: totalAlunos,
            aprovados_6: parseDbInt(r.aprovados_6),
            aprovados_7: parseDbInt(r.aprovados_7),
            aprovados_8: parseDbInt(r.aprovados_8),
            taxa_6: Math.round((parseDbInt(r.aprovados_6) / totalAlunos) * 10000) / 100,
            taxa_7: Math.round((parseDbInt(r.aprovados_7) / totalAlunos) * 10000) / 100,
            taxa_8: Math.round((parseDbInt(r.aprovados_8) / totalAlunos) * 10000) / 100,
            media_geral: parseDbNumber(r.media_geral)
          }
        })
      : [],
    aprovacao_disciplina: notaConfig.label
  }
}

// ============================================================================
// GRÁFICO: GAPS
// ============================================================================

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

// ============================================================================
// GRÁFICO: RADAR
// ============================================================================

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

// ============================================================================
// GRÁFICO: NÍVEIS POR DISCIPLINA
// ============================================================================

export async function fetchNiveisDisciplina(whereClause: string, params: (string | null)[]): Promise<NiveisDisciplinaData | null> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

  const query = `
    SELECT
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N1' THEN 1 END) as lp_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N2' THEN 1 END) as lp_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N3' THEN 1 END) as lp_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N4' THEN 1 END) as lp_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N1' THEN 1 END) as mat_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N2' THEN 1 END) as mat_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N3' THEN 1 END) as mat_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N4' THEN 1 END) as mat_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N1' THEN 1 END) as prod_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N2' THEN 1 END) as prod_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N3' THEN 1 END) as prod_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N4' THEN 1 END) as prod_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N1' THEN 1 END) as aluno_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N2' THEN 1 END) as aluno_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N3' THEN 1 END) as aluno_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N4' THEN 1 END) as aluno_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
      COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
      COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
  `
  const rows = await safeQuery(pool, query, params, 'fetchNiveisDisciplina')

  if (rows.length > 0) {
    const row = rows[0]
    return {
      LP: { N1: parseDbInt(row.lp_n1), N2: parseDbInt(row.lp_n2), N3: parseDbInt(row.lp_n3), N4: parseDbInt(row.lp_n4) },
      MAT: { N1: parseDbInt(row.mat_n1), N2: parseDbInt(row.mat_n2), N3: parseDbInt(row.mat_n3), N4: parseDbInt(row.mat_n4) },
      PROD: { N1: parseDbInt(row.prod_n1), N2: parseDbInt(row.prod_n2), N3: parseDbInt(row.prod_n3), N4: parseDbInt(row.prod_n4) },
      GERAL: { N1: parseDbInt(row.aluno_n1), N2: parseDbInt(row.aluno_n2), N3: parseDbInt(row.aluno_n3), N4: parseDbInt(row.aluno_n4) },
      total_presentes: parseDbInt(row.total_presentes),
      tem_anos_iniciais: parseDbInt(row.count_anos_iniciais) > 0,
      tem_anos_finais: parseDbInt(row.count_anos_finais) > 0
    }
  }

  return null
}

// ============================================================================
// GRÁFICO: MÉDIAS POR ETAPA
// ============================================================================

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

// ============================================================================
// GRÁFICO: NÍVEIS POR TURMA
// ============================================================================

export async function fetchNiveisTurma(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<NiveisTurmaItem[]> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
  const mediaGeralCalc = getMediaGeralSQLLocal()

  const query = `
    SELECT
      t.id as turma_id,
      t.codigo as turma_codigo,
      t.nome as turma_nome,
      t.serie as turma_serie,
      e.nome as escola_nome,
      CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > 0 THEN true ELSE false END as anos_iniciais,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N1' THEN 1 END) as n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N2' THEN 1 END) as n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N3' THEN 1 END) as n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N4' THEN 1 END) as n4,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_turma,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN turmas t ON rc.turma_id = t.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause ? `${whereClause} AND rc.turma_id IS NOT NULL` : 'WHERE rc.turma_id IS NOT NULL'}
    GROUP BY t.id, t.codigo, t.nome, t.serie, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
    ORDER BY media_turma DESC NULLS LAST
    ${deveRemoverLimites ? '' : 'LIMIT 50'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchNiveisTurma')

  return rows.length > 0
    ? rows.map((r) => {
        const niveis: NiveisCounts = {
          N1: parseDbInt(r.n1),
          N2: parseDbInt(r.n2),
          N3: parseDbInt(r.n3),
          N4: parseDbInt(r.n4)
        }
        const maxNivel = Object.entries(niveis).reduce((a, b) => b[1] > a[1] ? b : a)

        return {
          turma_id: r.turma_id,
          turma: r.turma_codigo || r.turma_nome || 'Turma',
          serie: r.turma_serie,
          escola: r.escola_nome,
          anos_iniciais: r.anos_iniciais,
          niveis,
          media_turma: parseDbNumber(r.media_turma),
          total_alunos: parseDbInt(r.total_alunos),
          nivel_predominante: maxNivel[0]
        }
      })
    : []
}
