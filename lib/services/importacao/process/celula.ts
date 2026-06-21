/**
 * Helpers de leitura de celula do Excel para a Fase 5.
 *
 * @module services/importacao/process/celula
 */

export type CelulaExcel = string | number | null | undefined

/**
 * Faz cast cru de um valor desconhecido para o tipo de celula do Excel.
 */
export const cel = (v: unknown): CelulaExcel => v as CelulaExcel

/**
 * Extrai um numero inteiro de uma celula, ignorando caracteres nao numericos.
 * Retorna 0 quando vazio ou invalido.
 */
export function extrairNumero(valor: CelulaExcel): number {
  if (!valor) return 0
  const num = parseInt(String(valor).replace(/[^\d]/g, ''))
  return isNaN(num) ? 0 : num
}

/**
 * Extrai um numero decimal de uma celula, aceitando virgula como separador.
 * Retorna null quando vazio ou invalido.
 */
export function extrairDecimal(valor: CelulaExcel): number | null {
  if (!valor || valor === '') return null
  const str = String(valor).replace(',', '.').trim()
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}
