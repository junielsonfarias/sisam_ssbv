/**
 * SISAM - Configuração de Séries — Barrel
 *
 * Re-exporta todas as funções dos submódulos.
 *
 * @module config-series
 */

export { extrairNumeroSerie, isAnosIniciais, serieTemCHCN, serieTemProducaoTextual } from './utils'
export { carregarConfigSeries, obterConfigSerie, gerarAreasQuestoes, limparCacheConfigSeries } from './config'
export {
  carregarNiveisAprendizagem,
  calcularNivelAprendizagem,
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelPorNota,
  nivelParaValor,
  valorParaNivel,
  calcularNivelAluno,
  getCorNivel,
} from './niveis'
export { getColunasProducao, extrairNotaProducao, calcularMediaProducao } from './producao'
