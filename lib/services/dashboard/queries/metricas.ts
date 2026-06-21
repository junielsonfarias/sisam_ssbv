/**
 * Queries do Dashboard: métricas e níveis
 *
 * @module services/dashboard/queries/metricas
 */

import pool from '@/database/connection'
import { safeQuery, getMediaGeralAvgSQL } from '@/lib/api-helpers'
import type { QueryParamValue } from '@/lib/types'
import type {
  MetricasDbRow,
  NivelDbRow,
} from '../types'

/**
 * Busca métricas gerais do dashboard (totais, médias, etc.)
 */
export async function fetchDashboardMetricas(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MetricasDbRow[]> {
  const sql = `
    SELECT
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.escola_id) as total_escolas,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(DISTINCT e.polo_id) as total_polos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as total_faltantes,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p')
          AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')
          AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0)
        THEN CAST(rc.nota_producao AS DECIMAL)
        ELSE NULL
      END), 2) as media_producao,
      MIN(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as menor_media,
      MAX(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as maior_media
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
  `
  return safeQuery<MetricasDbRow>(pool, sql, paramsBase, 'metricas')
}

/**
 * Busca distribuição por nível de aprendizagem (apenas anos iniciais)
 */
export async function fetchDashboardNiveis(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  _joinNivelAprendizagem: string
): Promise<NivelDbRow[]> {
  // Adicionar condições de anos iniciais e presença
  const baseConditions = whereClauseBase ? whereClauseBase.replace('WHERE ', '') : ''
  const niveisConditions = baseConditions ? [baseConditions] : []
  niveisConditions.push(`(COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5'))`)
  niveisConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  const niveisWhere = `WHERE ${niveisConditions.join(' AND ')}`

  const sql = `
    SELECT
      COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel,
      COUNT(*) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
    ${niveisWhere}
    GROUP BY COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
    ORDER BY
      CASE COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
        WHEN 'Insuficiente' THEN 1
        WHEN 'N1' THEN 1
        WHEN 'Básico' THEN 2
        WHEN 'N2' THEN 2
        WHEN 'Adequado' THEN 3
        WHEN 'N3' THEN 3
        WHEN 'Avançado' THEN 4
        WHEN 'N4' THEN 4
        ELSE 5
      END
  `
  return safeQuery<NivelDbRow>(pool, sql, paramsBase, 'niveis')
}
