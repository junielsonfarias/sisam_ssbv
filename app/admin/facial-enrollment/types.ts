export interface AlunoFacial {
  aluno_id: string
  nome: string
  aluno_nome?: string
  aluno_codigo?: string
  consentido: boolean
  tem_embedding: boolean
  responsavel_nome?: string
  responsavel_cpf?: string
  data_consentimento?: string
}

export interface ConsentForm {
  responsavel_nome: string
  responsavel_cpf: string
  consentido: boolean
}

export type PoseType = 'frontal' | 'esquerda' | 'direita'

export interface PoseCapture {
  descriptor: Float32Array
  score: number
  foto: string
}

export const POSES: { key: PoseType; label: string; instrucao: string; seta: string }[] = [
  { key: 'frontal', label: 'Frontal', instrucao: 'Olhe diretamente para a camera', seta: '\u2B06' },
  { key: 'esquerda', label: 'Esquerda', instrucao: 'Vire levemente para a esquerda', seta: '\u2B05' },
  { key: 'direita', label: 'Direita', instrucao: 'Vire levemente para a direita', seta: '\u27A1' },
]

export const TAMANHO_MINIMO_ROSTO = 15
export const AMOSTRAS_POR_POSE = 3
