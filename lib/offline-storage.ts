/**
 * Sistema de armazenamento offline unificado (IndexedDB principal +
 * localStorage fallback).
 *
 * Este arquivo agora é APENAS um barrel re-export. A implementação real
 * foi decomposta em 6 módulos sob `lib/offline/` na auditoria 31/05/2026:
 *
 *   types.ts    — interfaces e STORAGE_KEYS
 *   internal.ts — helpers privados (saveToStorage, readFromStorage)
 *   modulo.ts   — gestão do módulo ativo (sisam/gestor/semed/etc)
 *   entities.ts — CRUDs (User, Polos, Escolas, Turmas, Resultados, ConfigSeries)
 *   sync.ts     — sincronização + estado + limpeza de dados
 *   queries.ts  — filtros + estatísticas + listagens derivadas
 *
 * A API pública é preservada — chamadores continuam usando:
 *   import * as offlineStorage from '@/lib/offline-storage'
 */
export * from './offline'
