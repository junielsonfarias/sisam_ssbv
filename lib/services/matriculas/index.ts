// ============================================================================
// Service de Matrículas — barrel
// Lógica de matrícula, capacidade e resumo, decomposta em submódulos:
//  - types      → interfaces + MatriculaError + isAlunoExistente
//  - consultas  → buscarResumoMatriculas, verificarCapacidadeTurma, verificarAnoLetivoAtivo
//  - matricula  → matricularAluno (single) + matricularAlunosBatch
//  - leitura    → tabela dedicada `matriculas` (ADR-002): obterAnoLetivoCorrente,
//                 buscarMatriculaDoAluno, listarMatriculasDaTurma
// ============================================================================

export * from './types'
export * from './consultas'
export * from './matricula'
export * from './leitura'
