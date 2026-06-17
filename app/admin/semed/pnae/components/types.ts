export interface Escola {
  id: string
  nome: string
}

export interface Refeicao {
  dia_semana: number
  tipo: string
  descricao: string
  kcal?: number | null
  contem_alergenicos?: string[]
}

export interface Cardapio {
  id: string
  escola_id: string | null
  semana_inicio: string
  semana_fim: string
  faixa_etaria: string
  status: string
  observacoes: string | null
  nutricionista_nome: string | null
  nutricionista_crn: string | null
  refeicoes: Refeicao[]
}

export interface ResumoLinha {
  faixa_etaria: string
  tipo_refeicao: string
  total_alunos: string
  total_extra: string
  dias_servidos: string
}

export interface Nutricionista {
  id: string
  nome: string
  crn: string
  telefone: string | null
  email: string | null
  responsavel_tecnico: boolean
  ativa: boolean
}

export interface FormCardapio {
  escola_id: string | null
  semana_inicio: string
  semana_fim: string
  faixa_etaria: string
  observacoes: string
  publicar: boolean
  refeicoes: Refeicao[]
}

export interface FormRefeicao {
  dia_semana: number
  tipo: string
  descricao: string
  kcal: string
}

export interface FormAtendimento {
  escola_id: string
  data_atendimento: string
  faixa_etaria: string
  tipo_refeicao: string
  qtd_alunos: string
  qtd_extra: string
  observacoes: string
}

export interface FormNutricionista {
  nome: string
  crn: string
  telefone: string
  email: string
  responsavel_tecnico: boolean
}

export type AbaPnae = 'cardapio' | 'atendimentos' | 'nutricionistas'

export const FAIXAS = ['creche', 'pre_escola', 'fundamental', 'eja', 'integral'] as const
export const TIPOS_REFEICAO = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'] as const

export const FAIXA_LABEL: Record<string, string> = {
  creche: 'Creche (0-3 anos)',
  pre_escola: 'Pré-escola (4-5 anos)',
  fundamental: 'Ensino Fundamental',
  eja: 'EJA',
  integral: 'Tempo Integral',
}

export const TIPO_REFEICAO_LABEL: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  jantar: 'Jantar',
}

export const DIAS = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

export const STATUS_BADGE: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  publicado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  arquivado: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-300',
}

export const CARDAPIO_VAZIO: FormCardapio = {
  escola_id: '',
  semana_inicio: '',
  semana_fim: '',
  faixa_etaria: 'fundamental',
  observacoes: '',
  publicar: false,
  refeicoes: [],
}

export const REFEICAO_VAZIA: FormRefeicao = {
  dia_semana: 1,
  tipo: 'almoco',
  descricao: '',
  kcal: '',
}

export const ATENDIMENTO_VAZIO: FormAtendimento = {
  escola_id: '',
  data_atendimento: new Date().toISOString().slice(0, 10),
  faixa_etaria: 'fundamental',
  tipo_refeicao: 'almoco',
  qtd_alunos: '',
  qtd_extra: '',
  observacoes: '',
}

export const NUTRICIONISTA_VAZIA: FormNutricionista = {
  nome: '',
  crn: '',
  telefone: '',
  email: '',
  responsavel_tecnico: false,
}

export const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-green-500 outline-none'
