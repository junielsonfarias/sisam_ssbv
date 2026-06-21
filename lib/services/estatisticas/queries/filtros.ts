/**
 * Helpers de filtro compartilhados das queries de estatísticas
 *
 * @module services/estatisticas/queries/filtros
 */

/**
 * Normaliza valor de série para SQL: extrai apenas o número
 * Converte '2º Ano', '2º ano', '2' → '2'
 */
export function extrairNumeroSerie(serie: string): string {
  const match = serie.match(/(\d+)/)
  return match ? match[1] : serie
}

/**
 * Adiciona filtro de série normalizado (funciona com '2' ou '2º Ano')
 */
export function addFiltroSerie(
  whereConditions: string[],
  params: (string | null)[],
  paramIndex: number,
  serie: string,
  alias: string = 'a'
): number {
  whereConditions.push(`COALESCE(${alias}.serie_numero, REGEXP_REPLACE(${alias}.serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`)
  params.push(extrairNumeroSerie(serie))
  return paramIndex + 1
}
