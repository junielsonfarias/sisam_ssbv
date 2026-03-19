import { PoloSimples, EscolaSimples, TurmaSimples } from '@/lib/dados/types'

export interface FiltrosGraficos {
  ano_letivo?: string
  polo_id?: string
  escola_id?: string
  serie?: string
  disciplina?: string
  turma_id?: string
  tipo_ensino?: string
}

export const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export const DISCIPLINA_COLORS: { [key: string]: string } = {
  'Lingua Portuguesa': '#4F46E5',
  'Ciencias Humanas': '#10B981',
  'Matematica': '#F59E0B',
  'Ciencias da Natureza': '#EF4444',
  'Producao Textual': '#8B5CF6'
}

// Re-export with proper accents (runtime keys)
export const DISCIPLINA_COLORS_FULL: { [key: string]: string } = {
  'Língua Portuguesa': '#4F46E5',
  'Ciências Humanas': '#10B981',
  'Matemática': '#F59E0B',
  'Ciências da Natureza': '#EF4444',
  'Produção Textual': '#8B5CF6'
}

export interface FiltrosAtivosTagProps {
  className?: string
  filtrosAtivos: { label: string; valor: string }[]
}

export interface GraficoGeralProps {
  dados: any
  FiltrosAtivosTag: React.ComponentType<{ className?: string }>
  prepararDadosDisciplinas: (labels: string[], dados: number[]) => any[]
  prepararDadosEscolas: (labels: string[], dados: number[], totais?: number[]) => any[]
  prepararDadosBarras: (labels: string[], dados: number[], label?: string) => any[]
  prepararDadosPizza: (labels: string[], dados: number[]) => any[]
  prepararDadosComparativo: () => any[]
}

export interface GraficoAcertosErrosProps {
  dados: any
  filtros: FiltrosGraficos
  FiltrosAtivosTag: React.ComponentType<{ className?: string }>
}

export interface GraficoAnaliseProps {
  dados: any
  FiltrosAtivosTag: React.ComponentType<{ className?: string }>
}

export interface GraficoRankingProps {
  dados: any
  filtros: FiltrosGraficos
  FiltrosAtivosTag: React.ComponentType<{ className?: string }>
}

export interface GraficoNiveisProps {
  dados: any
  FiltrosAtivosTag: React.ComponentType<{ className?: string }>
}
