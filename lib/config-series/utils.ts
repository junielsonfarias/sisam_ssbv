/**
 * Funções utilitárias de séries
 *
 * @module config-series/utils
 */

/**
 * Extrai apenas o número da série (ex: "8º Ano" -> "8", "5º" -> "5")
 */
export function extrairNumeroSerie(serie: string | null | undefined): string | null {
  if (!serie) return null
  const match = serie.toString().match(/(\d+)/)
  return match ? match[1] : null
}

/**
 * Verifica se uma série é dos Anos Iniciais (2º, 3º ou 5º)
 */
export function isAnosIniciais(serie: string | null | undefined): boolean {
  const numero = extrairNumeroSerie(serie)
  return numero === '2' || numero === '3' || numero === '5'
}

/**
 * Verifica se uma série tem Ciências Humanas e Ciências da Natureza (anos finais)
 */
export function serieTemCHCN(serie: string | null | undefined): boolean {
  const numero = extrairNumeroSerie(serie)
  return numero === '6' || numero === '7' || numero === '8' || numero === '9'
}

/**
 * Verifica se uma série tem Produção Textual (anos iniciais)
 */
export function serieTemProducaoTextual(serie: string | null | undefined): boolean {
  return isAnosIniciais(serie)
}
