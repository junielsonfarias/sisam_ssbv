/**
 * Gráfico: Níveis por Turma
 *
 * @module services/graficos/avancados/niveis-turma
 */

import pool from '@/database/connection'

import type {
  NiveisCounts,
  NiveisTurmaItem,
} from '../types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getMediaGeralSQLLocal,
} from '../helpers'

export async function fetchNiveisTurma(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<NiveisTurmaItem[]> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`
  const mediaGeralCalc = getMediaGeralSQLLocal()

  const query = `
    SELECT
      t.id as turma_id,
      t.codigo as turma_codigo,
      t.nome as turma_nome,
      t.serie as turma_serie,
      e.nome as escola_nome,
      CASE WHEN COUNT(CASE WHEN ${numeroSerieSQL} IN ('2', '3', '5') THEN 1 END) > 0 THEN true ELSE false END as anos_iniciais,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N1' THEN 1 END) as n1,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N2' THEN 1 END) as n2,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N3' THEN 1 END) as n3,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nivel_aluno = 'N4' THEN 1 END) as n4,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_lp IS NOT NULL THEN (${mediaGeralCalc}) ELSE NULL END), 2) as media_turma,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_alunos
    FROM resultados_consolidados_unificada rc
    INNER JOIN turmas t ON rc.turma_id = t.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereClause ? `${whereClause} AND rc.turma_id IS NOT NULL` : 'WHERE rc.turma_id IS NOT NULL'}
    GROUP BY t.id, t.codigo, t.nome, t.serie, e.nome
    HAVING COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) > 0
    ORDER BY media_turma DESC NULLS LAST
    ${deveRemoverLimites ? '' : 'LIMIT 50'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchNiveisTurma')

  return rows.length > 0
    ? rows.map((r) => {
        const niveis: NiveisCounts = {
          N1: parseDbInt(r.n1),
          N2: parseDbInt(r.n2),
          N3: parseDbInt(r.n3),
          N4: parseDbInt(r.n4)
        }
        const maxNivel = Object.entries(niveis).reduce((a, b) => b[1] > a[1] ? b : a)

        return {
          turma_id: r.turma_id,
          turma: r.turma_codigo || r.turma_nome || 'Turma',
          serie: r.turma_serie,
          escola: r.escola_nome,
          anos_iniciais: r.anos_iniciais,
          niveis,
          media_turma: parseDbNumber(r.media_turma),
          total_alunos: parseDbInt(r.total_alunos),
          nivel_predominante: maxNivel[0]
        }
      })
    : []
}
