// ============================================================================
// Tipos e erro do domínio de Matrículas
// ============================================================================

export interface ResumoMatriculas {
  total_turmas: number
  total_alunos: number
}

export interface CapacidadeTurma {
  capacidade: number
  matriculados: number
  disponivel: number
}

export interface DadosNovoAluno {
  nome: string
  codigo?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  serie_individual?: string | null
}

export interface DadosAlunoExistente extends DadosNovoAluno {
  id: string
}

export type DadosAluno = DadosAlunoExistente | DadosNovoAluno

export function isAlunoExistente(aluno: DadosAluno): aluno is DadosAlunoExistente {
  return 'id' in aluno && !!aluno.id
}

export interface DadosMatricula {
  alunoId: string
  turmaId: string
  escolaId: string
  serie?: string
  anoLetivo?: string
}

export interface ResultadoMatricula {
  sucesso: boolean
  mensagem: string
}

export interface ResultadoMatriculaBatch {
  matriculados: number
  criados: number
  erros: string[]
  alunos: Record<string, unknown>[]
}

/** Erro de regra de negócio de matrícula (capacidade, turma inexistente, ano inativo). */
export class MatriculaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatriculaError'
  }
}
