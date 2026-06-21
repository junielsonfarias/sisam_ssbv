/**
 * Gráfico: Aprovação
 *
 * @module services/graficos/avancados/aprovacao
 */

import pool from '@/database/connection'

import type { AprovacaoItem } from '../types'

import {
  parseDbInt,
  parseDbNumber,
  safeQuery,
  getCampoNota,
} from '../helpers'

export async function fetchAprovacao(whereClause: string, params: (string | null)[], disciplina: string | null, deveRemoverLimites: boolean): Promise<{ aprovacao: AprovacaoItem[]; aprovacao_disciplina: string }> {
  const notaConfig = getCampoNota(disciplina)
  const whereAprovacao = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`

  const query = `
    SELECT
      COALESCE(e.nome, 'Geral') as categoria,
      COUNT(*) as total_alunos,
      SUM(CASE WHEN CAST(${notaConfig.campo} AS DECIMAL) >= 6.0 THEN 1 ELSE 0 END) as aprovados_6,
      SUM(CASE WHEN CAST(${notaConfig.campo} AS DECIMAL) >= 7.0 THEN 1 ELSE 0 END) as aprovados_7,
      SUM(CASE WHEN CAST(${notaConfig.campo} AS DECIMAL) >= 8.0 THEN 1 ELSE 0 END) as aprovados_8,
      ROUND(AVG(CAST(${notaConfig.campo} AS DECIMAL)), 2) as media_geral
    FROM resultados_consolidados_unificada rc
    LEFT JOIN escolas e ON rc.escola_id = e.id
    ${whereAprovacao}
    GROUP BY e.id, e.nome
    HAVING COUNT(*) > 0
    ORDER BY media_geral DESC NULLS LAST
    ${deveRemoverLimites ? '' : 'LIMIT 30'}
  `
  const rows = await safeQuery(pool, query, params, 'fetchAprovacao')
  return {
    aprovacao: rows.length > 0
      ? rows.map((r) => {
          const totalAlunos = parseDbInt(r.total_alunos) || 1
          return {
            categoria: r.categoria,
            total_alunos: totalAlunos,
            aprovados_6: parseDbInt(r.aprovados_6),
            aprovados_7: parseDbInt(r.aprovados_7),
            aprovados_8: parseDbInt(r.aprovados_8),
            taxa_6: Math.round((parseDbInt(r.aprovados_6) / totalAlunos) * 10000) / 100,
            taxa_7: Math.round((parseDbInt(r.aprovados_7) / totalAlunos) * 10000) / 100,
            taxa_8: Math.round((parseDbInt(r.aprovados_8) / totalAlunos) * 10000) / 100,
            media_geral: parseDbNumber(r.media_geral)
          }
        })
      : [],
    aprovacao_disciplina: notaConfig.label
  }
}
