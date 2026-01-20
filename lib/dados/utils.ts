/**
 * Funções utilitárias para o Painel de Dados
 * @module lib/dados/utils
 */

import { NIVEL_NAMES, CORES_NIVEL_BADGE } from './constants'

/**
 * Obtém o nome completo do nível a partir do código
 */
export const getNivelName = (nivel: string): string => {
  return NIVEL_NAMES[nivel] || nivel
}

/**
 * Obtém a classe CSS para o badge de nível (N1, N2, N3, N4)
 */
export const getNivelBadgeClass = (nivel: string | null | undefined): string => {
  if (!nivel) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'

  const nivelUpper = nivel.toUpperCase().trim()
  return CORES_NIVEL_BADGE[nivelUpper] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
}

/**
 * Calcula o nível baseado na média
 */
export const calcularNivelPorMedia = (media: number | null | undefined): { codigo: string, nome: string, cor: string } => {
  if (media === null || media === undefined || media <= 0) {
    return { codigo: '-', nome: 'Não classificado', cor: '#6B7280' }
  }
  if (media < 3) {
    return { codigo: 'N1', nome: 'Insuficiente', cor: '#EF4444' }
  }
  if (media < 5) {
    return { codigo: 'N2', nome: 'Básico', cor: '#F59E0B' }
  }
  if (media < 7.5) {
    return { codigo: 'N3', nome: 'Adequado', cor: '#3B82F6' }
  }
  return { codigo: 'N4', nome: 'Avançado', cor: '#10B981' }
}

/**
 * Formata série no padrão "Xº Ano"
 */
export const formatarSerie = (serie: string | null | undefined): string => {
  if (!serie) return '-'

  // Se já está no formato correto (ex: "2º Ano", "5º Ano"), retorna como está
  if (serie.toLowerCase().includes('ano')) return serie

  // Extrai o número da série
  const numeroMatch = serie.match(/(\d+)/)
  if (!numeroMatch) return serie

  const numero = numeroMatch[1]
  return `${numero}º Ano`
}

/**
 * Obtém cor de presença
 */
export const getPresencaColor = (presenca: string): string => {
  if (presenca === 'P' || presenca === 'p') {
    return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
  }
  if (presenca === '-') {
    return 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
  }
  return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'
}

/**
 * Formata nota para exibição
 */
export const formatarNota = (
  nota: number | string | null | undefined,
  presenca?: string,
  _mediaAluno?: number | string | null,
  _codigoDisciplina?: string,
  _serie?: string | null
): string => {
  // Se não houver dados de frequência, sempre retornar "-"
  if (presenca === '-') {
    return '-'
  }

  // Se aluno faltou, sempre retornar "-"
  if (presenca === 'F' || presenca === 'f') {
    return '-'
  }

  // Se aluno está presente (P), exibir nota mesmo que seja 0
  if (presenca === 'P' || presenca === 'p') {
    if (nota === null || nota === undefined || nota === '') return '-'
    const num = typeof nota === 'string' ? parseFloat(nota) : nota
    if (isNaN(num)) return '-'
    return num.toFixed(2)
  }

  // Caso padrão (sem presença definida)
  if (nota === null || nota === undefined || nota === '') return '-'
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(num)) return '-'
  return num.toFixed(2)
}

/**
 * Converte nota para número
 */
export const getNotaNumero = (nota: number | string | null | undefined): number | null => {
  if (nota === null || nota === undefined || nota === '') return null
  const num = typeof nota === 'string' ? parseFloat(nota) : nota
  return isNaN(num) ? null : num
}

/**
 * Obtém cor do texto da nota
 */
export const getNotaColor = (nota: number | string | null | undefined): string => {
  const num = getNotaNumero(nota)
  if (num === null) return 'text-gray-500 dark:text-gray-400'
  if (num >= 7) return 'text-green-600 dark:text-green-400 font-semibold'
  if (num >= 5) return 'text-yellow-600 dark:text-yellow-400 font-semibold'
  return 'text-red-600 dark:text-red-400 font-semibold'
}

/**
 * Obtém cor de fundo da nota
 */
export const getNotaBgColor = (nota: number | string | null | undefined): string => {
  const num = getNotaNumero(nota)
  if (num === null) return 'bg-gray-50 dark:bg-slate-700'
  if (num >= 7) return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
  if (num >= 5) return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
  return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
}

/**
 * Obtém classe de cor para nota em tabela
 */
export const getNotaCorTabela = (nota: number): string => {
  if (nota >= 7.5) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300'
  if (nota >= 5) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300'
  if (nota >= 3) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300'
  return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300'
}

/**
 * Obtém classe de cor para decimal
 */
export const getDecimalColor = (decimal: number): string => {
  if (decimal >= 7.5) return 'text-green-700 dark:text-green-400'
  if (decimal >= 5) return 'text-blue-700 dark:text-blue-400'
  if (decimal >= 3) return 'text-yellow-700 dark:text-yellow-400'
  if (decimal > 0) return 'text-red-600 dark:text-red-400 font-bold'
  return 'text-gray-700 dark:text-gray-300'
}

