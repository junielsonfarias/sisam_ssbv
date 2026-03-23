/**
 * Serviço centralizado de gráficos
 *
 * Extrai a lógica de negócio da rota /api/admin/graficos para um serviço
 * reutilizável e testável. Cada tipo de gráfico tem sua própria função.
 *
 * @module services/graficos
 */

import pool from '@/database/connection'
import { safeQuery as _safeQuery, getMediaGeralSQL } from '@/lib/api-helpers'
import { NOTAS } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { Usuario } from '@/lib/types'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'

// Wrapper tipado para safeQuery — retorna any[] para evitar casts em cada chamada
async function safeQuery(poolRef: typeof pool, sql: string, params: unknown[] = [], label?: string): Promise<any[]> {
  return _safeQuery(poolRef, sql, params, label)
}

const log = createLogger('Graficos')

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface GraficosFiltros {
  tipoGrafico: string
  anoLetivo: string | null
  poloId: string | null
  escolaId: string | null
  serie: string | null
  disciplina: string | null
  turmaId: string | null
  tipoEnsino: string | null
  tipoRanking?: string | null
}

export interface GraficosResponse {
  series_disponiveis: string[]
  disciplinas?: any
  escolas?: any
  series?: any
  polos?: any
  distribuicao?: any
  presenca?: any
  comparativo_escolas?: any
  acertos_erros?: any
  acertos_erros_meta?: any
  questoes?: any
  heatmap?: any
  radar?: any
  boxplot?: any
  boxplot_disciplina?: string
  correlacao?: any
  correlacao_meta?: any
  ranking?: any
  ranking_disciplina?: string
  ranking_meta?: any
  aprovacao?: any
  aprovacao_disciplina?: string
  gaps?: any
  gaps_disciplina?: string
  niveis_disciplina?: any
  medias_etapa?: any
  medias_etapa_totais?: any
  niveis_turma?: any
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Gera filtro de range de questões baseado na série e disciplina.
 *
 * Configuração de questões por série:
 * - 2º/3º Ano: LP=14 (Q1-Q14), MAT=14 (Q15-Q28)
 * - 5º Ano: LP=14 (Q1-Q14), MAT=20 (Q15-Q34)
 * - 8º/9º Ano: LP=20 (Q1-Q20), CH=10 (Q21-Q30), MAT=20 (Q31-Q50), CN=10 (Q51-Q60)
 */
function getQuestaoRangeFilter(serie: string | null, disciplina: string | null, tipoEnsino: string | null): string | null {
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
function getMediaGeralSQLLocal(campoSerie: string = 'rc.serie'): string {
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
function getCampoNota(disciplina: string | null): { campo: string; label: string; totalQuestoes: number; isCalculated?: boolean } {
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
function isEscolaIdValida(escolaId: string | null): boolean {
  return !!(escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas')
}

// ============================================================================
// CONSTRUÇÃO DE FILTROS
// ============================================================================

interface BuildFiltersResult {
  whereClause: string
  params: any[]
  paramIndex: number
  deveRemoverLimites: boolean
}

/**
 * Monta WHERE clause principal para resultados_consolidados_unificada.
 * Aplica restrições de permissão por tipo de usuário e filtros opcionais.
 */
export function buildGraficosFilters(usuario: Usuario, filtros: GraficosFiltros): BuildFiltersResult {
  const whereConditions: string[] = []
  const params: any[] = []
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
    whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
  } else if (filtros.tipoEnsino === 'anos_finais') {
    whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
  const deveRemoverLimites = !isEscolaIdValida(filtros.escolaId)

  return { whereClause, params, paramIndex, deveRemoverLimites }
}

// ============================================================================
// SÉRIES DISPONÍVEIS
// ============================================================================

async function fetchSeriesDisponiveis(usuario: Usuario, filtros: GraficosFiltros): Promise<string[]> {
  const whereSeriesConditions: string[] = []
  const paramsSeries: any[] = []
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
    SELECT DISTINCT REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') || 'º Ano' as serie,
           REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer as serie_numero
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereSeriesClause}
    ORDER BY serie_numero
  `

  const rows = await safeQuery(pool, query, paramsSeries, 'fetchSeriesDisponiveis')
  return rows.map((r: any) => r.serie).filter((s: string) => s && s.trim() !== '')
}

// ============================================================================
// GRÁFICO: DISCIPLINAS
// ============================================================================

export async function fetchDisciplinas(whereClause: string, params: any[], disciplina: string | null): Promise<any> {
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
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

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
    const row = rows[0] as any
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

export async function fetchEscolas(whereClause: string, params: any[], disciplina: string | null): Promise<any> {
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
      labels: rows.map((r: any, index: number) => `${index + 1}º ${r.escola}`),
      dados: rows.map((r: any) => parseDbNumber(r.media)),
      totais: rows.map((r: any) => parseDbInt(r.total_alunos)),
      rankings: rows.map((_: any, index: number) => index + 1),
      disciplina: notaConfig.label
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: SÉRIES
// ============================================================================

export async function fetchSeries(whereClause: string, params: any[], disciplina: string | null): Promise<any> {
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
      labels: rows.map((r: any) => r.serie),
      dados: rows.map((r: any) => parseDbNumber(r.media)),
      totais: rows.map((r: any) => parseDbInt(r.total_alunos)),
      disciplina: notaConfig.label
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: POLOS
// ============================================================================

export async function fetchPolos(whereClause: string, params: any[], disciplina: string | null): Promise<any> {
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
      labels: rows.map((r: any) => r.polo),
      dados: rows.map((r: any) => parseDbNumber(r.media)),
      totais: rows.map((r: any) => parseDbInt(r.total_alunos)),
      disciplina: notaConfig.label
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: DISTRIBUIÇÃO
// ============================================================================

export async function fetchDistribuicao(whereClause: string, params: any[], disciplina: string | null): Promise<any> {
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
      labels: rows.map((r: any) => r.faixa),
      dados: rows.map((r: any) => parseDbInt(r.quantidade)),
      disciplina: labelDisciplina
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: PRESENÇA
// ============================================================================

export async function fetchPresenca(whereClause: string, params: any[]): Promise<any> {
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
      labels: rows.map((r: any) => r.status),
      dados: rows.map((r: any) => parseDbInt(r.quantidade))
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: COMPARATIVO ESCOLAS
// ============================================================================

export async function fetchComparativoEscolas(whereClause: string, params: any[], deveRemoverLimites: boolean): Promise<any> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
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
    const totalAnosIniciais = rows.reduce((acc: number, r: any) => acc + parseDbInt(r.count_anos_iniciais), 0)
    const totalAnosFinais = rows.reduce((acc: number, r: any) => acc + parseDbInt(r.count_anos_finais), 0)

    return {
      escolas: rows.map((r: any) => r.escola),
      mediaGeral: rows.map((r: any) => parseDbNumber(r.media_geral)),
      mediaLP: rows.map((r: any) => parseDbNumber(r.media_lp)),
      mediaCH: rows.map((r: any) => parseDbNumber(r.media_ch)),
      mediaMAT: rows.map((r: any) => parseDbNumber(r.media_mat)),
      mediaCN: rows.map((r: any) => parseDbNumber(r.media_cn)),
      mediaPT: rows.map((r: any) => parseDbNumber(r.media_pt)),
      totais: rows.map((r: any) => parseDbInt(r.total_alunos)),
      temAnosIniciais: totalAnosIniciais > 0,
      temAnosFinais: totalAnosFinais > 0
    }
  }
  return null
}

// ============================================================================
// GRÁFICO: ACERTOS E ERROS
// ============================================================================

export async function fetchAcertosErros(
  whereClause: string,
  params: any[],
  filtros: GraficosFiltros,
  usuario: Usuario,
  deveRemoverLimites: boolean
): Promise<{ acertos_erros: any; acertos_erros_meta?: any }> {
  const { disciplina, anoLetivo, poloId, escolaId, serie, turmaId, tipoEnsino } = filtros

  // SE DISCIPLINA ESPECÍFICA: Mostrar acertos/erros POR QUESTÃO
  if (disciplina) {
    const whereAcertosQuestao: string[] = []
    const paramsAcertosQuestao: any[] = []
    let paramIndexAcertos = 1

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereAcertosQuestao.push(`rp.escola_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(usuario.escola_id)
      paramIndexAcertos++
    } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereAcertosQuestao.push(`e.polo_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(usuario.polo_id)
      paramIndexAcertos++
    }

    if (anoLetivo) {
      whereAcertosQuestao.push(`rp.ano_letivo = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(anoLetivo)
      paramIndexAcertos++
    }

    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
      whereAcertosQuestao.push(`e.polo_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(poloId)
      paramIndexAcertos++
    }

    if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') &&
        isEscolaIdValida(escolaId)) {
      whereAcertosQuestao.push(`rp.escola_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(escolaId)
      paramIndexAcertos++
    }

    if (serie) {
      whereAcertosQuestao.push(`rp.serie = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(serie)
      paramIndexAcertos++
    }

    if (turmaId) {
      whereAcertosQuestao.push(`rp.turma_id = $${paramIndexAcertos}`)
      paramsAcertosQuestao.push(turmaId)
      paramIndexAcertos++
    }

    const questaoRangeFilter = getQuestaoRangeFilter(serie, disciplina, tipoEnsino)
    if (questaoRangeFilter) {
      whereAcertosQuestao.push(questaoRangeFilter)
    }

    if (tipoEnsino === 'anos_iniciais') {
      whereAcertosQuestao.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
    } else if (tipoEnsino === 'anos_finais') {
      whereAcertosQuestao.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
    }

    const whereClauseAcertosQuestao = whereAcertosQuestao.length > 0
      ? `WHERE ${whereAcertosQuestao.join(' AND ')} AND rp.questao_codigo IS NOT NULL`
      : 'WHERE rp.questao_codigo IS NOT NULL'

    // Buscar total de alunos usando resultados_consolidados_unificada
    const queryTotaisAlunos = `
      SELECT
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN rc.aluno_id END) as total_presentes,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_faltantes,
        COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
    `
    const resTotais = await safeQuery(pool, queryTotaisAlunos, params, 'fetchAcertosErros:totais')
    const totaisAlunos = resTotais[0] || { total_presentes: 0, total_faltantes: 0, total_alunos: 0 }

    const queryAcertosPorQuestao = `
      SELECT
        rp.questao_codigo as questao,
        COUNT(DISTINCT CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') THEN rp.aluno_id END) as total_presentes,
        SUM(CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') AND rp.acertou = true THEN 1 ELSE 0 END) as acertos,
        SUM(CASE WHEN (rp.presenca = 'P' OR rp.presenca = 'p') AND (rp.acertou = false OR rp.acertou IS NULL) THEN 1 ELSE 0 END) as erros
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      ${whereClauseAcertosQuestao}
      GROUP BY rp.questao_codigo
      ORDER BY CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER)
    `
    const rowsQuestao = await safeQuery(pool, queryAcertosPorQuestao, paramsAcertosQuestao, 'fetchAcertosErros:questoes')

    if (rowsQuestao.length > 0) {
      const totalPresentes = parseDbInt(totaisAlunos.total_presentes)
      const totalFaltantes = parseDbInt(totaisAlunos.total_faltantes)
      const totalAlunos = parseDbInt(totaisAlunos.total_alunos)

      return {
        acertos_erros: rowsQuestao.map((r: any) => ({
          nome: `Q${r.questao.replace(/[^0-9]/g, '')}`,
          questao: r.questao,
          acertos: parseDbInt(r.acertos),
          erros: parseDbInt(r.erros),
          total_alunos: parseDbInt(r.total_presentes),
          tipo: 'questao'
        })),
        acertos_erros_meta: {
          tipo: 'por_questao',
          disciplina,
          total_questoes: rowsQuestao.length,
          total_alunos_cadastrados: totalAlunos,
          total_presentes: totalPresentes,
          total_faltantes: totalFaltantes
        }
      }
    }

    return { acertos_erros: [] }
  }

  // SEM DISCIPLINA: Comportamento original (agrupado por escola/turma)
  const getQuestoesSQL = (disc: string | null, campoSerie: string = 'rc.serie') => {
    const numeroSerie = `REGEXP_REPLACE(${campoSerie}::text, '[^0-9]', '', 'g')`
    if (disc === 'LP') return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 14 ELSE 20 END`
    if (disc === 'CH') return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE 10 END`
    if (disc === 'MAT') return `CASE WHEN ${numeroSerie} IN ('2', '3') THEN 14 ELSE 20 END`
    if (disc === 'CN') return `CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE 10 END`
    return `CASE
      WHEN ${numeroSerie} IN ('2', '3') THEN 28
      WHEN ${numeroSerie} = '5' THEN 34
      ELSE 60
    END`
  }

  const getAcertosSQL = (disc: string | null) => {
    const numeroSerie = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
    if (disc === 'LP') return `SUM(COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0))`
    if (disc === 'CH') return `SUM(CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) END)`
    if (disc === 'MAT') return `SUM(COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0))`
    if (disc === 'CN') return `SUM(CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0) END)`
    return `SUM(
      COALESCE(CAST(rc.total_acertos_lp AS INTEGER), 0) +
      COALESCE(CAST(rc.total_acertos_mat AS INTEGER), 0) +
      CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_ch AS INTEGER), 0) END +
      CASE WHEN ${numeroSerie} IN ('2', '3', '5') THEN 0 ELSE COALESCE(CAST(rc.total_acertos_cn AS INTEGER), 0) END
    )`
  }

  // Se escola selecionada, agrupar por série e turma
  if (isEscolaIdValida(escolaId)) {
    const query = `
      SELECT
        COALESCE(t.codigo, CONCAT('Série ', rc.serie)) as nome,
        rc.serie,
        t.codigo as turma_codigo,
        ${getAcertosSQL(null)} as total_acertos,
        SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
        COUNT(*) as total_alunos,
        SUM(${getQuestoesSQL(null)}) as total_questoes
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      ${whereClause}
      GROUP BY rc.serie, t.codigo, t.id
      ORDER BY rc.serie, t.codigo
    `
    const rows = await safeQuery(pool, query, params, 'fetchAcertosErros:turma')
    return {
      acertos_erros: rows.length > 0
        ? rows.map((r: any) => ({
            nome: r.nome || `Série ${r.serie}`,
            serie: r.serie,
            turma: r.turma_codigo || null,
            acertos: parseDbInt(r.total_acertos),
            erros: Math.max(0, parseDbInt(r.total_erros)),
            total_alunos: parseDbInt(r.total_alunos),
            total_questoes: parseDbInt(r.total_questoes)
          }))
        : []
    }
  }

  // Agrupar por escola
  const query = `
    SELECT
      e.nome as nome,
      ${getAcertosSQL(null)} as total_acertos,
      SUM(${getQuestoesSQL(null)}) - ${getAcertosSQL(null)} as total_erros,
      COUNT(*) as total_alunos,
      SUM(${getQuestoesSQL(null)}) as total_questoes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
    GROUP BY e.id, e.nome
    ORDER BY e.nome
    ${deveRemoverLimites ? '' : 'LIMIT 30'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchAcertosErros:escola')
  return {
    acertos_erros: rows.length > 0
      ? rows.map((r: any) => ({
          nome: r.nome,
          ...(!(isEscolaIdValida(escolaId)) && { escola: r.nome }),
          acertos: parseDbInt(r.total_acertos),
          erros: Math.max(0, parseDbInt(r.total_erros)),
          total_alunos: parseDbInt(r.total_alunos),
          total_questoes: parseDbInt(r.total_questoes)
        }))
      : []
  }
}

