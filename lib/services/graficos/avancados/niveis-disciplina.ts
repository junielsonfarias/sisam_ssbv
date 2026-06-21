/**
 * Gráfico: Níveis por Disciplina
 *
 * @module services/graficos/avancados/niveis-disciplina
 */

import pool from '@/database/connection'

import type { NiveisDisciplinaData } from '../types'

import {
  parseDbInt,
  safeQuery,
} from '../helpers'

export async function fetchNiveisDisciplina(whereClause: string, params: (string | null)[]): Promise<NiveisDisciplinaData | null> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

  const query = `
    SELECT
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N1' THEN 1 END) as lp_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N2' THEN 1 END) as lp_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N3' THEN 1 END) as lp_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_lp = 'N4' THEN 1 END) as lp_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N1' THEN 1 END) as mat_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N2' THEN 1 END) as mat_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N3' THEN 1 END) as mat_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_mat = 'N4' THEN 1 END) as mat_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N1' THEN 1 END) as prod_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N2' THEN 1 END) as prod_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N3' THEN 1 END) as prod_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nivel_prod = 'N4' THEN 1 END) as prod_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N1' THEN 1 END) as aluno_n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N2' THEN 1 END) as aluno_n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N3' THEN 1 END) as aluno_n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N4' THEN 1 END) as aluno_n4,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
      COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) as count_anos_iniciais,
      COUNT(CASE WHEN ${numeroSerieSQL} IN ('6', '7', '8', '9') THEN 1 END) as count_anos_finais
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause}
  `
  const rows = await safeQuery(pool, query, params, 'fetchNiveisDisciplina')

  if (rows.length > 0) {
    const row = rows[0]
    return {
      LP: { N1: parseDbInt(row.lp_n1), N2: parseDbInt(row.lp_n2), N3: parseDbInt(row.lp_n3), N4: parseDbInt(row.lp_n4) },
      MAT: { N1: parseDbInt(row.mat_n1), N2: parseDbInt(row.mat_n2), N3: parseDbInt(row.mat_n3), N4: parseDbInt(row.mat_n4) },
      PROD: { N1: parseDbInt(row.prod_n1), N2: parseDbInt(row.prod_n2), N3: parseDbInt(row.prod_n3), N4: parseDbInt(row.prod_n4) },
      GERAL: { N1: parseDbInt(row.aluno_n1), N2: parseDbInt(row.aluno_n2), N3: parseDbInt(row.aluno_n3), N4: parseDbInt(row.aluno_n4) },
      total_presentes: parseDbInt(row.total_presentes),
      tem_anos_iniciais: parseDbInt(row.count_anos_iniciais) > 0,
      tem_anos_finais: parseDbInt(row.count_anos_finais) > 0
    }
  }

  return null
}
