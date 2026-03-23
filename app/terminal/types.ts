export interface AlunoEmMemoria {
  aluno_id: string
  nome: string
  codigo: string | null
  serie: string | null
  turma_codigo: string | null
  descriptor: Float32Array
}

export interface RegistroLocal {
  aluno_id: string
  nome: string
  tipo: 'entrada' | 'saida'
  hora: string
  confianca: number
}

export type Fase = 'setup' | 'terminal'
export type StatusModelo = 'carregando' | 'pronto' | 'erro'
