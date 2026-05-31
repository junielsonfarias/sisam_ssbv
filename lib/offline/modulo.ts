/**
 * Gestão do módulo ativo do usuário (sisam | gestor | semed | transparencia | admin).
 * 'educatec' é mantido como alias legado de 'sisam' para retrocompatibilidade.
 */
import { ModuloAtivo, STORAGE_KEYS } from './types'

export function saveModuloAtivo(modulo: ModuloAtivo): void {
  // Normaliza 'educatec' → 'sisam' no novo armazenamento
  const normalizado = modulo === 'educatec' ? 'sisam' : modulo
  localStorage.setItem(STORAGE_KEYS.MODULO_ATIVO, normalizado)
}

export function getModuloAtivo(): ModuloAtivo {
  const raw = localStorage.getItem(STORAGE_KEYS.MODULO_ATIVO) as ModuloAtivo | null
  if (!raw) return 'sisam'
  return raw === 'educatec' ? 'sisam' : raw
}

export function hasModuloAtivo(): boolean {
  return localStorage.getItem(STORAGE_KEYS.MODULO_ATIVO) !== null
}

export function clearModuloAtivo(): void {
  localStorage.removeItem(STORAGE_KEYS.MODULO_ATIVO)
}
