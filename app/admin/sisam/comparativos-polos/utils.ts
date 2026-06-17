export const formatarNumero = (valor: number | string | null | undefined): string => {
  if (valor === null || valor === undefined) return '-'
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(num)) return '-'
  return num.toFixed(2)
}

export const getNotaColor = (nota: number | string | null | undefined) => {
  if (nota === null || nota === undefined) return 'text-gray-500'
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(num)) return 'text-gray-500'
  if (num >= 7) return 'text-green-600 font-semibold'
  if (num >= 5) return 'text-yellow-600 font-semibold'
  return 'text-red-600 font-semibold'
}

// Verifica se a serie e de anos iniciais (2, 3, 5)
export const isAnosIniciais = (serie: string | null | undefined): boolean => {
  if (!serie) return false
  const numeroSerie = serie.toString().replace(/[^0-9]/g, '')
  return ['2', '3', '5'].includes(numeroSerie)
}

// Funcao para calcular o nivel baseado na media
export const calcularNivelPorMedia = (media: number | string | null | undefined): { codigo: string, nome: string, cor: string, bgColor: string } => {
  const num = typeof media === 'string' ? parseFloat(media) : media
  if (num === null || num === undefined || isNaN(num) || num <= 0) {
    return { codigo: '-', nome: 'Não classificado', cor: 'text-gray-500', bgColor: 'bg-gray-100' }
  }
  if (num < 3) {
    return { codigo: 'N1', nome: 'Insuficiente', cor: 'text-red-700', bgColor: 'bg-red-100' }
  }
  if (num < 5) {
    return { codigo: 'N2', nome: 'Básico', cor: 'text-yellow-700', bgColor: 'bg-yellow-100' }
  }
  if (num < 7.5) {
    return { codigo: 'N3', nome: 'Adequado', cor: 'text-blue-700', bgColor: 'bg-blue-100' }
  }
  return { codigo: 'N4', nome: 'Avançado', cor: 'text-green-700', bgColor: 'bg-green-100' }
}
