/**
 * Serviço centralizado de gráficos — Fachada
 *
 * Orquestra os submódulos de graficos/ e expõe a API pública.
 * Cada tipo de gráfico é tratado por um handler no Record GRAPH_HANDLERS.
 *
 * @module services/graficos
 */

import { createLogger } from '@/lib/logger'
import { Usuario } from '@/lib/types'

import type { GraficosFiltros, GraficosResponse } from './graficos/types'

import { buildGraficosFilters, fetchSeriesDisponiveis } from './graficos/helpers'
import { fetchDisciplinas, fetchEscolas, fetchSeries, fetchPolos, fetchDistribuicao, fetchPresenca, fetchComparativoEscolas } from './graficos/fetch-basicos'
import { fetchAcertosErros, fetchQuestoes, fetchHeatmap, fetchBoxplot, fetchCorrelacao } from './graficos/fetch-analise'
import { fetchRanking, fetchAprovacao, fetchGaps, fetchRadar, fetchNiveisDisciplina, fetchMediasEtapa, fetchNiveisTurma } from './graficos/fetch-avancados'

// Re-exports para manter compatibilidade com imports existentes
export { buildGraficosFilters } from './graficos/helpers'
export type { GraficosFiltros, GraficosResponse } from './graficos/types'

const log = createLogger('Graficos')

// ============================================================================
// GRAPH HANDLERS — Record<tipoGrafico, handler>
// ============================================================================

type HandlerArgs = {
  whereClause: string
  params: (string | null)[]
  disciplina: string | null
  deveRemoverLimites: boolean
  filtros: GraficosFiltros
  usuario: Usuario
}

type GraphHandler = (args: HandlerArgs) => Promise<Partial<GraficosResponse>>

/**
 * Handlers para o tipo 'geral' — executados quando tipoGrafico === 'geral'
 * ou quando o tipo específico é solicitado.
 */
const GERAL_HANDLERS: Record<string, GraphHandler> = {
  disciplinas: async ({ whereClause, params, disciplina }) => {
    const disciplinas = await fetchDisciplinas(whereClause, params, disciplina)
    return disciplinas ? { disciplinas } : {}
  },
  escolas: async ({ whereClause, params, disciplina }) => {
    const escolas = await fetchEscolas(whereClause, params, disciplina)
    return escolas ? { escolas } : {}
  },
  series: async ({ whereClause, params, disciplina }) => {
    const series = await fetchSeries(whereClause, params, disciplina)
    return series ? { series } : {}
  },
  polos: async ({ whereClause, params, disciplina }) => {
    const polos = await fetchPolos(whereClause, params, disciplina)
    return polos ? { polos } : {}
  },
  distribuicao: async ({ whereClause, params, disciplina }) => {
    const distribuicao = await fetchDistribuicao(whereClause, params, disciplina)
    return distribuicao ? { distribuicao } : {}
  },
  presenca: async ({ whereClause, params }) => {
    const presenca = await fetchPresenca(whereClause, params)
    return presenca ? { presenca } : {}
  },
}

/**
 * Handlers para tipos de gráfico específicos (não incluídos no 'geral').
 */
