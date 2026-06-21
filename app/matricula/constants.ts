import {
  GraduationCap, Search, CheckCircle, Clock, XCircle,
} from 'lucide-react'

export interface EscolaOption { id: string; nome: string }

export interface ConsultaResult {
  protocolo: string; aluno_nome: string; serie_pretendida: string
  ano_letivo: string; status: string; motivo_rejeicao: string | null
  escola_nome: string | null; criado_em: string; analisado_em: string | null
}

export const PARENTESCOS = [
  { value: 'mae', label: 'Mãe' },
  { value: 'pai', label: 'Pai' },
  { value: 'avo', label: 'Avó/Avô' },
  { value: 'tio', label: 'Tio/Tia' },
  { value: 'outro', label: 'Outro' },
]

export const GENEROS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
]

export const SERIES = [
  '1_ano_ef', '2_ano_ef', '3_ano_ef', '4_ano_ef', '5_ano_ef',
  '6_ano_ef', '7_ano_ef', '8_ano_ef', '9_ano_ef',
  'pre_escola_i', 'pre_escola_ii',
]

export const SERIES_LABELS: Record<string, string> = {
  '1_ano_ef': '1o Ano EF', '2_ano_ef': '2o Ano EF', '3_ano_ef': '3o Ano EF',
  '4_ano_ef': '4o Ano EF', '5_ano_ef': '5o Ano EF', '6_ano_ef': '6o Ano EF',
  '7_ano_ef': '7o Ano EF', '8_ano_ef': '8o Ano EF', '9_ano_ef': '9o Ano EF',
  'pre_escola_i': 'Pré-Escola I', 'pre_escola_ii': 'Pré-Escola II',
}

export const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Search },
  aprovada: { label: 'Aprovada', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle },
  rejeitada: { label: 'Rejeitada', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  matriculada: { label: 'Matriculada', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: GraduationCap },
}
