/**
 * Serviço centralizado do Dashboard — Fachada
 *
 * Re-exporta tipos, filtros, queries e análise dos submódulos.
 * Mantém a função orquestradora getDashboardData.
 *
 * @module services/dashboard
 */

import { createLogger } from '@/lib/logger'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import type { Usuario } from '@/lib/types'

// Re-exports de todos os submódulos
export * from './dashboard/types'
export * from './dashboard/filters'
export * from './dashboard/queries'
export * from './dashboard/analise'

// Imports internos para o orquestrador
import { buildDashboardFilters } from './dashboard/filters'
import {
  fetchDashboardMetricas,
  fetchDashboardNiveis,
  fetchMediasPorSerie,
  fetchMediasPorPolo,
  fetchMediasPorEscola,
  fetchMediasPorTurma,
  fetchFaixasNota,
  fetchPresenca,
  fetchTopAlunos,
  fetchAlunosDetalhados,
  fetchFiltrosDisponiveis,
} from './dashboard/queries'
import { fetchAnaliseAcertosErros, fetchResumosPorSerie } from './dashboard/analise'
import type {
  DashboardFiltros,
  PaginacaoAlunos,
  DashboardResponse,
  MetricasDbRow,
  NivelDbRow,
  MediaSerieDbRow,
  MediaPoloDbRow,
  MediaEscolaDbRow,
  MediaTurmaDbRow,
  FaixaNotaDbRow,
  PresencaDbRow,
  TaxaAcertoGeral,
} from './dashboard/types'

const log = createLogger('Dashboard')

// ============================================================================
// ORQUESTRADOR PRINCIPAL
// ============================================================================

/**
 * Busca todos os dados do dashboard em paralelo.
 * Orquestrador principal que chama todas as funções de fetch.
 */
