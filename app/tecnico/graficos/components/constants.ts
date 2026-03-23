export const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Cores específicas para cada disciplina
export const DISCIPLINA_COLORS: { [key: string]: string } = {
  'Língua Portuguesa': '#4F46E5', // Azul Indigo
  'Ciências Humanas': '#10B981',   // Verde Esmeralda
  'Matemática': '#F59E0B',         // Laranja Âmbar
  'Ciências da Natureza': '#EF4444', // Vermelho
  'Produção Textual': '#8B5CF6'    // Roxo Violeta
}

export interface FiltrosGraficos {
  ano_letivo?: string
  polo_id?: string
  escola_id?: string
  serie?: string
  disciplina?: string
  turma_id?: string
}

export const prepararDadosBarras = (labels: string[], dados: number[], label: string) => {
  return labels.map((l, i) => ({
    name: l,
    value: dados[i] || 0
  }))
}

export const prepararDadosDisciplinas = (labels: string[], dados: number[]) => {
  const combined = labels.map((l, i) => ({
    name: l,
    value: dados[i] || 0,
    fill: DISCIPLINA_COLORS[l] || COLORS[i % COLORS.length]
  }))
  // Ordenar por valor decrescente
  return combined.sort((a, b) => b.value - a.value)
}

export const prepararDadosPizza = (labels: string[], dados: number[]) => {
  return labels.map((l, i) => ({
    name: l,
    value: dados[i] || 0
  }))
}

export const getFaixa = (nota: number) => {
  if (nota >= 8) return { nome: 'Excelente', cor: 'text-green-600', bg: 'bg-green-50' }
  if (nota >= 6) return { nome: 'Bom', cor: 'text-blue-600', bg: 'bg-blue-50' }
  if (nota >= 4) return { nome: 'Regular', cor: 'text-yellow-600', bg: 'bg-yellow-50' }
  return { nome: 'Insuficiente', cor: 'text-red-600', bg: 'bg-red-50' }
}

export const getHeatmapColor = (value: number) => {
  if (value >= 8) return 'bg-green-500'
  if (value >= 6) return 'bg-green-300'
  if (value >= 4) return 'bg-yellow-300'
  return 'bg-red-300'
}
