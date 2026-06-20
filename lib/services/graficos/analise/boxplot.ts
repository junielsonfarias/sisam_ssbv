/**
 * Gráfico: Boxplot
 *
 * @module services/graficos/analise/boxplot
 */

import pool from '@/database/connection'

import type { BoxplotItem } from '../types'

import {
  safeQuery,
  getCampoNota,
} from '../helpers'

export async function fetchBoxplot(whereClause: string, params: (string | null)[], disciplina: string | null): Promise<{ boxplot: BoxplotItem[]; boxplot_disciplina: string }> {
  const notaConfig = getCampoNota(disciplina)
  const whereBoxPlot = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${notaConfig.campo} IS NOT NULL AND CAST(${notaConfig.campo} AS DECIMAL) > 0`

  const query = `
    SELECT
      COALESCE(e.nome, rc.serie, 'Geral') as categoria,
      CAST(${notaConfig.campo} AS DECIMAL) as nota
    FROM resultados_consolidados_unificada rc
    LEFT JOIN escolas e ON rc.escola_id = e.id
    ${whereBoxPlot}
    ORDER BY categoria, nota
  `
  const rows = await safeQuery(pool, query, params, 'fetchBoxplot')

  const categorias: { [key: string]: number[] } = {}
  rows.forEach((r) => {
    const cat = String(r.categoria ?? 'Geral')
    if (!categorias[cat]) categorias[cat] = []
    const nota = parseFloat(String(r.nota))
    if (!isNaN(nota)) {
      categorias[cat].push(nota)
    }
  })

  const boxplotData = Object.keys(categorias).length > 0
    ? Object.entries(categorias)
      .filter(([_, notas]) => notas.length > 0)
      .map(([categoria, notas]) => {
        notas.sort((a, b) => a - b)
        const q1 = notas.length > 0 ? notas[Math.floor(notas.length * 0.25)] : 0
        const mediana = notas.length > 0 ? notas[Math.floor(notas.length * 0.5)] : 0
        const q3 = notas.length > 0 ? notas[Math.floor(notas.length * 0.75)] : 0
        const min = notas.length > 0 ? notas[0] : 0
        const max = notas.length > 0 ? notas[notas.length - 1] : 0
        const media = notas.length > 0 ? notas.reduce((a, b) => a + b, 0) / notas.length : 0

        return {
          categoria,
          min: Math.round(min * 100) / 100,
          q1: Math.round(q1 * 100) / 100,
          mediana: Math.round(mediana * 100) / 100,
          q3: Math.round(q3 * 100) / 100,
          max: Math.round(max * 100) / 100,
          media: Math.round(media * 100) / 100,
          total: notas.length
        }
      })
      .slice(0, 20)
    : []

  return { boxplot: boxplotData, boxplot_disciplina: notaConfig.label }
}
