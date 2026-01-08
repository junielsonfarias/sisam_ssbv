/**
 * Utilitários para tratamento consistente de valores numéricos
 * Padroniza o tratamento de NULL, undefined, strings vazias e NaN em toda a aplicação
 *
 * @module lib/utils-numeros
 */

/** Tipo para valores que podem ser convertidos para número */
type NumericValue = string | number | null | undefined

/**
 * Converte qualquer valor para número, tratando NULL, undefined, string vazia e NaN
 * @param valor - Valor a ser convertido
 * @param valorPadrao - Valor padrão caso a conversão falhe (default: 0)
 * @returns Número válido ou valor padrão
 */
export function toNumber(valor: NumericValue, valorPadrao: number = 0): number {
  if (valor === null || valor === undefined || valor === '') {
    return valorPadrao
  }

  const num = typeof valor === 'string' ? parseFloat(valor) : Number(valor)
  return isNaN(num) ? valorPadrao : num
}

/**
 * Converte valor para número inteiro
 * @param valor - Valor a ser convertido
 * @param valorPadrao - Valor padrão caso a conversão falhe (default: 0)
 * @returns Número inteiro válido ou valor padrão
 */
export function toInt(valor: NumericValue, valorPadrao: number = 0): number {
  if (valor === null || valor === undefined || valor === '') {
    return valorPadrao
  }

  const num = typeof valor === 'string' ? parseInt(valor, 10) : Math.floor(Number(valor))
  return isNaN(num) ? valorPadrao : num
}

/**
 * Formata número para exibição com casas decimais
 * @param valor - Valor a ser formatado
 * @param casasDecimais - Número de casas decimais (default: 2)
 * @param valorPadrao - Texto a exibir caso valor seja inválido (default: '-')
 * @returns String formatada
 */
export function formatarNumero(
  valor: NumericValue,
  casasDecimais: number = 2,
  valorPadrao: string = '-'
): string {
  const num = toNumber(valor)

  if (num === 0 && (valor === null || valor === undefined || valor === '')) {
    return valorPadrao
  }

  return num.toFixed(casasDecimais)
}

/**
 * Formata nota para exibição (sempre 2 casas decimais para notas)
 * @param nota - Nota a ser formatada
 * @param valorPadrao - Texto a exibir caso nota seja inválida (default: '-')
 * @returns String formatada
 */
export function formatarNota(nota: NumericValue, valorPadrao: string = '-'): string {
  return formatarNumero(nota, 2, valorPadrao)
}

/**
 * Formata percentual para exibição (1 casa decimal + %)
 * @param valor - Valor percentual a ser formatado
 * @param valorPadrao - Texto a exibir caso valor seja inválido (default: '-')
 * @returns String formatada com %
 */
export function formatarPercentual(valor: NumericValue, valorPadrao: string = '-'): string {
  const num = toNumber(valor)

  if (num === 0 && (valor === null || valor === undefined || valor === '')) {
    return valorPadrao
  }

  return `${num.toFixed(1)}%`
}

/**
 * Calcula média de um array de valores, ignorando NULL e 0
 * @param valores - Array de valores
 * @param ignorarZeros - Se deve ignorar zeros no cálculo (default: true)
 * @returns Média calculada ou 0
 */
export function calcularMedia(valores: NumericValue[], ignorarZeros: boolean = true): number {
  const numeros = valores
    .map(v => toNumber(v))
    .filter(n => !isNaN(n) && (ignorarZeros ? n > 0 : true))

  if (numeros.length === 0) return 0

  const soma = numeros.reduce((acc, n) => acc + n, 0)
  return soma / numeros.length
}

/**
 * Calcula soma de um array de valores
 * @param valores - Array de valores
 * @returns Soma calculada
 */
export function calcularSoma(valores: NumericValue[]): number {
  return valores.reduce<number>((acc, v) => acc + toNumber(v), 0)
}

/**
 * Verifica se um valor é considerado "vazio" para fins de exibição
 * @param valor - Valor a verificar
 * @returns true se o valor é null, undefined, string vazia ou NaN
 */
export function isVazio(valor: unknown): boolean {
  if (valor === null || valor === undefined || valor === '') {
    return true
  }
  if (typeof valor === 'number' && isNaN(valor)) {
    return true
  }
  return false
}

/**
 * Retorna valor ou alternativa se o valor for vazio
 * @param valor - Valor a verificar
 * @param alternativa - Valor alternativo
 * @returns Valor original ou alternativa
 */
export function valorOuPadrao<T>(valor: T | null | undefined, alternativa: T): T {
  if (valor === null || valor === undefined) {
    return alternativa
  }
  return valor
}

/**
 * Parse seguro de resultado de query do banco de dados
 * Converte string numérica retornada pelo PostgreSQL para número
 * @param valor - Valor retornado pelo banco
 * @param valorPadrao - Valor padrão
 * @returns Número ou valor padrão
 */
export function parseDbNumber(valor: NumericValue, valorPadrao: number = 0): number {
  if (valor === null || valor === undefined) {
    return valorPadrao
  }

  // PostgreSQL pode retornar números como strings
  const parsed = typeof valor === 'string' ? parseFloat(valor) : Number(valor)
  return isNaN(parsed) ? valorPadrao : parsed
}

/**
 * Parse seguro de inteiro de resultado de query do banco de dados
 * @param valor - Valor retornado pelo banco
 * @param valorPadrao - Valor padrão
 * @returns Inteiro ou valor padrão
 */
export function parseDbInt(valor: NumericValue, valorPadrao: number = 0): number {
  if (valor === null || valor === undefined) {
    return valorPadrao
  }

  const parsed = typeof valor === 'string' ? parseInt(valor, 10) : Math.floor(Number(valor))
  return isNaN(parsed) ? valorPadrao : parsed
}
