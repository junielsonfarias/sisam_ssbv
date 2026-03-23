export interface AlunoEmbedding {
  aluno_id: string
  nome: string
  codigo: string | null
  turma_id: string | null
  serie: string | null
  descriptor: Float32Array
}

export interface RegistroPresenca {
  aluno_id: string
  nome: string
  tipo: 'entrada' | 'saida'
  hora: string
  confianca: number
}

export interface ConfigTerminal {
  escola_id: string
  turma_id: string
  confianca_minima: number
  cooldown_segundos: number
}

export type StatusModelo = 'carregando' | 'pronto' | 'erro'
export type StatusCamera = 'desligada' | 'ligando' | 'ativa' | 'erro'
