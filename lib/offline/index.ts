/**
 * Armazenamento offline — barrel export.
 * Estrutura interna (decomposta em 2026-05-31 — antes era 1 arquivo de 966 linhas):
 *   types.ts    — interfaces e STORAGE_KEYS
 *   internal.ts — helpers privados (saveToStorage, readFromStorage, clearOldData)
 *   modulo.ts   — gestão do módulo ativo
 *   entities.ts — CRUDs (User, Polos, Escolas, Turmas, Resultados, ConfigSeries)
 *   sync.ts     — sincronização + estado + limpeza
 *   queries.ts  — filtros + estatísticas + listagens derivadas
 */
export * from './types'
export { isOnline, isStorageAvailable, getStorageUsage } from './internal'
export { saveModuloAtivo, getModuloAtivo, hasModuloAtivo, clearModuloAtivo } from './modulo'
export {
  saveUser, getUser, clearUser,
  savePolosAsync, savePolos, getPolosAsync, getPolos,
  saveEscolasAsync, saveEscolas, getEscolasAsync, getEscolas,
  saveTurmasAsync, saveTurmas, getTurmasAsync, getTurmas,
  saveResultadosAsync, saveResultados, getResultadosAsync, getResultados,
  saveConfigSeriesAsync, saveConfigSeries, getConfigSeriesAsync, getConfigSeries,
  getConfigSerieBySerie, getConfigSerieBySeriAsync,
} from './entities'
export {
  setSyncDate, getSyncDate, setSyncStatus, getSyncStatus,
  hasOfflineData, clearAllOfflineDataAsync, clearAllOfflineData, syncOfflineData,
} from './sync'
export {
  filterResultados, calcularEstatisticas, getResultadoByAlunoId, getEstatisticasAluno,
  getSeries, getAnosLetivos, filterTurmas,
} from './queries'
