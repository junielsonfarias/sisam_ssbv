/**
 * Cache Module
 *
 * Consolidates all cache implementations:
 * - memory: In-memory LRU cache for server-side use
 * - file: File-based persistent cache for server-side use
 * - session: SessionStorage cache for client-side use
 */

// In-memory cache (server-side)
export {
  memoryCache,
  CACHE_TTL,
  getCacheKeyDashboard,
  getCacheKeyFiltros,
  getCacheKeyMetricas,
  withCache,
  invalidateDashboardCache,
  invalidateFiltrosCache,
  type CacheType
} from './memory'

// File-based cache (server-side)
export {
  verificarCache,
  carregarCache,
  salvarCache,
  limparTodosOsCaches,
  obterInfoCaches,
  limparCacheEspecifico,
  limparCachesExpirados,
  obterInfoCache
} from './file'

// Session storage cache (client-side)
export {
  isCacheValid,
  getCache,
  saveCache,
  clearCache,
  syncDashboardData,
  getCachedEstatisticas,
  getCachedEscolas,
  getCachedTurmas,
  getCachedPolos,
  getCachedSeries,
  getCachedTipoUsuario,
  type DashboardCache
} from './session'