export async function getDashboardData(
  usuario: Usuario,
  filtros: DashboardFiltros,
  paginacao: PaginacaoAlunos
): Promise<DashboardResponse> {
  log.info('Buscando dados do dashboard', { userId: usuario.id })

  const filters = buildDashboardFilters(usuario, filtros)
  const {
    whereClause, whereClauseBase, params, paramsBase,
    joinNivelAprendizagem, rpWhereClauseComPresenca, rpParams,
    rpWhereClauseSemSerie, rpParamsSemSerie
  } = filters

  // Executar todas as queries em paralelo
  const [
    metricasRows,
    niveisRows,
    mediasPorSerieRows,
    mediasPorPoloRows,
    mediasPorEscolaRows,
    mediasPorTurmaRows,
    faixasNotaRows,
    presencaRows,
    topAlunosRows,
    alunosResult,
    filtrosDisp,
    analise,
    resumos
  ] = await Promise.all([
    fetchDashboardMetricas(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchDashboardNiveis(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorSerie(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorPolo(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorEscola(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorTurma(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchFaixasNota(whereClause, params, joinNivelAprendizagem, filtros.presenca),
    fetchPresenca(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchTopAlunos(whereClause, params, filtros.presenca),
    fetchAlunosDetalhados(whereClause, params, paginacao, filtros.presenca),
    fetchFiltrosDisponiveis(filters),
    fetchAnaliseAcertosErros(rpWhereClauseComPresenca, rpParams),
    fetchResumosPorSerie(rpWhereClauseSemSerie, rpParamsSemSerie, filtros.serie)
  ])

  const metricas: Partial<MetricasDbRow> = metricasRows[0] || {}
  const taxaAcertoGeral: Partial<TaxaAcertoGeral> = analise.taxaAcertoGeral || {}

  // Montar resposta
  return {
    metricas: {
      total_alunos: parseDbInt(metricas.total_alunos),
      total_escolas: parseDbInt(metricas.total_escolas),
      total_turmas: parseDbInt(metricas.total_turmas),
      total_polos: parseDbInt(metricas.total_polos),
      total_presentes: parseDbInt(metricas.total_presentes),
      total_faltantes: parseDbInt(metricas.total_faltantes),
      media_geral: parseDbNumber(metricas.media_geral),
      media_lp: parseDbNumber(metricas.media_lp),
      media_mat: parseDbNumber(metricas.media_mat),
      media_ch: parseDbNumber(metricas.media_ch),
      media_cn: parseDbNumber(metricas.media_cn),
      media_producao: parseDbNumber(metricas.media_producao),
      menor_media: parseDbNumber(metricas.menor_media),
      maior_media: parseDbNumber(metricas.maior_media),
      taxa_presenca: parseDbInt(metricas.total_alunos) > 0
        ? Math.round((parseDbInt(metricas.total_presentes) / parseDbInt(metricas.total_alunos)) * 100)
        : 0,
      total_respostas: parseDbInt(taxaAcertoGeral.total_respostas),
      total_acertos: parseDbInt(taxaAcertoGeral.total_acertos),
      total_erros: parseDbInt(taxaAcertoGeral.total_erros),
      taxa_acerto_geral: parseDbNumber(taxaAcertoGeral.taxa_acerto_geral),
      taxa_erro_geral: parseDbNumber(taxaAcertoGeral.taxa_erro_geral)
    },
    niveis: niveisRows.map((row: NivelDbRow) => ({
      nivel: row.nivel,
      quantidade: parseDbInt(row.quantidade)
    })),
    mediasPorSerie: mediasPorSerieRows.map((row: MediaSerieDbRow) => {
      const numeroSerie = row.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciais = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
      const isAnosFinais = numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9'

      return {
        serie: row.serie,
        total_alunos: parseDbInt(row.total_alunos),
        presentes: parseDbInt(row.presentes),
        media_geral: parseDbNumber(row.media_geral),
        media_lp: parseDbNumber(row.media_lp),
        media_mat: parseDbNumber(row.media_mat),
        media_ch: isAnosFinais ? (parseDbNumber(row.media_ch)) : null,
        media_cn: isAnosFinais ? (parseDbNumber(row.media_cn)) : null,
        media_prod: isAnosIniciais ? (parseDbNumber(row.media_prod)) : null
      }
    }),
    mediasPorPolo: mediasPorPoloRows.map((row: MediaPoloDbRow) => ({
      polo_id: row.polo_id,
      polo: row.polo,
      total_alunos: parseDbInt(row.total_alunos),
      media_geral: parseDbNumber(row.media_geral),
      media_lp: parseDbNumber(row.media_lp),
      media_mat: parseDbNumber(row.media_mat),
      presentes: parseDbInt(row.presentes),
      faltantes: parseDbInt(row.faltantes)
    })),
    mediasPorEscola: mediasPorEscolaRows.map((row: MediaEscolaDbRow) => {
      const numeroSerieFiltro = filtros.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciaisFiltro = numeroSerieFiltro === '2' || numeroSerieFiltro === '3' || numeroSerieFiltro === '5'
      const isAnosFinaisFiltro = numeroSerieFiltro === '6' || numeroSerieFiltro === '7' || numeroSerieFiltro === '8' || numeroSerieFiltro === '9'

      return {
        escola_id: row.escola_id,
        escola: row.escola,
        polo: row.polo,
        total_turmas: parseDbInt(row.total_turmas),
        total_alunos: parseDbInt(row.total_alunos),
        media_geral: parseDbNumber(row.media_geral),
        media_lp: parseDbNumber(row.media_lp),
        media_mat: parseDbNumber(row.media_mat),
        media_ch: (!filtros.serie || isAnosFinaisFiltro) ? (parseDbNumber(row.media_ch)) : null,
        media_cn: (!filtros.serie || isAnosFinaisFiltro) ? (parseDbNumber(row.media_cn)) : null,
        media_prod: (!filtros.serie || isAnosIniciaisFiltro) ? (parseDbNumber(row.media_prod)) : null,
        presentes: parseDbInt(row.presentes),
        faltantes: parseDbInt(row.faltantes)
      }
    }),
    mediasPorTurma: mediasPorTurmaRows.map((row: MediaTurmaDbRow) => {
      const numeroSerieTurma = row.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciaisTurma = numeroSerieTurma === '2' || numeroSerieTurma === '3' || numeroSerieTurma === '5'
      const isAnosFinaisTurma = numeroSerieTurma === '6' || numeroSerieTurma === '7' || numeroSerieTurma === '8' || numeroSerieTurma === '9'

      return {
        turma_id: row.turma_id,
        turma: row.turma,
        escola: row.escola,
        serie: row.serie,
        total_alunos: parseDbInt(row.total_alunos),
        media_geral: parseDbNumber(row.media_geral),
        media_lp: parseDbNumber(row.media_lp),
        media_mat: parseDbNumber(row.media_mat),
        media_ch: isAnosFinaisTurma ? (parseDbNumber(row.media_ch)) : null,
        media_cn: isAnosFinaisTurma ? (parseDbNumber(row.media_cn)) : null,
        media_prod: isAnosIniciaisTurma ? (parseDbNumber(row.media_prod)) : null,
        presentes: parseDbInt(row.presentes),
        faltantes: parseDbInt(row.faltantes)
      }
    }),
    faixasNota: faixasNotaRows.map((row: FaixaNotaDbRow) => ({
      faixa: row.faixa,
      quantidade: parseDbInt(row.quantidade)
    })),
    presenca: presencaRows.map((row: PresencaDbRow) => ({
      status: row.status,
      quantidade: parseDbInt(row.quantidade)
    })),
    topAlunos: topAlunosRows,
    alunosDetalhados: alunosResult.alunos,
    paginacaoAlunos: {
      paginaAtual: paginacao.pagina,
      itensPorPagina: paginacao.limite,
      totalItens: alunosResult.total,
      totalPaginas: Math.ceil(alunosResult.total / paginacao.limite)
    },
    filtros: filtrosDisp,
    analiseAcertosErros: analise,
    resumosPorSerie: resumos
  }
}