const SPECIFIC_HANDLERS: Record<string, GraphHandler> = {
  comparativo_escolas: async ({ whereClause, params, deveRemoverLimites }) => {
    const comparativo = await fetchComparativoEscolas(whereClause, params, deveRemoverLimites)
    return comparativo ? { comparativo_escolas: comparativo } : {}
  },
  acertos_erros: async ({ whereClause, params, filtros, usuario, deveRemoverLimites }) => {
    const acertosResult = await fetchAcertosErros(whereClause, params, filtros, usuario, deveRemoverLimites)
    const result: Partial<GraficosResponse> = {
      acertos_erros: acertosResult.acertos_erros ?? []
    }
    if (acertosResult.acertos_erros_meta) {
      result.acertos_erros_meta = acertosResult.acertos_erros_meta
    }
    return result
  },
  questoes: async ({ whereClause, params, filtros, usuario, deveRemoverLimites }) => ({
    questoes: await fetchQuestoes(whereClause, params, filtros, usuario, deveRemoverLimites)
  }),
  heatmap: async ({ whereClause, params, deveRemoverLimites }) => ({
    heatmap: await fetchHeatmap(whereClause, params, deveRemoverLimites)
  }),
  radar: async ({ whereClause, params, deveRemoverLimites }) => ({
    radar: await fetchRadar(whereClause, params, deveRemoverLimites)
  }),
  boxplot: async ({ whereClause, params, disciplina }) => {
    const boxplotResult = await fetchBoxplot(whereClause, params, disciplina)
    return {
      boxplot: boxplotResult.boxplot,
      boxplot_disciplina: boxplotResult.boxplot_disciplina
    }
  },
  correlacao: async ({ whereClause, params, deveRemoverLimites }) => {
    const correlacaoResult = await fetchCorrelacao(whereClause, params, deveRemoverLimites)
    return {
      correlacao: correlacaoResult.correlacao,
      correlacao_meta: correlacaoResult.correlacao_meta
    }
  },
  ranking: async ({ whereClause, params, filtros, deveRemoverLimites }) => {
    const rankingResult = await fetchRanking(whereClause, params, filtros, deveRemoverLimites)
    const result: Partial<GraficosResponse> = {
      ranking: rankingResult.ranking,
      ranking_disciplina: rankingResult.ranking_disciplina
    }
    if (rankingResult.ranking_meta) result.ranking_meta = rankingResult.ranking_meta
    return result
  },
  aprovacao: async ({ whereClause, params, disciplina, deveRemoverLimites }) => {
    const aprovacaoResult = await fetchAprovacao(whereClause, params, disciplina, deveRemoverLimites)
    return {
      aprovacao: aprovacaoResult.aprovacao,
      aprovacao_disciplina: aprovacaoResult.aprovacao_disciplina
    }
  },
  gaps: async ({ whereClause, params, disciplina, deveRemoverLimites }) => {
    const gapsResult = await fetchGaps(whereClause, params, disciplina, deveRemoverLimites)
    return {
      gaps: gapsResult.gaps,
      gaps_disciplina: gapsResult.gaps_disciplina
    }
  },
  niveis_disciplina: async ({ whereClause, params }) => {
    const niveisDisciplina = await fetchNiveisDisciplina(whereClause, params)
    return niveisDisciplina ? { niveis_disciplina: niveisDisciplina } : {}
  },
  medias_etapa: async ({ whereClause, params, deveRemoverLimites }) => {
    const mediasResult = await fetchMediasEtapa(whereClause, params, deveRemoverLimites)
    return {
      medias_etapa: mediasResult.medias_etapa,
      medias_etapa_totais: mediasResult.medias_etapa_totais
    }
  },
  niveis_turma: async ({ whereClause, params, deveRemoverLimites }) => ({
    niveis_turma: await fetchNiveisTurma(whereClause, params, deveRemoverLimites)
  }),
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

  const handlerArgs: HandlerArgs = {
    whereClause,
    params,
    disciplina,
    deveRemoverLimites,
    filtros,
    usuario
  }

  if (tipoGrafico === 'geral') {
    // Tipo 'geral': executar todos os handlers gerais
    const results = await Promise.all(
      Object.values(GERAL_HANDLERS).map((handler) => handler(handlerArgs))
    )
    results.forEach((partial) => Object.assign(resultado, partial))
  } else if (GERAL_HANDLERS[tipoGrafico]) {
    // Tipo específico que também faz parte do 'geral'
    const partial = await GERAL_HANDLERS[tipoGrafico](handlerArgs)
    Object.assign(resultado, partial)
  } else if (SPECIFIC_HANDLERS[tipoGrafico]) {
    // Tipo específico avançado
    const partial = await SPECIFIC_HANDLERS[tipoGrafico](handlerArgs)
    Object.assign(resultado, partial)
  }

  log.info('Dados de gráficos gerados', { data: { tipoGrafico, keys: Object.keys(resultado) } })

  return resultado
}
