// ============================================================================
// Service de Notas — fachada (barrel) re-exportando os submódulos.
//
// Mantém compatibilidade de imports '@/lib/services/notas' após a decomposição
// do arquivo único (>400 linhas) em:
//   - types.ts      → tipos compartilhados
//   - calculo.ts    → calcularNotaFinal
//   - auditoria.ts  → montarAuditoriaNotas + registrarAuditoriaNotas + helpers
//   - config.ts     → buscarConfigNotas + invalidarCacheConfigNotas + cache
//   - lancamento.ts → lancarNotas + buscarNotas + buscarTurma + anoLetivoFinalizado
// ============================================================================

export type { NotaInput, ConfigNotas, NotaSnapshot, LinhaAuditoriaNota } from './types'
export { calcularNotaFinal } from './calculo'
export { montarAuditoriaNotas, registrarAuditoriaNotas } from './auditoria'
export { buscarConfigNotas, invalidarCacheConfigNotas } from './config'
export { anoLetivoFinalizado, buscarNotas, buscarTurma, lancarNotas } from './lancamento'
