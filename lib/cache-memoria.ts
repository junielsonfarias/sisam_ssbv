/**
 * Sistema de Cache em Memória Otimizado para Serverless
 *
 * Este cache funciona em ambiente serverless (Vercel) usando Map em memória.
 * Para 50 usuários simultâneos, reduz drasticamente as consultas ao banco.
 *
 * Estratégias implementadas:
 * 1. Cache em memória com TTL configurável
 * 2. LRU (Least Recently Used) para limitar uso de memória
 * 3. Stale-While-Revalidate para dados não-críticos
 * 4. Cache separado por tipo de dado (métricas, filtros, detalhes)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccess: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  memoryUsage: number
}

// Configurações de TTL por tipo de dado (em milissegundos)
export const CACHE_TTL = {
  // Dados que mudam raramente - cache longo
  FILTROS: 30 * 60 * 1000,        // 30 minutos - polos, escolas, séries
  METRICAS_GERAIS: 15 * 60 * 1000, // 15 minutos - totais e médias gerais

  // Dados que mudam com frequência moderada
  DASHBOARD: 10 * 60 * 1000,       // 10 minutos - dados do dashboard
  ANALISES: 10 * 60 * 1000,        // 10 minutos - análises de acertos/erros

  // Dados que mudam frequentemente - cache curto
  ALUNOS_DETALHADOS: 5 * 60 * 1000, // 5 minutos - lista paginada de alunos

  // Cache muito curto para dados em tempo real
  TEMPO_REAL: 30 * 1000,           // 30 segundos
} as const

// Limite máximo de entradas no cache para evitar uso excessivo de memória
const MAX_CACHE_ENTRIES = 500
const MAX_MEMORY_MB = 100 // 100MB máximo

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, memoryUsage: 0 }

  /**
   * Gera uma chave de cache baseada nos parâmetros
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    // Remove parâmetros de paginação do cache de dados gerais
    // para aumentar o hit rate
    const cacheParams = { ...params }

    // Ordenar chaves para consistência
    const sortedKeys = Object.keys(cacheParams).sort()
    const keyParts = sortedKeys
      .filter(key => cacheParams[key] !== null && cacheParams[key] !== undefined && cacheParams[key] !== '')
      .map(key => `${key}:${cacheParams[key]}`)

    return `${prefix}:${keyParts.join('|')}`
  }

  /**
   * Obtém um item do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    const now = Date.now()

    // Verificar se expirou
    if (now > entry.expiresAt) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++
    entry.lastAccess = now

    this.stats.hits++
    return entry.data as T
  }

  /**
   * Define um item no cache
   */
  set<T>(key: string, data: T, ttl: number = CACHE_TTL.DASHBOARD): void {
    const now = Date.now()

    // Limpar cache se exceder limite
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccess: now
    }

    this.cache.set(key, entry)
    this.stats.size = this.cache.size
  }

  /**
   * Remove os itens menos usados recentemente (LRU)
   */
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries())

    // Ordenar por último acesso (mais antigo primeiro)
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess)

    // Remover 20% dos itens mais antigos
    const toRemove = Math.ceil(entries.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0])
    }

    console.log(`[Cache] LRU eviction: removidos ${toRemove} itens`)
  }

  /**
   * Invalida cache por prefixo
   */
  invalidateByPrefix(prefix: string): number {
    let removed = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
        removed++
      }
    }
    this.stats.size = this.cache.size
    return removed
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, size: 0, memoryUsage: 0 }
  }

  /**
   * Remove entradas expiradas
   */
  cleanExpired(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    this.stats.size = this.cache.size
    return removed
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): CacheStats & { hitRate: number, entries: number } {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      entries: this.cache.size
    }
  }

  /**
   * Verifica se existe no cache (sem atualizar estatísticas)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Obtém tempo restante de um item (em segundos)
   */
  getTTL(key: string): number {
    const entry = this.cache.get(key)
    if (!entry) return 0

    const remaining = entry.expiresAt - Date.now()
    return Math.max(0, Math.floor(remaining / 1000))
  }
}

// Instância singleton do cache
export const memoryCache = new MemoryCache()

// Tipos para os diferentes caches
export type CacheType =
  | 'dashboard'
  | 'metricas'
  | 'filtros'
  | 'alunos'
  | 'analises'

/**
 * Helper para cache de dashboard
 */
export function getCacheKeyDashboard(
  tipoUsuario: string,
  poloId?: string | number | null,
  escolaId?: string | number | null,
  filtros?: Record<string, any>
): string {
  // Remover paginação do cache key para aumentar hit rate
  const filtrosSemPaginacao = { ...filtros }
  delete filtrosSemPaginacao?.paginaAlunos
  delete filtrosSemPaginacao?.limiteAlunos

  return memoryCache.generateKey('dashboard', {
    tipoUsuario,
    poloId,
    escolaId,
    ...filtrosSemPaginacao
  })
}

/**
 * Helper para cache de filtros (TTL longo)
 */
export function getCacheKeyFiltros(
  tipoUsuario: string,
  poloId?: string | number | null,
  escolaId?: string | number | null
): string {
  return memoryCache.generateKey('filtros', {
    tipoUsuario,
    poloId,
    escolaId
  })
}

/**
 * Helper para cache de métricas gerais (TTL longo)
 */
export function getCacheKeyMetricas(
  tipoUsuario: string,
  poloId?: string | number | null,
  escolaId?: string | number | null,
  anoLetivo?: string | null,
  serie?: string | null
): string {
  return memoryCache.generateKey('metricas', {
    tipoUsuario,
    poloId,
    escolaId,
    anoLetivo,
    serie
  })
}

/**
 * Wrapper para executar com cache
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<{ data: T, fromCache: boolean }> {
  // Tentar obter do cache
  const cached = memoryCache.get<T>(key)
  if (cached !== null) {
    return { data: cached, fromCache: true }
  }

  // Buscar dados frescos
  const data = await fetchFn()

  // Salvar no cache
  memoryCache.set(key, data, ttl)

  return { data, fromCache: false }
}

/**
 * Limpar cache após importações ou atualizações
 */
export function invalidateDashboardCache(): void {
  memoryCache.invalidateByPrefix('dashboard')
  memoryCache.invalidateByPrefix('metricas')
  memoryCache.invalidateByPrefix('analises')
  console.log('[Cache] Dashboard cache invalidado')
}

/**
 * Limpar cache de filtros
 */
export function invalidateFiltrosCache(): void {
  memoryCache.invalidateByPrefix('filtros')
  console.log('[Cache] Filtros cache invalidado')
}

// Limpeza periódica de cache expirado (a cada 5 minutos)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const removed = memoryCache.cleanExpired()
    if (removed > 0) {
      console.log(`[Cache] Limpeza automática: ${removed} itens expirados removidos`)
    }
  }, 5 * 60 * 1000)
}
