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

export const POSES: { key: PoseType; label: string; instrucao: string; seta: string; dica: string }[] = [
  { key: 'frontal', label: 'Frontal', instrucao: 'Olhe diretamente para a camera', seta: '\u2B06', dica: 'Mantenha o rosto centralizado e olhe para a camera' },
  { key: 'esquerda', label: 'Esquerda', instrucao: 'Vire levemente para a esquerda', seta: '\u2B05', dica: 'Gire o rosto suavemente, mantenha os olhos visiveis' },
  { key: 'direita', label: 'Direita', instrucao: 'Vire levemente para a direita', seta: '\u27A1', dica: 'Gire o rosto suavemente, mantenha os olhos visiveis' },
]

/** Tamanho minimo do rosto na tela (% da largura do video) */
export const TAMANHO_MINIMO_ROSTO = 20

/** Amostras necessarias por pose antes de capturar */
export const AMOSTRAS_POR_POSE = 5

/** Qualidade minima de deteccao para aceitar amostra */
export const QUALIDADE_MINIMA = 0.7

/** Tempo (ms) que as condicoes devem estar boas para auto-captura */
export const AUTO_CAPTURA_DELAY_MS = 1500
