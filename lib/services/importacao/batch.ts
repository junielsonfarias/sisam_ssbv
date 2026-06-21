/**
 * Fases 6-9: Batch inserts de turmas, alunos, consolidados, producao e resultados
 *
 * Fachada (barrel) que re-exporta cada fase a partir de submodulos em ./batch/.
 * Mantida para compatibilidade dos imports existentes (ex.: index.ts).
 *
 * @module services/importacao/batch
 */

export { criarTurmas } from './batch/turmas'
export { criarAlunos } from './batch/alunos'
export { inserirConsolidados } from './batch/consolidados'
export { inserirProducao } from './batch/producao'
export { inserirResultadosProvas } from './batch/resultados'
