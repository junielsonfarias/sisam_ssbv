// Helpers e constantes compartilhados pelos gráficos de desempenho (escola/polo).
// Extraídos de app/escola/graficos e app/polo/graficos sem mudança de lógica.

export const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Cores específicas para cada disciplina
export const DISCIPLINA_COLORS: { [key: string]: string } = {
  'Língua Portuguesa': '#4F46E5', // Azul Indigo
  'Ciências Humanas': '#10B981',   // Verde Esmeralda
  'Matemática': '#F59E0B',         // Laranja Âmbar
  'Ciências da Natureza': '#EF4444', // Vermelho
  'Produção Textual': '#8B5CF6'    // Roxo Violeta
}

export const prepararDadosBarras = (labels: string[], dados: number[]) =>
  labels.map((l, i) => ({ name: l, value: dados[i] || 0 }))

// Preparar dados de disciplinas ordenados por média (maior para menor) com cores
export const prepararDadosDisciplinas = (labels: string[], dados: number[]) => {
  const combined = labels.map((l, i) => ({
    name: l,
    value: dados[i] || 0,
    fill: DISCIPLINA_COLORS[l] || COLORS[i % COLORS.length],
  }))
  return combined.sort((a, b) => b.value - a.value)
}

export const prepararDadosPizza = (labels: string[], dados: number[]) =>
  labels.map((l, i) => ({ name: l, value: dados[i] || 0 }))
