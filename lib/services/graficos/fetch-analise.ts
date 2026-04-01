/**
 * Funções fetch de gráficos de análise
 *
 * Contém: fetchAcertosErros, fetchQuestoes, fetchHeatmap, fetchBoxplot, fetchCorrelacao
 *
 * @module services/graficos/fetch-analise
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { Usuario } from '@/lib/types'

import type {
  GraficosFiltros,
  AcertosErrosItem,
  AcertosErrosMeta,
  QuestaoItem,
  HeatmapItem,
  BoxplotItem,
  CorrelacaoItem,
  CorrelacaoMeta,
} from './types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getCampoNota,
  getMediaGeralSQLLocal,
  getQuestaoRangeFilter,
  isEscolaIdValida,
} from './helpers'

const log = createLogger('Graficos')

// ============================================================================
// GRÁFICO: ACERTOS E ERROS
// ============================================================================

export async function fetchAcertosErros(
  whereClause: string,
  params: (string | null)[],
  filtros: GraficosFiltros,
  usuario: Usuario,
  deveRemoverLimites: boolean
): Promise<{ acertos_erros: AcertosErrosItem[]; acertos_erros_meta?: AcertosErrosMeta }> {
  const { disciplina, anoLetivo, poloId, escolaId, serie, turmaId, tipoEnsino } = filtros

  // SE DISCIPLINA ESPECÍFICA: Mostrar acertos/erros POR QUESTÃO
  if (disciplina) {
    const whereAcertosQuestao: string[] = []
    const paramsAcertosQuestao: (string | null)[] = []
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
      whereAcertosQuestao.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`)
    } else if (tipoEnsino === 'anos_finais') {
      whereAcertosQuestao.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`)
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
        acertos_erros: rowsQuestao.map((r) => ({
          nome: `Q${String(r.questao ?? '').replace(/[^0-9]/g, '')}`,
          questao: String(r.questao ?? ''),
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
    const numeroSerie = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
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
        ? rows.map((r) => ({
            nome: String(r.nome ?? '') || `Série ${r.serie}`,
            serie: String(r.serie ?? ''),
            turma: r.turma_codigo ? String(r.turma_codigo) : null,
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
      ? rows.map((r) => ({
          nome: String(r.nome ?? ''),
          ...(!(isEscolaIdValida(escolaId)) && { escola: String(r.nome ?? '') }),
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
  params: (string | null)[],
  filtros: GraficosFiltros,
  usuario: Usuario,
  deveRemoverLimites: boolean
): Promise<QuestaoItem[]> {
  const { disciplina, anoLetivo, poloId, escolaId, serie, tipoEnsino } = filtros

  const whereQuestoes: string[] = []
  const paramsQuestoes: (string | null)[] = []
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
    whereQuestoes.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`)
  } else if (tipoEnsino === 'anos_finais') {
    whereQuestoes.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`)
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
    ? rows.map((r) => ({
        codigo: String(r.codigo ?? ''),
        numero: parseDbInt(r.numero_questao),
        descricao: String(r.descricao ?? r.codigo ?? ''),
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

// ============================================================================
// GRÁFICO: BOXPLOT
// ============================================================================

export async function fetchBoxplot(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<{ boxplot: BoxplotItem[]; boxplot_disciplina: string }> {
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
  rows.forEach((r) => {
    const cat = String(r.categoria ?? 'Geral')
    if (!categorias[cat]) categorias[cat] = []
    const nota = parseFloat(String(r.nota))
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

export async function fetchCorrelacao(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<{ correlacao: CorrelacaoItem[]; correlacao_meta: CorrelacaoMeta }> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

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

  const dadosFinais: CorrelacaoItem[] = rowsFinais.map((r) => ({
    tipo: 'anos_finais',
    LP: parseDbNumber(r.lp),
    CH: parseDbNumber(r.ch),
    MAT: parseDbNumber(r.mat),
    CN: parseDbNumber(r.cn),
    PT: null
  }))

  const dadosIniciais: CorrelacaoItem[] = rowsIniciais.map((r) => ({
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