// ============================================================================
// GRÁFICO: QUESTÕES (Taxa de Acerto por Questão)
// ============================================================================

export async function fetchQuestoes(
  whereClause: string,
  params: any[],
  filtros: GraficosFiltros,
  usuario: Usuario,
  deveRemoverLimites: boolean
): Promise<any[]> {
  const { disciplina, anoLetivo, poloId, escolaId, serie, tipoEnsino } = filtros

  const whereQuestoes: string[] = []
  const paramsQuestoes: any[] = []
  let paramIndexQuestoes = 1

  if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    whereQuestoes.push(`rp.escola_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(usuario.escola_id)
    paramIndexQuestoes++
  } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    whereQuestoes.push(`e2.polo_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(usuario.polo_id)
    paramIndexQuestoes++
  }

  if (anoLetivo) {
    whereQuestoes.push(`rp.ano_letivo = $${paramIndexQuestoes}`)
    paramsQuestoes.push(anoLetivo)
    paramIndexQuestoes++
  }

  if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') && poloId) {
    whereQuestoes.push(`e2.polo_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(poloId)
    paramIndexQuestoes++
  }

  if ((usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico' || usuario.tipo_usuario === 'polo') &&
      isEscolaIdValida(escolaId)) {
    whereQuestoes.push(`rp.escola_id = $${paramIndexQuestoes}`)
    paramsQuestoes.push(escolaId)
    paramIndexQuestoes++
  }

  if (serie) {
    whereQuestoes.push(`rp.serie = $${paramIndexQuestoes}`)
    paramsQuestoes.push(serie)
    paramIndexQuestoes++
  }

  if (disciplina) {
    const disciplinaMap: Record<string, string> = {
      'LP': 'Língua Portuguesa',
      'MAT': 'Matemática',
      'CH': 'Ciências Humanas',
      'CN': 'Ciências da Natureza',
      'PT': 'Produção Textual'
    }
    const disciplinaNome = disciplinaMap[disciplina] || disciplina
    whereQuestoes.push(`rp.disciplina = $${paramIndexQuestoes}`)
    paramsQuestoes.push(disciplinaNome)
    paramIndexQuestoes++
  }

  if (tipoEnsino === 'anos_iniciais') {
    whereQuestoes.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
  } else if (tipoEnsino === 'anos_finais') {
    whereQuestoes.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
  }

  const questaoRangeFilter = getQuestaoRangeFilter(serie, disciplina, tipoEnsino)
  if (questaoRangeFilter) {
    whereQuestoes.push(questaoRangeFilter)
    log.debug('Filtro de range de questões aplicado', { data: { questaoRangeFilter } })
  }

  whereQuestoes.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)

  const whereClauseQuestoes = whereQuestoes.length > 0
    ? `WHERE ${whereQuestoes.join(' AND ')} AND rp.questao_codigo IS NOT NULL`
    : 'WHERE rp.questao_codigo IS NOT NULL'

  const query = `
    SELECT
      rp.questao_codigo as codigo,
      q.descricao,
      q.disciplina,
      q.area_conhecimento,
      COUNT(rp.id) as total_respostas,
      SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END) as total_acertos,
      ROUND(
        (SUM(CASE WHEN rp.acertou = true THEN 1 ELSE 0 END)::DECIMAL /
         NULLIF(COUNT(rp.id), 0)) * 100,
        2
      ) as taxa_acerto,
      CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) as numero_questao
    FROM resultados_provas rp
    LEFT JOIN questoes q ON rp.questao_codigo = q.codigo
    LEFT JOIN escolas e2 ON rp.escola_id = e2.id
    ${whereClauseQuestoes}
    GROUP BY rp.questao_codigo, q.descricao, q.disciplina, q.area_conhecimento
    ORDER BY CAST(REGEXP_REPLACE(rp.questao_codigo, '[^0-9]', '', 'g') AS INTEGER) ASC
    ${deveRemoverLimites ? '' : 'LIMIT 50'}
  `
  const rows = await safeQuery(pool, query, paramsQuestoes, 'fetchQuestoes')
  return rows.length > 0
    ? rows.map((r: any) => ({
        codigo: r.codigo,
        numero: parseDbInt(r.numero_questao),
        descricao: r.descricao || r.codigo,
        disciplina: r.disciplina,
        area_conhecimento: r.area_conhecimento,
        total_respostas: parseDbInt(r.total_respostas),
        total_acertos: parseDbInt(r.total_acertos),
        taxa_acerto: parseDbNumber(r.taxa_acerto)
      }))
    : []
}

// ============================================================================
// GRÁFICO: HEATMAP
// ============================================================================

export async function fetchHeatmap(whereClause: string, params: any[], deveRemoverLimites: boolean): Promise<any[]> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
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
    ? rows.map((r: any) => ({
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

// ============================================================================
// GRÁFICO: RADAR
// ============================================================================

async function fetchRadar(whereClause: string, params: any[], deveRemoverLimites: boolean): Promise<any[]> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

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
    ? rows.map((r: any) => ({
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
// GRÁFICO: BOXPLOT
// ============================================================================

export async function fetchBoxplot(whereClause: string, params: any[], disciplina: string | null): Promise<{ boxplot: any[]; boxplot_disciplina: string }> {
  const notaConfig = getCampoNota(disciplina)
  const whereBoxPlot = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`

  const query = `
    SELECT
      COALESCE(e.nome, rc.serie, 'Geral') as categoria,
      CAST(${notaConfig.campo} AS DECIMAL) as nota
    FROM resultados_consolidados_unificada rc
    LEFT JOIN escolas e ON rc.escola_id = e.id
    ${whereBoxPlot}
    ORDER BY categoria, nota
  `
  const rows = await safeQuery(pool, query, params, 'fetchBoxplot')

  const categorias: { [key: string]: number[] } = {}
  rows.forEach((r: any) => {
    const cat = r.categoria || 'Geral'
    if (!categorias[cat]) categorias[cat] = []
    const nota = parseFloat(r.nota)
    if (!isNaN(nota)) {
      categorias[cat].push(nota)
    }
  })

  const boxplotData = Object.keys(categorias).length > 0
    ? Object.entries(categorias)
      .filter(([_, notas]) => notas.length > 0)
      .map(([categoria, notas]) => {
        notas.sort((a, b) => a - b)
        const q1 = notas.length > 0 ? notas[Math.floor(notas.length * 0.25)] : 0
        const mediana = notas.length > 0 ? notas[Math.floor(notas.length * 0.5)] : 0
        const q3 = notas.length > 0 ? notas[Math.floor(notas.length * 0.75)] : 0
        const min = notas.length > 0 ? notas[0] : 0
        const max = notas.length > 0 ? notas[notas.length - 1] : 0
        const media = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0

        return {
          categoria,
          min: Math.round(min * 100) / 100,
          q1: Math.round(q1 * 100) / 100,
          mediana: Math.round(mediana * 100) / 100,
          q3: Math.round(q3 * 100) / 100,
          max: Math.round(max * 100) / 100,
          media: Math.round(media * 100) / 100,
          total: notas.length
        }
      })
      .slice(0, 20)
    : []

  return { boxplot: boxplotData, boxplot_disciplina: notaConfig.label }
}

