/**
 * Serviço centralizado de estatísticas — Fachada
 *
 * Re-exporta tudo de lib/services/estatisticas/ para compatibilidade.
 *
 * @module services/estatisticas.service
 */

export {
  getEstatisticas,
  getEstatisticasPadrao,
  determinarEscopo,
  montarFiltroEscopo,
} from './estatisticas/index'

export type {
  EscopoEstatisticas,
  FiltrosEstatisticas,
  EstatisticasGerais,
  QueryResult,
} from './estatisticas/index'
