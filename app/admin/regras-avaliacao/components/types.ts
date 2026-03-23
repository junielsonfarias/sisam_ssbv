// ============================================
// Tipos
// ============================================

export interface TipoAvaliacao {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  tipo_resultado: 'parecer' | 'conceito' | 'numerico' | 'misto'
  escala_conceitos: ConceitoEscala[] | null
  nota_minima: number
  nota_maxima: number
  permite_decimal: boolean
  ativo: boolean
}

export interface ConceitoEscala {
  codigo: string
  nome: string
  valor_numerico: number
}

export interface RegraAvaliacao {
  id: string
  nome: string
  descricao: string | null
  tipo_avaliacao_id: string
  tipo_avaliacao_nome: string
  tipo_avaliacao_codigo: string
  tipo_resultado: string
  tipo_periodo: string
  qtd_periodos: number
  media_aprovacao: number | null
  media_recuperacao: number | null
  nota_maxima: number | null
  permite_recuperacao: boolean
  recuperacao_por_periodo: boolean
  max_dependencias: number
  formula_media: string
  pesos_periodos: any[] | null
  arredondamento: string
  casas_decimais: number
  aprovacao_automatica: boolean
  ativo: boolean
  total_series: number
}

// ============================================
// Constantes
// ============================================

export const TIPO_RESULTADO_BADGE: Record<string, { label: string; cor: string }> = {
  parecer: { label: 'Parecer', cor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
  conceito: { label: 'Conceito', cor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  numerico: { label: 'Numerico', cor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' },
  misto: { label: 'Misto', cor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' },
}

export const TIPO_PERIODO_BADGE: Record<string, { label: string; cor: string }> = {
  anual: { label: 'Anual', cor: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  semestral: { label: 'Semestral', cor: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' },
  trimestral: { label: 'Trimestral', cor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300' },
  bimestral: { label: 'Bimestral', cor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300' },
}

export const FORMULA_LABELS: Record<string, string> = {
  media_aritmetica: 'Media Aritmetica',
  media_ponderada: 'Media Ponderada',
  maior_nota: 'Maior Nota',
  soma_dividida: 'Soma Dividida',
}

export const ARREDONDAMENTO_LABELS: Record<string, string> = {
  normal: 'Normal',
  cima: 'Para Cima',
  baixo: 'Para Baixo',
  nenhum: 'Nenhum',
}
