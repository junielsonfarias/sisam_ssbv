/**
 * Módulo de gráficos — barrel export
 *
 * Re-exporta tipos, helpers e todas as funções fetch dos submódulos.
 *
 * @module services/graficos
 */

// Tipos
export type {
  DbValue,
  DbRow,
  GraficosFiltros,
  DisciplinasDataSingle,
  DisciplinasDataAll,
  DisciplinasData,
  LabelDadosTotaisData,
  EscolasData,
  DistribuicaoData,
  PresencaData,
  ComparativoEscolasData,
  AcertosErrosQuestaoItem,
  AcertosErrosAgregadoItem,
  AcertosErrosItem,
  AcertosErrosMeta,
  QuestaoItem,
  HeatmapItem,
  RadarItem,
  BoxplotItem,
  CorrelacaoItem,
  CorrelacaoMeta,
  RankingEscolaItem,
  RankingTurmaItem,
  RankingItem,
  RankingMeta,
  AprovacaoItem,
  GapsItem,
  NiveisCounts,
  NiveisDisciplinaData,
  MediasEtapaItem,
  MediasEtapaTotais,
  NiveisTurmaItem,
  GraficosResponse,
  BuildFiltersResult,
} from './types'

// Helpers
export {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getQuestaoRangeFilter,
  getMediaGeralSQLLocal,
  getCampoNota,
  isEscolaIdValida,
  buildGraficosFilters,
  fetchSeriesDisponiveis,
} from './helpers'

// Fetch básicos
export {
  fetchDisciplinas,
  fetchEscolas,
  fetchSeries,
  fetchPolos,
  fetchDistribuicao,
  fetchPresenca,
  fetchComparativoEscolas,
} from './fetch-basicos'

// Fetch análise
export {
  fetchAcertosErros,
  fetchQuestoes,
  fetchHeatmap,
  fetchBoxplot,
  fetchCorrelacao,
} from './fetch-analise'

// Fetch avançados
export {
  fetchRanking,
  fetchAprovacao,
  fetchGaps,
  fetchRadar,
  fetchNiveisDisciplina,
  fetchMediasEtapa,
  fetchNiveisTurma,
} from './fetch-avancados'
