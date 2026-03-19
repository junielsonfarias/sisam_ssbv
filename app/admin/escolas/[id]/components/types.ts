// ============================================
// Tipos compartilhados - Escola Detalhe
// ============================================

export type AbaId = 'dados' | 'infraestrutura' | 'series' | 'avaliacao' | 'calendario' | 'turmas' | 'estatisticas'

export interface EscolaDetalhe {
  id: string
  nome: string
  codigo: string | null
  codigo_inep: string | null
  polo_id: string | null
  polo_nome: string | null
  situacao_funcionamento: string | null
  dependencia_administrativa: string | null
  localizacao: string | null
  localizacao_diferenciada: string | null
  modalidade_ensino: string | null
  tipo_atendimento_escolarizacao: string | null
  etapas_ensino: string[] | null
  endereco: string | null
  complemento: string | null
  bairro: string | null
  cep: string | null
  municipio: string | null
  uf: string | null
  telefone: string | null
  email: string | null
  data_criacao: string | null
  cnpj_mantenedora: string | null
  agua_potavel: boolean
  energia_eletrica: boolean
  esgoto_sanitario: boolean
  coleta_lixo: boolean
  internet: boolean
  banda_larga: boolean
  quadra_esportiva: boolean
  biblioteca: boolean
  laboratorio_informatica: boolean
  laboratorio_ciencias: boolean
  acessibilidade_deficiente: boolean
  alimentacao_escolar: boolean
  latitude: number | null
  longitude: number | null
  ativo: boolean
  total_turmas: number
  total_alunos: number
  total_pcd: number
}

export interface SerieEscola {
  id: string
  escola_id: string
  serie: string
  ano_letivo: string
  nome_serie: string | null
  tipo_ensino: string | null
  media_aprovacao: number | null
  max_dependencias: number | null
}

export interface ConfigSerie {
  id: string
  serie: string
  nome_serie: string
  tipo_ensino: string
  media_aprovacao?: number
  max_dependencias?: number
}

export interface PoloSimples {
  id: string
  nome: string
}

export interface Turma {
  id: string
  codigo: string
  nome: string
  serie: string
  turno: string
  total_alunos: number
  capacidade: number | null
}

export interface PeriodoLetivo {
  id: string
  nome: string
  tipo: string
  numero: number
  ano_letivo: string
  data_inicio: string | null
  data_fim: string | null
  dias_letivos: number | null
  ativo: boolean
}

export interface ConfiguracaoNotasEscola {
  id: string
  escola_id: string
  ano_letivo: string
  media_aprovacao: number
  media_recuperacao: number
  nota_maxima: number
}

export interface EstatisticasSituacao {
  situacao: string
  total: number
}

export interface EstatisticasSerie {
  serie: string
  nome_serie: string | null
  total: number
}

export interface SerieEscolar {
  id: string
  codigo: string
  nome: string
  etapa: string
  ordem: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  max_dependencias: number
  formula_nota_final: string
  permite_recuperacao: boolean
  idade_minima: number | null
  idade_maxima: number | null
  total_disciplinas: number
}

export interface RegraSerieRow {
  serie_id: string
  codigo: string
  serie_nome: string
  etapa: string
  ordem: number
  padrao_tipo_id: string | null
  padrao_tipo_codigo: string | null
  padrao_tipo_nome: string | null
  padrao_tipo_resultado: string | null
  padrao_regra_id: string | null
  padrao_regra_nome: string | null
  padrao_media_aprovacao: number | null
  padrao_nota_maxima: number | null
  padrao_permite_recuperacao: boolean | null
  override_id: string | null
  override_tipo_id: string | null
  override_regra_id: string | null
  override_media_aprovacao: number | null
  override_media_recuperacao: number | null
  override_nota_maxima: number | null
  override_permite_recuperacao: boolean | null
  override_observacao: string | null
  override_tipo_codigo: string | null
  override_tipo_nome: string | null
  override_tipo_resultado: string | null
  override_regra_nome: string | null
}

export interface TipoAvaliacaoOpt {
  id: string
  codigo: string
  nome: string
  tipo_resultado: string
}

export interface RegraAvaliacaoOpt {
  id: string
  nome: string
  tipo_avaliacao_id: string
}

// ============================================
// Constantes compartilhadas
// ============================================

export const ETAPA_LABELS: Record<string, string> = {
  educacao_infantil: 'Educacao Infantil',
  fundamental_anos_iniciais: 'Fund. Anos Iniciais',
  fundamental_anos_finais: 'Fund. Anos Finais',
  eja: 'EJA',
}

export const ETAPA_CORES: Record<string, string> = {
  educacao_infantil: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-300',
  fundamental_anos_iniciais: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300',
  fundamental_anos_finais: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300',
  eja: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300',
}

// ============================================
// CSS classes compartilhadas
// ============================================

export const inputClassName = "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
export const selectClassName = "w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
export const labelClassName = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
