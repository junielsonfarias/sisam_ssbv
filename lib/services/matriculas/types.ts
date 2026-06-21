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

/**
 * Registro da tabela dedicada `matriculas` (ADR-002).
 * Registro do vínculo de um aluno a uma turma em um ano letivo.
 */
export interface MatriculaRow {
  id: string
  aluno_id: string
  turma_id: string
  ano_letivo_id: string
  serie_id: string | null
  situacao: string
  data_matricula: string
  criado_em: string
  atualizado_em: string
}

/** Ano letivo corrente derivado de `anos_letivos` (ADR-002 leitura). */
export interface AnoLetivoCorrente {
  id: string
  ano: string
  status: string
}

/** Erro de regra de negócio de matrícula (capacidade, turma inexistente, ano inativo). */
export class MatriculaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MatriculaError'
  }
}
