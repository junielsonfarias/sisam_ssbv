/**
 * Sincronização com o servidor + estado de sync + limpeza de dados offline.
 */
import { offlineDB, isIndexedDBAvailable } from '../offline-db'
import {
  getEscolas, getPolos, getResultados,
  saveConfigSeriesAsync, saveEscolasAsync, savePolosAsync,
  saveResultadosAsync, saveTurmasAsync,
} from './entities'
import { isOnline } from './internal'
import { STORAGE_KEYS } from './types'

// ============================================================================
// ESTADO DE SYNC
// ============================================================================
export function setSyncDate(): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_DATE, new Date().toISOString())
}

export function getSyncDate(): Date | null {
  const date = localStorage.getItem(STORAGE_KEYS.SYNC_DATE)
  return date ? new Date(date) : null
}

export function setSyncStatus(status: 'syncing' | 'success' | 'error' | 'idle'): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_STATUS, status)
}

export function getSyncStatus(): string {
  return localStorage.getItem(STORAGE_KEYS.SYNC_STATUS) || 'idle'
}

// ============================================================================
// VERIFICAR DADOS OFFLINE
// ============================================================================
export function hasOfflineData(): boolean {
  const resultados = getResultados()
  const polos = getPolos()
  const escolas = getEscolas()
  return resultados.length > 0 || polos.length > 0 || escolas.length > 0
}

// ============================================================================
// LIMPAR DADOS
// ============================================================================
export async function clearAllOfflineDataAsync(): Promise<void> {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  if (isIndexedDBAvailable()) {
    try {
      await offlineDB.clearAll()
      console.log('[OfflineStorage] IndexedDB limpo com sucesso')
    } catch (error) {
      console.error('[OfflineStorage] Erro ao limpar IndexedDB:', error)
    }
  }
  console.log('[OfflineStorage] Todos os dados offline foram limpos')
}

export function clearAllOfflineData(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  if (isIndexedDBAvailable()) {
    offlineDB.clearAll().catch(console.error)
  }
  console.log('[OfflineStorage] Todos os dados offline foram limpos')
}

// ============================================================================
// SINCRONIZAR
// ============================================================================
export async function syncOfflineData(): Promise<{ success: boolean; message: string }> {
  if (!isOnline()) {
    return { success: false, message: 'Sem conexão com a internet' }
  }

  setSyncStatus('syncing')
  console.log('[OfflineStorage] Iniciando sincronização...')

  try {
    const [polosRes, escolasRes, turmasRes, resultadosRes, configSeriesRes] = await Promise.all([
      fetch('/api/offline/polos'),
      fetch('/api/offline/escolas'),
      fetch('/api/offline/turmas'),
      fetch('/api/offline/resultados'),
      fetch('/api/offline/configuracao-series'),
    ])

    if (!polosRes.ok || !escolasRes.ok || !turmasRes.ok || !resultadosRes.ok) {
      throw new Error('Erro ao buscar dados do servidor')
    }

    const [polosData, escolasData, turmasData, resultadosData, configSeriesData] = await Promise.all([
      polosRes.json(),
      escolasRes.json(),
      turmasRes.json(),
      resultadosRes.json(),
      configSeriesRes.ok ? configSeriesRes.json() : { dados: [] },
    ])

    const polos = Array.isArray(polosData) ? polosData : (polosData.dados || [])
    const escolas = Array.isArray(escolasData) ? escolasData : (escolasData.dados || [])
    const turmas = Array.isArray(turmasData) ? turmasData : (turmasData.dados || [])
    const resultados = Array.isArray(resultadosData) ? resultadosData : (resultadosData.dados || [])
    const configSeries = Array.isArray(configSeriesData) ? configSeriesData : (configSeriesData.dados || [])

    console.log('[OfflineStorage] Dados recebidos:', {
      polos: polos.length,
      escolas: escolas.length,
      turmas: turmas.length,
      resultados: resultados.length,
      configSeries: configSeries.length,
    })

    if (resultados.length === 0) {
      console.warn('[OfflineStorage] Nenhum resultado encontrado para sincronizar')
    }

    const [savedPolos, savedEscolas, savedTurmas, savedResultados] = await Promise.all([
      savePolosAsync(polos),
      saveEscolasAsync(escolas),
      saveTurmasAsync(turmas),
      saveResultadosAsync(resultados),
      saveConfigSeriesAsync(configSeries),
    ])

    if (savedPolos && savedEscolas && savedTurmas && savedResultados) {
      setSyncDate()
      setSyncStatus('success')
      console.log('[OfflineStorage] Sincronização concluída com sucesso! (localStorage + IndexedDB)')
      return {
        success: true,
        message: `Sincronizado: ${polos.length} polos, ${escolas.length} escolas, ${turmas.length} turmas, ${resultados.length} resultados, ${configSeries.length} config séries`,
      }
    } else {
      setSyncStatus('error')
      return { success: false, message: 'Erro ao salvar dados no dispositivo' }
    }
  } catch (error: unknown) {
    console.error('[OfflineStorage] Erro na sincronização:', error)
    setSyncStatus('error')
    return { success: false, message: (error as Error).message || 'Erro desconhecido' }
  }
}
