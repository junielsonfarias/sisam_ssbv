export interface AlunoAeeRow {
  aluno_id: string
  aluno_nome: string
  serie: string | null
  tipos_deficiencia: string[]
  laudo_medico: boolean
  necessita_cuidador: boolean
  turma_codigo: string | null
  escola_nome: string | null
}

export interface AlunoBusca {
  id: string
  nome: string
  codigo: string | null
  serie: string | null
  escola_nome?: string | null
  turma_codigo?: string | null
}

export interface Escola { id: string; nome: string }

export interface CadastroAee {
  aluno_id: string
  tipos_deficiencia: string[]
  cid_codigos: string[]
  laudo_medico: boolean
  laudo_data: string
  laudo_arquivo_url: string
  laudo_emitido_por: string
  observacoes: string
  necessita_cuidador: boolean
  necessita_interprete: boolean
  recursos_especiais: string[]
  frequencia_aee: string
}

export interface Atendimento {
  id: string
  data_atendimento: string
  duracao_minutos: number
  presente: boolean
  atividades_realizadas: string | null
  observacoes: string | null
}

export type PlanoStatus = 'rascunho' | 'ativo' | 'concluido' | 'cancelado'

export interface PlanoAee {
  aluno_id: string
  ano_letivo: string
  objetivos: string
  estrategias: string
  recursos_necessarios: string
  areas_foco: string[]
  periodicidade_horas_semanais: string
  avaliacao_progresso: string
  status: PlanoStatus
  data_inicio: string
  data_revisao: string
  data_fim: string
}

export interface FormAtendimento {
  data_atendimento: string
  duracao_minutos: string
  presente: boolean
  atividades_realizadas: string
  observacoes: string
}

export const TIPOS_DEFICIENCIA = [
  { v: 'fisica', label: 'Deficiência Física' },
  { v: 'auditiva', label: 'Deficiência Auditiva / Surdez' },
  { v: 'visual', label: 'Deficiência Visual / Cegueira' },
  { v: 'intelectual', label: 'Deficiência Intelectual' },
  { v: 'multipla', label: 'Deficiência Múltipla' },
  { v: 'tea', label: 'TEA (Espectro Autista)' },
  { v: 'altas_habilidades', label: 'Altas Habilidades / Superdotação' },
  { v: 'surdocegueira', label: 'Surdocegueira' },
  { v: 'transtorno_global_desenvolvimento', label: 'Transtorno Global Desenvolvimento' },
] as const

export const RECURSOS_DISPONIVEIS = [
  'libras', 'braile', 'cadeira_rodas', 'audiodescricao',
  'computador_adaptado', 'material_ampliado', 'caderno_pautado',
  'softwares_acessibilidade', 'comunicacao_alternativa',
] as const

export const RECURSO_LABEL: Record<string, string> = {
  libras: 'LIBRAS',
  braile: 'Braile',
  cadeira_rodas: 'Cadeira de rodas',
  audiodescricao: 'Audiodescrição',
  computador_adaptado: 'Computador adaptado',
  material_ampliado: 'Material ampliado',
  caderno_pautado: 'Caderno pautado',
  softwares_acessibilidade: 'Softwares de acessibilidade',
  comunicacao_alternativa: 'Comunicação alternativa',
}

export const STATUS_PLANO_LABEL: Record<PlanoStatus, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const STATUS_PLANO_BADGE: Record<PlanoStatus, string> = {
  rascunho: 'bg-slate-100 text-slate-700 dark:bg-slate-700/30 dark:text-slate-300',
  ativo: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  concluido: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

export const TIPO_LABEL = (t: string) =>
  TIPOS_DEFICIENCIA.find((d) => d.v === t)?.label || t

export const CADASTRO_VAZIO: CadastroAee = {
  aluno_id: '',
  tipos_deficiencia: [],
  cid_codigos: [],
  laudo_medico: false,
  laudo_data: '',
  laudo_arquivo_url: '',
  laudo_emitido_por: '',
  observacoes: '',
  necessita_cuidador: false,
  necessita_interprete: false,
  recursos_especiais: [],
  frequencia_aee: '',
}

export const ATENDIMENTO_VAZIO: FormAtendimento = {
  data_atendimento: new Date().toISOString().slice(0, 10),
  duracao_minutos: '50',
  presente: true,
  atividades_realizadas: '',
  observacoes: '',
}

export const planoVazio = (alunoId: string, ano: string): PlanoAee => ({
  aluno_id: alunoId,
  ano_letivo: ano,
  objetivos: '',
  estrategias: '',
  recursos_necessarios: '',
  areas_foco: [],
  periodicidade_horas_semanais: '',
  avaliacao_progresso: '',
  status: 'ativo',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_revisao: '',
  data_fim: '',
})

export const INPUT_CLS =
  'px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none'

export function toggleArray<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}
