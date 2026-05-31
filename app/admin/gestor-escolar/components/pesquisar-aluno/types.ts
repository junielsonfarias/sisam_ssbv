/**
 * Tipos compartilhados entre os subcomponentes de pesquisar-aluno.
 */
export interface AlunoResultado {
  id: string
  codigo: string | null
  nome: string
  serie: string | null
  ano_letivo: string | null
  escola_id: string
  turma_id: string | null
  cpf: string | null
  data_nascimento: string | null
  pcd: boolean
  situacao?: string | null
  escola_nome: string
  turma_codigo: string | null
  turma_nome: string | null
}

export interface TurmaDisponivel {
  id: string
  codigo: string
  nome: string | null
  serie: string | null
  ano_letivo: string
  capacidade_maxima: number
  total_alunos: number
}

export interface FiltrosBusca {
  escola_id: string
  serie: string
  turma_id: string
  ano_letivo: string
}

export interface FormMatricula {
  escola_id: string
  turma_id: string
  serie: string
  ano_letivo: string
}

export interface FormNovoAluno {
  nome: string
  codigo: string
  cpf: string
  data_nascimento: string
  pcd: boolean
}

export const NOVO_ALUNO_VAZIO: FormNovoAluno = {
  nome: '',
  codigo: '',
  cpf: '',
  data_nascimento: '',
  pcd: false,
}

export function formatarCPF(cpf: string | null): string {
  if (!cpf) return '—'
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.$3-**')
}

export function formatarData(data: string | null): string {
  if (!data) return '—'
  try {
    return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')
  } catch {
    return data
  }
}