// ============================================================================
// GRÁFICO: CORRELAÇÃO
// ============================================================================

export async function fetchCorrelacao(whereClause: string, params: any[], deveRemoverLimites: boolean): Promise<{ correlacao: any[]; correlacao_meta: any }> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

  const whereCorrelacaoFinais = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`

  const whereCorrelacaoIniciais = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_mat IS NOT NULL`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_mat IS NOT NULL`

  const queryFinais = `
    SELECT
      'anos_finais' as tipo,
      CAST(rc.nota_lp AS DECIMAL) as lp,
      CAST(rc.nota_ch AS DECIMAL) as ch,
      CAST(rc.nota_mat AS DECIMAL) as mat,
      CAST(rc.nota_cn AS DECIMAL) as cn,
      NULL::DECIMAL as pt
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereCorrelacaoFinais}
    ${deveRemoverLimites ? '' : 'LIMIT 500'}
  `

  const queryIniciais = `
    SELECT
      'anos_iniciais' as tipo,
      CAST(rc.nota_lp AS DECIMAL) as lp,
      NULL::DECIMAL as ch,
      CAST(rc.nota_mat AS DECIMAL) as mat,
      NULL::DECIMAL as cn,
      CAST(rc.nota_producao AS DECIMAL) as pt
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereCorrelacaoIniciais}
    ${deveRemoverLimites ? '' : 'LIMIT 500'}
  `

  const [rowsFinais, rowsIniciais] = await Promise.all([
    safeQuery(pool, queryFinais, params, 'fetchCorrelacao:finais'),
    safeQuery(pool, queryIniciais, params, 'fetchCorrelacao:iniciais')
  ])

  const dadosFinais = rowsFinais.map((r: any) => ({
    tipo: 'anos_finais',
    LP: parseDbNumber(r.lp),
    CH: parseDbNumber(r.ch),
    MAT: parseDbNumber(r.mat),
    CN: parseDbNumber(r.cn),
    PT: null
  }))

  const dadosIniciais = rowsIniciais.map((r: any) => ({
    tipo: 'anos_iniciais',
    LP: parseDbNumber(r.lp),
    CH: null,
    MAT: parseDbNumber(r.mat),
    CN: null,
    PT: r.pt ? parseDbNumber(r.pt) : null
  }))

  return {
    correlacao: [...dadosFinais, ...dadosIniciais],
    correlacao_meta: {
      tem_anos_finais: dadosFinais.length > 0,
      tem_anos_iniciais: dadosIniciais.length > 0,
      total_anos_finais: dadosFinais.length,
      total_anos_iniciais: dadosIniciais.length
    }
  }
}

// ============================================================================
// GRÁFICO: RANKING
// ============================================================================

export async function fetchRanking(
  whereClause: string,
  params: any[],
  filtros: GraficosFiltros,
  deveRemoverLimites: boolean
): Promise<{ ranking: any[]; ranking_disciplina: string; ranking_meta?: any }> {
  const tipoRanking = filtros.tipoRanking || 'escolas'
  const notaConfig = getCampoNota(filtros.disciplina)
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

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
          (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
        ELSE NULL END), 2) as media_ai,
        ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN
          (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
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
    const totalAnosIniciais = rows.reduce((acc: number, r: any) => acc + parseDbInt(r.count_anos_iniciais), 0)
    const totalAnosFinais = rows.reduce((acc: number, r: any) => acc + parseDbInt(r.count_anos_finais), 0)

    return {
      ranking: rows.length > 0
        ? rows.map((r: any, index: number) => ({
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
      ranking: rows.map((r: any, index: number) => ({
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

export async function fetchAprovacao(whereClause: string, params: any[], disciplina: string | null, deveRemoverLimites: boolean): Promise<{ aprovacao: any[]; aprovacao_disciplina: string }> {
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
      ? rows.map((r: any) => {
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

export async function fetchGaps(whereClause: string, params: any[], disciplina: string | null, deveRemoverLimites: boolean): Promise<{ gaps: any[]; gaps_disciplina: string }> {
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
      ? rows.map((r: any) => ({
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
// GRÁFICO: NÍVEIS POR DISCIPLINA
// ============================================================================

async function fetchNiveisDisciplina(whereClause: string, params: any[]): Promise<any> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

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
    const row = rows[0] as any
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

async function fetchMediasEtapa(whereClause: string, params: any[], deveRemoverLimites: boolean): Promise<{ medias_etapa: any[]; medias_etapa_totais: any }> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
  const mediaGeralCalc = getMediaGeralSQLLocal()

  const query = `
    SELECT
      COALESCE(e.nome, 'Geral') as escola,
      e.id as escola_id,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') THEN
        (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
      ELSE NULL END), 2) as media_ai,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN
        (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
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
    ? rows.map((r: any) => ({
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

  const totaisGerais = rows.reduce((acc: any, r: any) => ({
    total_ai: acc.total_ai + parseDbInt(r.total_ai),
    total_af: acc.total_af + parseDbInt(r.total_af),
    total_alunos: acc.total_alunos + parseDbInt(r.total_alunos)
  }), { total_ai: 0, total_af: 0, total_alunos: 0 })

  return { medias_etapa, medias_etapa_totais: totaisGerais }
}

// ============================================================================
// GRÁFICO: NÍVEIS POR TURMA
// ============================================================================

export async function fetchNiveisTurma(whereClause: string, params: any[], deveRemoverLimites: boolean): Promise<any[]> {
  const numeroSerieSQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`
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
    ? rows.map((r: any) => {
        const niveis = {
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

// ============================================================================
// ORQUESTRADOR PRINCIPAL
// ============================================================================

/**
 * Busca dados de gráficos de acordo com o tipo solicitado e filtros aplicados.
 */
export async function getGraficosData(usuario: Usuario, filtros: GraficosFiltros): Promise<GraficosResponse> {
  const { tipoGrafico, disciplina } = filtros

  log.info('Buscando dados de gráficos', { data: { tipoGrafico, disciplina } })

  const { whereClause, params, deveRemoverLimites } = buildGraficosFilters(usuario, filtros)

  // Buscar séries disponíveis
  const seriesDisponiveis = await fetchSeriesDisponiveis(usuario, filtros)

  const resultado: GraficosResponse = {
    series_disponiveis: seriesDisponiveis
  }

  // Gráfico Geral - Médias por Disciplina
  if (tipoGrafico === 'geral' || tipoGrafico === 'disciplinas') {
    const disciplinas = await fetchDisciplinas(whereClause, params, disciplina)
    if (disciplinas) resultado.disciplinas = disciplinas
  }

  // Gráfico por Escola
  if (tipoGrafico === 'geral' || tipoGrafico === 'escolas') {
    const escolas = await fetchEscolas(whereClause, params, disciplina)
    if (escolas) resultado.escolas = escolas
  }

  // Gráfico por Série
  if (tipoGrafico === 'geral' || tipoGrafico === 'series') {
    const series = await fetchSeries(whereClause, params, disciplina)
    if (series) resultado.series = series
  }

  // Gráfico por Polo
  if (tipoGrafico === 'geral' || tipoGrafico === 'polos') {
    const polos = await fetchPolos(whereClause, params, disciplina)
    if (polos) resultado.polos = polos
  }

  // Distribuição de Notas
  if (tipoGrafico === 'geral' || tipoGrafico === 'distribuicao') {
    const distribuicao = await fetchDistribuicao(whereClause, params, disciplina)
    if (distribuicao) resultado.distribuicao = distribuicao
  }

  // Taxa de Presença
  if (tipoGrafico === 'geral' || tipoGrafico === 'presenca') {
    const presenca = await fetchPresenca(whereClause, params)
    if (presenca) resultado.presenca = presenca
  }

  // Comparativo de Escolas Detalhado
  if (tipoGrafico === 'comparativo_escolas') {
    const comparativo = await fetchComparativoEscolas(whereClause, params, deveRemoverLimites)
    if (comparativo) resultado.comparativo_escolas = comparativo
  }

  // Gráfico de Acertos e Erros
  if (tipoGrafico === 'acertos_erros') {
    const acertosResult = await fetchAcertosErros(whereClause, params, filtros, usuario, deveRemoverLimites)
    resultado.acertos_erros = acertosResult.acertos_erros
    if (acertosResult.acertos_erros_meta) {
      resultado.acertos_erros_meta = acertosResult.acertos_erros_meta
    }
  }

  // Garantir que acertos_erros sempre seja um array
  if (tipoGrafico === 'acertos_erros' && !resultado.acertos_erros) {
    resultado.acertos_erros = []
  }

  // Taxa de Acerto por Questão
  if (tipoGrafico === 'questoes') {
    resultado.questoes = await fetchQuestoes(whereClause, params, filtros, usuario, deveRemoverLimites)
  }

  // Heatmap de Desempenho
  if (tipoGrafico === 'heatmap') {
    resultado.heatmap = await fetchHeatmap(whereClause, params, deveRemoverLimites)
  }

  // Radar Chart
  if (tipoGrafico === 'radar') {
    resultado.radar = await fetchRadar(whereClause, params, deveRemoverLimites)
  }

  // Box Plot
  if (tipoGrafico === 'boxplot') {
    const boxplotResult = await fetchBoxplot(whereClause, params, disciplina)
    resultado.boxplot = boxplotResult.boxplot
    resultado.boxplot_disciplina = boxplotResult.boxplot_disciplina
  }

  // Correlação entre Disciplinas
  if (tipoGrafico === 'correlacao') {
    const correlacaoResult = await fetchCorrelacao(whereClause, params, deveRemoverLimites)
    resultado.correlacao = correlacaoResult.correlacao
    resultado.correlacao_meta = correlacaoResult.correlacao_meta
  }

  // Ranking Interativo
  if (tipoGrafico === 'ranking') {
    const rankingResult = await fetchRanking(whereClause, params, filtros, deveRemoverLimites)
    resultado.ranking = rankingResult.ranking
    resultado.ranking_disciplina = rankingResult.ranking_disciplina
    if (rankingResult.ranking_meta) resultado.ranking_meta = rankingResult.ranking_meta
  }

  // Taxa de Aprovação Estimada
  if (tipoGrafico === 'aprovacao') {
    const aprovacaoResult = await fetchAprovacao(whereClause, params, disciplina, deveRemoverLimites)
    resultado.aprovacao = aprovacaoResult.aprovacao
    resultado.aprovacao_disciplina = aprovacaoResult.aprovacao_disciplina
  }

  // Análise de Gaps
  if (tipoGrafico === 'gaps') {
    const gapsResult = await fetchGaps(whereClause, params, disciplina, deveRemoverLimites)
    resultado.gaps = gapsResult.gaps
    resultado.gaps_disciplina = gapsResult.gaps_disciplina
  }

  // Distribuição de Níveis por Disciplina
  if (tipoGrafico === 'niveis_disciplina') {
    const niveisDisciplina = await fetchNiveisDisciplina(whereClause, params)
    if (niveisDisciplina) resultado.niveis_disciplina = niveisDisciplina
  }

  // Médias por Etapa de Ensino
  if (tipoGrafico === 'medias_etapa') {
    const mediasResult = await fetchMediasEtapa(whereClause, params, deveRemoverLimites)
    resultado.medias_etapa = mediasResult.medias_etapa
    resultado.medias_etapa_totais = mediasResult.medias_etapa_totais
  }

  // Distribuição de Níveis por Turma
  if (tipoGrafico === 'niveis_turma') {
    resultado.niveis_turma = await fetchNiveisTurma(whereClause, params, deveRemoverLimites)
  }

  log.info('Dados de gráficos gerados', { data: { tipoGrafico, keys: Object.keys(resultado) } })

  return resultado
}
