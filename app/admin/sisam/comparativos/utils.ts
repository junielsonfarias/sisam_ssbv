import { obterDisciplinasPorSerieSync } from '@/lib/disciplinas-por-serie'

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

// Verifica se a serie e de anos iniciais (2o, 3o, 5o)
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

// Obtem o total de questoes por disciplina baseado na serie
export const getTotalQuestoes = (serie: string, disciplina: 'LP' | 'MAT' | 'CH' | 'CN'): number => {
  const disciplinas = obterDisciplinasPorSerieSync(serie)
  const disc = disciplinas.find(d => d.codigo === disciplina)
  return disc?.total_questoes || (disciplina === 'CH' || disciplina === 'CN' ? 10 : 20)
}

// Formata acertos como numero inteiro
export const formatarAcertos = (valor: number | string | null): string => {
  if (valor === null || valor === undefined) return '-'
  const num = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(num)) return '-'
  return Math.round(num).toString()
}

// Formata valor ou retorna N/A se disciplina nao aplicavel
export const formatarValorOuNA = (valor: number | string | null, serie: string, disciplina: 'CH' | 'CN'): string => {
  // CH e CN nao se aplicam a anos iniciais
  if (isAnosIniciais(serie)) {
    return 'N/A'
  }
  return formatarNumero(valor)
}
