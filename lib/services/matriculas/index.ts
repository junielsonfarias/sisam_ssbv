// ============================================================================
// Service de Matrículas — barrel
// Lógica de matrícula, capacidade e resumo, decomposta em submódulos:
//  - types      → interfaces + MatriculaError + isAlunoExistente
//  - consultas  → buscarResumoMatriculas, verificarCapacidadeTurma, verificarAnoLetivoAtivo
//  - matricula  → matricularAluno (single) + matricularAlunosBatch
// ============================================================================

export * from './types'
export * from './consultas'
export * from './matricula'
