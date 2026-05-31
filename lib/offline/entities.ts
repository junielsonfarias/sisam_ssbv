/**
 * CRUDs offline de cada entidade (User, Polos, Escolas, Turmas, Resultados,
 * ConfigSeries). Cada entidade tem versão sync (apenas localStorage) e async
 * (localStorage + IndexedDB). A versão sync é mantida para compatibilidade
 * com código legado; a async é a recomendada quando o caller pode aguardar.
 */
import { offlineDB, STORES as IDB_STORES, isIndexedDBAvailable } from '../offline-db'
import { readFromStorage, saveToStorage } from './internal'
import {
  OfflineConfigSerie, OfflineEscola, OfflinePolo, OfflineResultado, OfflineTurma,
  OfflineUser, STORAGE_KEYS,
} from './types'

// ============================================================================
// USUÁRIO
// ============================================================================
export function saveUser(user: OfflineUser): boolean {
  return saveToStorage(STORAGE_KEYS.USER, user)
}

export function getUser(): OfflineUser | null {
  return readFromStorage<OfflineUser>(STORAGE_KEYS.USER)
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER)
}

// ============================================================================
// POLOS
// ============================================================================
export async function savePolosAsync(polos: OfflinePolo[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.POLOS, polos, true)
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.POLOS, polos.map(p => ({ ...p, id: p.id })))
      console.log('[OfflineStorage] Polos salvos no IndexedDB:', polos.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar polos no IndexedDB:', error)
    }
  }
  return localSaved
}

export function savePolos(polos: OfflinePolo[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.POLOS, polos, true)
  savePolosAsync(polos).catch(console.error)
  return result
}

export async function getPolosAsync(): Promise<OfflinePolo[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflinePolo>(IDB_STORES.POLOS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Polos carregados do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler polos do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflinePolo[]>(STORAGE_KEYS.POLOS) || []
}

export function getPolos(): OfflinePolo[] {
  return readFromStorage<OfflinePolo[]>(STORAGE_KEYS.POLOS) || []
}

// ============================================================================
// ESCOLAS
// ============================================================================
export async function saveEscolasAsync(escolas: OfflineEscola[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.ESCOLAS, escolas, true)
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.ESCOLAS, escolas.map(e => ({ ...e, id: e.id })))
      console.log('[OfflineStorage] Escolas salvas no IndexedDB:', escolas.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar escolas no IndexedDB:', error)
    }
  }
  return localSaved
}

export function saveEscolas(escolas: OfflineEscola[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.ESCOLAS, escolas, true)
  saveEscolasAsync(escolas).catch(console.error)
  return result
}

export async function getEscolasAsync(): Promise<OfflineEscola[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineEscola>(IDB_STORES.ESCOLAS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Escolas carregadas do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler escolas do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineEscola[]>(STORAGE_KEYS.ESCOLAS) || []
}

export function getEscolas(): OfflineEscola[] {
  return readFromStorage<OfflineEscola[]>(STORAGE_KEYS.ESCOLAS) || []
}

// ============================================================================
// TURMAS
// ============================================================================
export async function saveTurmasAsync(turmas: OfflineTurma[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.TURMAS, turmas, true)
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.TURMAS, turmas.map(t => ({ ...t, id: t.id })))
      console.log('[OfflineStorage] Turmas salvas no IndexedDB:', turmas.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar turmas no IndexedDB:', error)
    }
  }
  return localSaved
}

export function saveTurmas(turmas: OfflineTurma[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.TURMAS, turmas, true)
  saveTurmasAsync(turmas).catch(console.error)
  return result
}

export async function getTurmasAsync(): Promise<OfflineTurma[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineTurma>(IDB_STORES.TURMAS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Turmas carregadas do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler turmas do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineTurma[]>(STORAGE_KEYS.TURMAS) || []
}

export function getTurmas(): OfflineTurma[] {
  return readFromStorage<OfflineTurma[]>(STORAGE_KEYS.TURMAS) || []
}

// ============================================================================
// RESULTADOS
// ============================================================================
export async function saveResultadosAsync(resultados: OfflineResultado[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.RESULTADOS, resultados, true)
  if (isIndexedDBAvailable()) {
    try {
      const resultadosComId = resultados.map((r, index) => ({
        ...r,
        id: r.id || `temp_${index}`,
      }))
      await offlineDB.saveData(IDB_STORES.RESULTADOS, resultadosComId)
      console.log('[OfflineStorage] Resultados salvos no IndexedDB:', resultados.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar resultados no IndexedDB:', error)
    }
  }
  return localSaved
}

export function saveResultados(resultados: OfflineResultado[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.RESULTADOS, resultados, true)
  saveResultadosAsync(resultados).catch(console.error)
  return result
}

export async function getResultadosAsync(): Promise<OfflineResultado[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineResultado>(IDB_STORES.RESULTADOS)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Resultados carregados do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler resultados do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineResultado[]>(STORAGE_KEYS.RESULTADOS) || []
}

export function getResultados(): OfflineResultado[] {
  return readFromStorage<OfflineResultado[]>(STORAGE_KEYS.RESULTADOS) || []
}

// ============================================================================
// CONFIGURAÇÃO DE SÉRIES
// ============================================================================
export async function saveConfigSeriesAsync(configs: OfflineConfigSerie[]): Promise<boolean> {
  const localSaved = saveToStorage(STORAGE_KEYS.CONFIG_SERIES, configs, true)
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.saveData(IDB_STORES.CONFIG_SERIES, configs.map(c => ({ ...c, id: c.id })))
      console.log('[OfflineStorage] Config séries salvas no IndexedDB:', configs.length)
    } catch (error) {
      console.error('[OfflineStorage] Erro ao salvar config séries no IndexedDB:', error)
    }
  }
  return localSaved
}

export function saveConfigSeries(configs: OfflineConfigSerie[]): boolean {
  const result = saveToStorage(STORAGE_KEYS.CONFIG_SERIES, configs, true)
  saveConfigSeriesAsync(configs).catch(console.error)
  return result
}

export async function getConfigSeriesAsync(): Promise<OfflineConfigSerie[]> {
  if (isIndexedDBAvailable()) {
    try {
      const data = await offlineDB.getData<OfflineConfigSerie>(IDB_STORES.CONFIG_SERIES)
      if (data && data.length > 0) {
        console.log('[OfflineStorage] Config séries carregadas do IndexedDB:', data.length)
        return data
      }
    } catch (error) {
      console.error('[OfflineStorage] Erro ao ler config séries do IndexedDB:', error)
    }
  }
  return readFromStorage<OfflineConfigSerie[]>(STORAGE_KEYS.CONFIG_SERIES) || []
}

export function getConfigSeries(): OfflineConfigSerie[] {
  return readFromStorage<OfflineConfigSerie[]>(STORAGE_KEYS.CONFIG_SERIES) || []
}

export function getConfigSerieBySerie(serie: string): OfflineConfigSerie | null {
  const configs = getConfigSeries()
  const serieNum = serie.replace(/[^0-9]/g, '')
  return configs.find(c => c.serie === serieNum || c.serie === serie) || null
}

export async function getConfigSerieBySeriAsync(serie: string): Promise<OfflineConfigSerie | null> {
  const configs = await getConfigSeriesAsync()
  const serieNum = serie.replace(/[^0-9]/g, '')
  return configs.find(c => c.serie === serieNum || c.serie === serie) || null
}
