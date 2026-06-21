// ============================================================================
// Service de Matrículas — barrel
// Lógica de matrícula, capacidade e resumo, decomposta em submódulos:
//  - types      → interfaces + MatriculaError + isAlunoExistente
//  - consultas  → buscarResumoMatriculas, verificarCapacidadeTurma, verificarAnoLetivoAtivo
//  - matricula  → matricularAluno (single) + matricularAlunosBatch
//  - leitura    → tabela dedicada `matriculas` (ADR-002): obterAnoLetivoCorrente,
//                 buscarMatriculaDoAluno, listarMatriculasDaTurma
//  - dual-write → escrita paralela em `matriculas` (ADR-002 fase 3):
//                 dualWriteMatricula (UPSERT por aluno+ano)
// ============================================================================

export * from './types'
export * from './consultas'
export * from './matricula'
export * from './leitura'
export * from './dual-write'
