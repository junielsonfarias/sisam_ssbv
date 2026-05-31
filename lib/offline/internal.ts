/**
 * Helpers internos de armazenamento. Não fazem parte da API pública —
 * são consumidos apenas por entities.ts e sync.ts.
 */
import { DatabaseError } from '@/lib/validation'
import { STORAGE_KEYS } from './types'

export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

export function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Salva dados no localStorage com fallback de quota.
 * isEssential: se true, tenta novamente após limpar dados não essenciais.
 */
export function saveToStorage(key: string, data: unknown, isEssential: boolean = false): boolean {
  if (!isStorageAvailable()) return false
  try {
    const jsonData = JSON.stringify(data)
    localStorage.setItem(key, jsonData)
    console.log(`[OfflineStorage] Salvou ${key}: ${(jsonData.length / 1024).toFixed(2)}KB`)
    return true
  } catch (error: unknown) {
    console.error(`[OfflineStorage] Erro ao salvar ${key}:`, error)
    if ((error as DatabaseError).name === 'QuotaExceededError') {
      console.warn('[OfflineStorage] Quota excedida, limpando dados antigos...')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('educatec:storage-quota', { detail: { key } }))
      }
      clearOldData()
      if (isEssential) {
        try {
          const jsonData = JSON.stringify(data)
          localStorage.setItem(key, jsonData)
          console.log(`[OfflineStorage] Salvou ${key} após limpar: ${(jsonData.length / 1024).toFixed(2)}KB`)
          return true
        } catch (retryError) {
          console.error(`[OfflineStorage] Falha ao salvar ${key} mesmo após limpar:`, retryError)
        }
      }
    }
    return false
  }
}

export function readFromStorage<T>(key: string): T | null {
  if (!isStorageAvailable()) return null
  try {
    const data = localStorage.getItem(key)
    if (!data) return null
    return JSON.parse(data) as T
  } catch (error) {
    console.error(`[OfflineStorage] Erro ao ler ${key}:`, error)
    return null
  }
}

/**
 * Limpa dados antigos para liberar espaço (cascata por prioridade).
 * Nunca apaga: USER, MODULO_ATIVO, POLOS, ESCOLAS, TURMAS.
 */
function clearOldData(): void {
  const removalPriority = [
    STORAGE_KEYS.QUESTOES,
    STORAGE_KEYS.CONFIG_SERIES,
    STORAGE_KEYS.RESULTADOS,
  ]

  for (const key of removalPriority) {
    const item = localStorage.getItem(key)
    if (item) {
      localStorage.removeItem(key)
      console.log(`[OfflineStorage] Removido para liberar espaço: ${key} (~${(item.length / 1024).toFixed(0)}KB)`)
      try {
        localStorage.setItem('__quota_test__', 'x'.repeat(1024))
        localStorage.removeItem('__quota_test__')
        return
      } catch {
        continue
      }
    }
  }
}

export function getStorageUsage(): { usedKB: number; items: Record<string, number> } {
  const items: Record<string, number> = {}
  let total = 0
  if (!isStorageAvailable()) return { usedKB: 0, items: {} }
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    const data = localStorage.getItem(key)
    if (data) {
      const kb = data.length / 1024
      items[name] = Number(kb.toFixed(2))
      total += kb
    }
  }
  return { usedKB: Number(total.toFixed(2)), items }
}