/**
 * Calcula código de nível baseado na nota
 */
export const calcularCodigoNivel = (nota: number): string | null => {
  if (nota <= 0) return null
  if (nota < 3) return 'N1'
  if (nota < 5) return 'N2'
  if (nota < 7.5) return 'N3'
  return 'N4'
}

/**
 * Verifica se é série de anos iniciais (2º, 3º, 5º)
 */
export const isAnosIniciais = (serie: string | undefined | null): boolean => {
  if (!serie) return false
  const numero = serie.match(/(\d+)/)?.[1]
  return numero === '2' || numero === '3' || numero === '5'
}

/**
 * Verifica se é série de anos finais (6º, 7º, 8º, 9º)
 */
export const isAnosFinais = (serie: string | undefined | null): boolean => {
  if (!serie) return false
  const numero = serie.match(/(\d+)/)?.[1]
  return ['6', '7', '8', '9'].includes(numero || '')
}

/**
 * Determina a etapa de ensino baseado na série
 */
export const getEtapaFromSerie = (serie: string | undefined | null): string | undefined => {
  if (!serie) return undefined
  const numero = serie.match(/(\d+)/)?.[1]
  if (!numero) return undefined
  if (['2', '3', '5'].includes(numero)) return 'anos_iniciais'
  if (['6', '7', '8', '9'].includes(numero)) return 'anos_finais'
  return undefined
}

/**
 * Filtra séries baseado na etapa de ensino
 */
export const getSeriesByEtapa = (etapa: string | undefined, todasSeries: string[]): string[] => {
  if (!etapa) return todasSeries
  return todasSeries.filter(serie => {
    const numero = serie.match(/(\d+)/)?.[1]
    if (!numero) return false
    if (etapa === 'anos_iniciais') return ['2', '3', '5'].includes(numero)
    if (etapa === 'anos_finais') return ['6', '7', '8', '9'].includes(numero)
    return true
  })
}

/**
 * Verifica se uma disciplina é aplicável para uma série
 */
export const isDisciplinaAplicavel = (codigoDisciplina: string, serie: string | null | undefined): boolean => {
  if (!serie) return true
  const codigo = codigoDisciplina.toUpperCase()
  const anosIniciais = isAnosIniciais(serie)

  // PROD só existe em anos iniciais
  if (codigo === 'PROD' || codigo === 'PRODUCAO') {
    return anosIniciais
  }
  // CH e CN só existem em anos finais
  if (codigo === 'CH' || codigo === 'CN') {
    return !anosIniciais
  }
  // LP e MAT existem em todas as séries
  return true
}

/**
 * Obtém cor do nível para exibição
 */
export const getNivelColor = (nivel: string | undefined | null): string => {
  if (!nivel) return 'text-gray-500 dark:text-gray-400'
  const n = nivel.toUpperCase()
  if (n === 'N1' || n === 'INSUFICIENTE') return 'text-red-600 dark:text-red-400'
  if (n === 'N2' || n === 'BÁSICO' || n === 'BASICO') return 'text-yellow-600 dark:text-yellow-400'
  if (n === 'N3' || n === 'ADEQUADO') return 'text-blue-600 dark:text-blue-400'
  if (n === 'N4' || n === 'AVANÇADO' || n === 'AVANCADO') return 'text-green-600 dark:text-green-400'
  return 'text-gray-500 dark:text-gray-400'
}

/**
 * Converte valor para número de forma segura
 * Substitui duplicações de `const toNum = (v: any) => ...`
 */
export const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  if (typeof value === 'string') return parseFloat(value) || 0
  return 0
}

/**
 * Converte array de valores para números
 */
export const toNumberArray = (values: unknown[]): number[] => {
  return values.map(toNumber)
}

/**
 * Soma um array de valores numéricos
 */
export const sumNumbers = (values: unknown[]): number => {
  return toNumberArray(values).reduce((acc, val) => acc + val, 0)
}

/**
 * Calcula média de um array de valores
 */
export const avgNumbers = (values: unknown[]): number => {
  const nums = toNumberArray(values).filter(n => n > 0)
  if (nums.length === 0) return 0
  return nums.reduce((acc, val) => acc + val, 0) / nums.length
}

/**
 * Normaliza série para o formato padrão "Xº Ano"
 * Retorna string vazia se série for null/undefined
 */
export const normalizarSerie = (serie: string | null | undefined): string => {
  if (!serie) return ''
  const trim = serie.trim()
  const match = trim.match(/^(\d+)/)
  if (match) {
    const num = parseInt(match[1])
    return `${num}º Ano`
  }
  return trim
}

/**
 * Ordena array de séries numericamente (2º, 3º, 5º, 6º, 7º, 8º, 9º)
 */
export const ordenarSeries = (series: string[]): string[] => {
  return [...series].sort((a, b) => {
    const numA = parseInt(a.match(/^(\d+)/)?.[1] || '0')
    const numB = parseInt(b.match(/^(\d+)/)?.[1] || '0')
    return numA - numB
  })
}
