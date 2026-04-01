/**
 * SQL builders centralizados para cálculo de média geral
 * Elimina duplicação de CASE WHEN que aparecia 126+ vezes no projeto
 *
 * Usado por: dashboard.service, graficos.service, comparativos.service,
 *            relatorios, divergencias, resultados-consolidados
 */

/**
 * SQL para normalizar número da série
 */
export function getSerieNumeroSQL(alias: string = 'rc'): string {
  return `COALESCE(${alias}.serie_numero, REGEXP_REPLACE(${alias}.serie::text, '[^0-9]', '', 'g'))`
}

/**
 * SQL para verificar se é anos iniciais (2, 3, 5)
 */
export function isAnosIniciaisSQL(alias: string = 'rc'): string {
  return `${getSerieNumeroSQL(alias)} IN ('2','3','5')`
}

/**
 * SQL para média de anos iniciais (LP + MAT + PROD / 3)
 */
export function getMediaAnosIniciaisSQL(alias: string = 'rc'): string {
  return `(COALESCE(CAST(${alias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_producao AS DECIMAL), 0)) / 3.0`
}

/**
 * SQL para média de anos finais (LP + CH + MAT + CN / 4)
 */
export function getMediaAnosFinaisSQL(alias: string = 'rc'): string {
  return `(COALESCE(CAST(${alias}.nota_lp AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_ch AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_mat AS DECIMAL), 0) + COALESCE(CAST(${alias}.nota_cn AS DECIMAL), 0)) / 4.0`
}

/**
 * SQL CASE para média geral (anos iniciais vs finais) com mesmo alias
 */
export function getMediaGeralSQL(alias: string = 'rc'): string {
  return `CASE
    WHEN ${isAnosIniciaisSQL(alias)}
    THEN ${getMediaAnosIniciaisSQL(alias)}
    ELSE ${getMediaAnosFinaisSQL(alias)}
  END`
}

/**
 * SQL CASE com aliases diferentes para anos iniciais (ex: rc_table) vs finais (ex: rc)
 */
export function getMediaGeralMixedSQL(serieAlias: string = 'rc', aiAlias: string = 'rc_table', afAlias: string = 'rc'): string {
  return `CASE
    WHEN ${isAnosIniciaisSQL(serieAlias)} THEN
      ${getMediaAnosIniciaisSQL(aiAlias)}
    ELSE
      ${getMediaAnosFinaisSQL(afAlias)}
  END`
}

/**
 * Variante ROUND(..., 2) do cálculo de média mista
 */
export function getMediaGeralMixedRoundedSQL(serieAlias: string = 'rc', aiAlias: string = 'rc_table', afAlias: string = 'rc'): string {
  return `CASE
    WHEN ${isAnosIniciaisSQL(serieAlias)} THEN
      ROUND(${getMediaAnosIniciaisSQL(aiAlias)}, 2)
    ELSE
      ROUND(${getMediaAnosFinaisSQL(afAlias)}, 2)
  END`
}

/**
 * SQL AVG com filtro de presença para queries agregadas
 */
export function getMediaGeralAvgSQL(alias: string = 'rc'): string {
  return `ROUND(AVG(CASE
    WHEN ${getPresencaSQL(alias)} THEN
      ${getMediaGeralSQL(alias)}
    ELSE NULL
  END), 2)`
}

/**
 * SQL para filtrar presença válida (P ou p)
 */
export function getPresencaSQL(alias: string = 'rc'): string {
  return `(${alias}.presenca = 'P' OR ${alias}.presenca = 'p')`
}

/**
 * SQL para filtrar presença completa (P, p, F, f)
 */
export function getPresencaCompletaSQL(alias: string = 'rc'): string {
  return `(${alias}.presenca IN ('P', 'p', 'F', 'f'))`
}
