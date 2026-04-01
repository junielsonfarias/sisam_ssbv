/**
 * Armazenamento offline — barrel export
 * Re-exporta tipos de ./types e funções de ../offline-storage
 */
export * from './types'
export {
  // Módulo ativo
  saveModuloAtivo,
  getModuloAtivo,
  hasModuloAtivo,
  clearModuloAtivo,
  // Utilidades
  isOnline,
  isStorageAvailable,
  getStorageUsage,
  // Usuário
  saveUser,
  getUser,
  clearUser,
  // Polos
  savePolosAsync,
  savePolos,
  getPolosAsync,
  getPolos,
  // Escolas
  saveEscolasAsync,
  saveEscolas,
  getEscolasAsync,
  getEscolas,
  // Turmas
  saveTurmasAsync,
  saveTurmas,
  getTurmasAsync,
  getTurmas,
  // Resultados
  saveResultadosAsync,
  saveResultados,
  getResultadosAsync,
  getResultados,
  // Config Séries
  saveConfigSeriesAsync,
  saveConfigSeries,
  getConfigSeriesAsync,
  getConfigSeries,
  getConfigSerieBySerie,
  getConfigSerieBySeriAsync,
  // Sincronização
  setSyncDate,
  getSyncDate,
  setSyncStatus,
  getSyncStatus,
  hasOfflineData,
  clearAllOfflineDataAsync,
  clearAllOfflineData,
  syncOfflineData,
  // Filtros e Análise
  filterResultados,
  calcularEstatisticas,
  getResultadoByAlunoId,
  getEstatisticasAluno,
  getSeries,
  getAnosLetivos,
  filterTurmas,
} from '../offline-storage'
