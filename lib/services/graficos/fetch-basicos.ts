/**
 * Funções fetch de gráficos básicos
 *
 * Contém: fetchDisciplinas, fetchEscolas, fetchSeries, fetchPolos,
 * fetchDistribuicao, fetchPresenca, fetchComparativoEscolas, fetchSeriesDisponiveis
 *
 * @module services/graficos/fetch-basicos
 */

import pool from '@/database/connection'

import type {
  DisciplinasData,
  EscolasData,
  LabelDadosTotaisData,
  DistribuicaoData,
  PresencaData,
  ComparativoEscolasData,
} from './types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getCampoNota,
  getMediaGeralSQLLocal,
} from './helpers'

// ============================================================================
// GRÁFICO: DISCIPLINAS
// ============================================================================

export async function fetchDisciplinas(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<DisciplinasData | null> {
  if (disciplina && ['LP', 'CH', 'MAT', 'CN', 'PT'].includes(disciplina)) {
    const campoMap: Record<string, { campo: string; label: string }> = {
      LP: { campo: 'rc.nota_lp', label: 'Língua Portuguesa' },
      CH: { campo: 'rc.nota_ch', label: 'Ciências Humanas' },
      MAT: { campo: 'rc.nota_mat', label: 'Matemática' },
      CN: { campo: 'rc.nota_cn', label: 'Ciências da Natureza' },
      PT: { campo: 'rc.nota_producao', label: 'Produção Textual' }
    }
    const config = campoMap[disciplina]

    const query = `
      SELECT
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${config.campo} IS NOT NULL AND CAST(${config.campo} AS DECIMAL) > 0) THEN CAST(${config.campo} AS DECIMAL) ELSE NULL END), 2) as media,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${config.campo} IS NOT NULL AND CAST(${config.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
    `
    const rows = await safeQuery(pool, query, params, 'fetchDisciplinas:single')
    if (rows.length > 0 && parseDbInt(rows[0].total_alunos) > 0) {
      return {
        labels: [config.label],
        dados: [parseDbNumber(rows[0].media)],
        totalAlunos: parseDbInt(rows[0].total_alunos)
      }
    }
    return null
  }

  // Sem disciplina específica: mostrar todas com indicadores estatísticos
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

  const query = `
    SELECT
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_pt,
      ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as desvio_lp,
      ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as desvio_ch,
      ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as desvio_mat,
      ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as desvio_cn,
      ROUND(STDDEV(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as desvio_pt,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) as total_alunos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN 1 END) as total_alunos_pt,
      SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_lp AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_lp,
      SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_ch AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_ch,
      SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_mat AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_mat,
      SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND CAST(rc.nota_cn AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_cn,
      SUM(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND CAST(rc.nota_producao AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_pt,
      COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
      COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
  `
  const rows = await safeQuery(pool, query, params, 'fetchDisciplinas:all')
  if (rows.length > 0 && parseDbInt(rows[0].total_alunos) > 0) {
    const row = rows[0]
    const totalAlunos = parseDbInt(row.total_alunos) || 1
    const totalAlunosPT = parseDbInt(row.total_alunos_pt)
    const countAnosIniciais = parseDbInt(row.count_anos_iniciais)
    const countAnosFinais = parseDbInt(row.count_anos_finais)

    const labels: string[] = ['Língua Portuguesa']
    const dados: number[] = [parseDbNumber(row.media_lp)]
    const desvios: number[] = [parseDbNumber(row.desvio_lp)]
    const taxas_aprovacao: number[] = [(parseDbInt(row.aprovados_lp) / totalAlunos) * 100]

    if (countAnosFinais > 0 && parseDbNumber(row.media_ch) > 0) {
      labels.push('Ciências Humanas')
      dados.push(parseDbNumber(row.media_ch))
      desvios.push(parseDbNumber(row.desvio_ch))
      taxas_aprovacao.push((parseDbInt(row.aprovados_ch) / totalAlunos) * 100)
    }

    labels.push('Matemática')
    dados.push(parseDbNumber(row.media_mat))
    desvios.push(parseDbNumber(row.desvio_mat))
    taxas_aprovacao.push((parseDbInt(row.aprovados_mat) / totalAlunos) * 100)

    if (countAnosFinais > 0 && parseDbNumber(row.media_cn) > 0) {
      labels.push('Ciências da Natureza')
      dados.push(parseDbNumber(row.media_cn))
      desvios.push(parseDbNumber(row.desvio_cn))
      taxas_aprovacao.push((parseDbInt(row.aprovados_cn) / totalAlunos) * 100)
    }

    if (countAnosIniciais > 0 && totalAlunosPT > 0 && parseDbNumber(row.media_pt) > 0) {
      labels.push('Produção Textual')
      dados.push(parseDbNumber(row.media_pt))
      desvios.push(parseDbNumber(row.desvio_pt))
      taxas_aprovacao.push((parseDbInt(row.aprovados_pt) / totalAlunosPT) * 100)
    }

    return {
      labels,
      dados,
      desvios,
      taxas_aprovacao,
      totalAlunos,
      totalAlunosPT,
      anosIniciais: countAnosIniciais,
      anosFinais: countAnosFinais,
      faixas: {
        insuficiente: [0, 4],
        regular: [4, 6],
        bom: [6, 8],
        excelente: [8, 10]
      }
    }
  }

  return null
}

// ============================================================================
// GRÁFICO: ESCOLAS
// ============================================================================

export async function fetchEscolas(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<EscolasData | null> {
  const notaConfig = getCampoNota(disciplina)
  const query = `
    SELECT
      e.nome as escola,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN CAST(${notaConfig.campo} AS DECIMAL) ELSE NULL END), 2) as media,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY e.id, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) > 0
    ORDER BY media DESC
  `
  const rows = await safeQuery(pool, query, params, 'fetchEscolas')
  if (rows.length > 0) {
    return {
      labels: rows.map((r, index) => `${index + 1}º ${r.escola}`),
      dados: rows.map((r) => parseDbNumber(r.media)),
      totais: rows.map((r) => parseDbInt(r.total_alunos)),
      rankings: rows.map((_, index) => index + 1),
      disciplina: notaConfig.label
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: SÉRIES
// ============================================================================

export async function fetchSeries(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<LabelDadosTotaisData | null> {
  const notaConfig = getCampoNota(disciplina)
  const query = `
    SELECT
      rc.serie,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN CAST(${notaConfig.campo} AS DECIMAL) ELSE NULL END), 2) as media,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY rc.serie
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) > 0
    ORDER BY rc.serie
  `
  const rows = await safeQuery(pool, query, params, 'fetchSeries')
  if (rows.length > 0) {
    return {
      labels: rows.map((r) => String(r.serie ?? '')),
      dados: rows.map((r) => parseDbNumber(r.media)),
      totais: rows.map((r) => parseDbInt(r.total_alunos)),
      disciplina: notaConfig.label
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: POLOS
// ============================================================================

export async function fetchPolos(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<LabelDadosTotaisData | null> {
  const notaConfig = getCampoNota(disciplina)
  const query = `
    SELECT
      p.nome as polo,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN CAST(${notaConfig.campo} AS DECIMAL) ELSE NULL END), 2) as media,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    INNER JOIN polos p ON e.polo_id = p.id
    ${whereClause}
    GROUP BY p.id, p.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0) THEN 1 END) > 0
    ORDER BY media DESC
  `
  const rows = await safeQuery(pool, query, params, 'fetchPolos')
  if (rows.length > 0) {
    return {
      labels: rows.map((r) => String(r.polo ?? '')),
      dados: rows.map((r) => parseDbNumber(r.media)),
      totais: rows.map((r) => parseDbInt(r.total_alunos)),
      disciplina: notaConfig.label
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: DISTRIBUIÇÃO
// ============================================================================

export async function fetchDistribuicao(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<DistribuicaoData | null> {
  let campoNota = getMediaGeralSQLLocal()
  let labelDisciplina = 'Geral'
  let usandoMediaGeral = true

  if (disciplina === 'LP') { campoNota = 'rc.nota_lp'; labelDisciplina = 'Língua Portuguesa'; usandoMediaGeral = false }
  else if (disciplina === 'CH') { campoNota = 'rc.nota_ch'; labelDisciplina = 'Ciências Humanas'; usandoMediaGeral = false }
  else if (disciplina === 'MAT') { campoNota = 'rc.nota_mat'; labelDisciplina = 'Matemática'; usandoMediaGeral = false }
  else if (disciplina === 'CN') { campoNota = 'rc.nota_cn'; labelDisciplina = 'Ciências da Natureza'; usandoMediaGeral = false }

  const condicaoValida = usandoMediaGeral
    ? 'rc.nota_lp IS NOT NULL'
    : `${campoNota} IS NOT NULL AND CAST(${campoNota} AS DECIMAL) > 0`

  const whereDistribuicao = disciplina || usandoMediaGeral
    ? (whereClause
        ? `${whereClause} AND ${condicaoValida}`
        : `WHERE ${condicaoValida}`)
    : whereClause

  const query = `
    SELECT
      CASE
        WHEN (${campoNota}) >= 9 THEN '9.0 - 10.0'
        WHEN (${campoNota}) >= 8 THEN '8.0 - 8.9'
        WHEN (${campoNota}) >= 7 THEN '7.0 - 7.9'
        WHEN (${campoNota}) >= 6 THEN '6.0 - 6.9'
        WHEN (${campoNota}) >= 5 THEN '5.0 - 5.9'
        ELSE '0.0 - 4.9'
      END as faixa,
      COUNT(*) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereDistribuicao}
    GROUP BY faixa
    ORDER BY faixa DESC
  `
  const rows = await safeQuery(pool, query, params, 'fetchDistribuicao')
  if (rows.length > 0) {
    return {
      labels: rows.map((r) => String(r.faixa ?? '')),
      dados: rows.map((r) => parseDbInt(r.quantidade)),
      disciplina: labelDisciplina
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: PRESENÇA
// ============================================================================

export async function fetchPresenca(whereClause: string, params: (string | null)[]): Promise<PresencaData | null> {
  const query = `
    SELECT
      CASE WHEN rc.presenca IN ('P', 'p') THEN 'Presentes' ELSE 'Faltas' END as status,
      COUNT(*) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY status
  `
  const rows = await safeQuery(pool, query, params, 'fetchPresenca')
  if (rows.length > 0) {
    return {
      labels: rows.map((r) => String(r.status ?? '')),
      dados: rows.map((r) => parseDbInt(r.quantidade))
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: COMPARATIVO ESCOLAS
// ============================================================================

export async function fetchComparativoEscolas(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<ComparativoEscolasData | null> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
  const mediaGeralCalc = getMediaGeralSQLLocal()

  const query = `
    WITH ranking_escolas AS (
      SELECT
        e.nome as escola,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_geral,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_pt,
        COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) as total_alunos,
        COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
        COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais,
        ROW_NUMBER() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END) DESC NULLS LAST) as rank_desc,
        ROW_NUMBER() OVER (ORDER BY AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END) ASC NULLS LAST) as rank_asc
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
      GROUP BY e.id, e.nome
      HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN 1 END) > 0
    )
    SELECT * FROM ranking_escolas
    ${deveRemoverLimites ? '' : 'WHERE rank_desc <= 5 OR rank_asc <= 5'}
    ORDER BY media_geral DESC
  `
  const rows = await safeQuery(pool, query, params, 'fetchComparativoEscolas')
  if (rows.length > 0) {
    const totalAnosIniciais = rows.reduce((acc: number, r) => acc + parseDbInt(r.count_anos_iniciais), 0)
    const totalAnosFinais = rows.reduce((acc: number, r) => acc + parseDbInt(r.count_anos_finais), 0)

    return {
      escolas: rows.map((r) => String(r.escola ?? '')),
      mediaGeral: rows.map((r) => parseDbNumber(r.media_geral)),
      mediaLP: rows.map((r) => parseDbNumber(r.media_lp)),
      mediaCH: rows.map((r) => parseDbNumber(r.media_ch)),
      mediaMAT: rows.map((r) => parseDbNumber(r.media_mat)),
      mediaCN: rows.map((r) => parseDbNumber(r.media_cn)),
      mediaPT: rows.map((r) => parseDbNumber(r.media_pt)),
      totais: rows.map((r) => parseDbInt(r.total_alunos)),
      temAnosIniciais: totalAnosIniciais > 0,
      temAnosFinais: totalAnosFinais > 0
    }
  }
  return null
}
