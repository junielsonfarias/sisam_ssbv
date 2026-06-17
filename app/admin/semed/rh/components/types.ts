export interface Escola {
  id: string
  nome: string
}

export interface ServidorRow {
  id: string
  matricula_funcional: string | null
  nome: string
  cpf: string
  tipo_vinculo: string
  cargo: string | null
  formacao_maxima: string | null
  email: string | null
  ativo: boolean
}

export interface Lotacao {
  id: string
  escola_id: string | null
  escola_nome: string | null
  funcao: string
  carga_horaria_semanal: number
  turno: string | null
  vigencia_inicio: string
  vigencia_fim: string | null
  e_principal: boolean
}

export interface Formacao {
  id: string
  nome_curso: string
  carga_horaria: number
  status: string
  data_conclusao: string | null
  categoria: string | null
}

export interface ServidorDetalhe extends ServidorRow {
  data_nascimento: string | null
  sexo: string | null
  rg: string | null
  pis: string | null
  telefone: string | null
  endereco: string | null
  data_admissao: string
  data_demissao: string | null
  area_formacao: string | null
  lotacoes: Lotacao[]
  formacoes: Formacao[]
}

export interface FormServidor {
  matricula_funcional: string
  cpf: string
  nome: string
  data_nascimento: string
  sexo: '' | 'M' | 'F'
  rg: string
  pis: string
  email: string
  telefone: string
  endereco: string
  tipo_vinculo: string
  data_admissao: string
  cargo: string
  formacao_maxima: string
  area_formacao: string
}

export interface FormLotacao {
  escola_id: string
  funcao: string
  carga_horaria_semanal: string
  turno: string
  vigencia_inicio: string
  vigencia_fim: string
  e_principal: boolean
  observacoes: string
}

export interface FormFormacao {
  nome_curso: string
  instituicao: string
  modalidade: string
  carga_horaria: string
  data_inicio: string
  data_conclusao: string
  status: string
  certificado_url: string
  categoria: string
  observacoes: string
}

export const TIPOS_VINCULO = [
  { v: 'concursado_efetivo', label: 'Concursado efetivo' },
  { v: 'concursado_estavel', label: 'Concursado estável' },
  { v: 'contrato_temporario', label: 'Contrato temporário' },
  { v: 'comissionado', label: 'Comissionado' },
  { v: 'cedido', label: 'Cedido' },
  { v: 'terceirizado', label: 'Terceirizado' },
  { v: 'estagiario', label: 'Estagiário' },
  { v: 'rpa', label: 'RPA' },
] as const

export const FORMACAO_OPCOES = [
  { v: 'fundamental_incompleto', label: 'Fundamental incompleto' },
  { v: 'fundamental_completo', label: 'Fundamental completo' },
  { v: 'medio_incompleto', label: 'Médio incompleto' },
  { v: 'medio_completo', label: 'Médio completo' },
  { v: 'medio_normal_magisterio', label: 'Médio Normal / Magistério' },
  { v: 'superior_incompleto', label: 'Superior incompleto' },
  { v: 'superior_completo_licenciatura', label: 'Superior — Licenciatura' },
  { v: 'superior_completo_bacharelado', label: 'Superior — Bacharelado' },
  { v: 'especializacao', label: 'Especialização' },
  { v: 'mestrado', label: 'Mestrado' },
  { v: 'doutorado', label: 'Doutorado' },
] as const

export const VINCULO_LABEL = (v: string) =>
  TIPOS_VINCULO.find((t) => t.v === v)?.label || v

export const FORMACAO_LABEL = (v: string | null) =>
  v ? (FORMACAO_OPCOES.find((t) => t.v === v)?.label || v) : '—'

export const VINCULO_BADGE: Record<string, string> = {
  concursado_efetivo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concursado_estavel: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  contrato_temporario: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  comissionado: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cedido: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  terceirizado: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  estagiario: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  rpa: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
}

export const SERVIDOR_VAZIO: FormServidor = {
  matricula_funcional: '',
  cpf: '',
  nome: '',
  data_nascimento: '',
  sexo: '',
  rg: '',
  pis: '',
  email: '',
  telefone: '',
  endereco: '',
  tipo_vinculo: 'concursado_efetivo',
  data_admissao: '',
  cargo: '',
  formacao_maxima: '',
  area_formacao: '',
}

export const LOTACAO_VAZIA = (): FormLotacao => ({
  escola_id: '',
  funcao: '',
  carga_horaria_semanal: '20',
  turno: '',
  vigencia_inicio: new Date().toISOString().slice(0, 10),
  vigencia_fim: '',
  e_principal: true,
  observacoes: '',
})

export const FORMACAO_VAZIA: FormFormacao = {
  nome_curso: '',
  instituicao: '',
  modalidade: '',
  carga_horaria: '',
  data_inicio: '',
  data_conclusao: '',
  status: 'concluido',
  certificado_url: '',
  categoria: '',
  observacoes: '',
}

export const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none'
