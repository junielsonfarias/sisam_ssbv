/**
 * Queries do Dashboard: médias por série, polo, escola e turma
 *
 * @module services/dashboard/queries/medias
 */

import pool from '@/database/connection'
import { safeQuery, getMediaGeralAvgSQL, getMediaGeralMixedSQL } from '@/lib/api-helpers'
import type { QueryParamValue } from '@/lib/types'
import type {
  MediaSerieDbRow,
  MediaPoloDbRow,
  MediaEscolaDbRow,
  MediaTurmaDbRow,
} from '../types'

/**
 * Busca médias por série
 */
export async function fetchMediasPorSerie(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaSerieDbRow[]> {
  const sql = `
    SELECT
      rc.serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY rc.serie
    HAVING rc.serie IS NOT NULL
    ORDER BY COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'))::integer NULLS LAST
  `
  return safeQuery<MediaSerieDbRow>(pool, sql, paramsBase, 'mediasPorSerie')
}

/**
 * Busca médias por polo
 */
export async function fetchMediasPorPolo(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaPoloDbRow[]> {
  const sql = `
    SELECT
      p.id as polo_id,
      p.nome as polo,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    INNER JOIN polos p ON e.polo_id = p.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY p.id, p.nome
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery<MediaPoloDbRow>(pool, sql, paramsBase, 'mediasPorPolo')
}

/**
 * Busca médias por escola
 */
export async function fetchMediasPorEscola(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaEscolaDbRow[]> {
  const sql = `
    SELECT
      e.id as escola_id,
      e.nome as escola,
      p.nome as polo,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN polos p ON e.polo_id = p.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY e.id, e.nome, p.nome
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery<MediaEscolaDbRow>(pool, sql, paramsBase, 'mediasPorEscola')
}

/**
 * Busca médias por turma
 */
export async function fetchMediasPorTurma(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaTurmaDbRow[]> {
  const sql = `
    SELECT
      t.id as turma_id,
      t.codigo as turma,
      e.nome as escola,
      t.serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          ${getMediaGeralMixedSQL('t', 'rc', 'rc')}
        ELSE NULL
      END), 2) as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY t.id, t.codigo, t.nome, e.id, e.nome, t.serie
    HAVING t.id IS NOT NULL
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery<MediaTurmaDbRow>(pool, sql, paramsBase, 'mediasPorTurma')
}
