/**
 * Comparativo entre polos.
 *
 * @module services/comparativos/polos
 */

import pool from '@/database/connection'
import { createWhereBuilder, addCondition } from '@/lib/api-helpers'
import {
  getContagemAlunosSQL,
  getFromJoinsSQL,
  getMediaGeralAgregadaSQL,
  getMediasDisciplinasSQL,
  PRESENCA_BASE,
} from './sql'
import { agruparPorSerie } from './filtros'
import type {
  FiltrosComparativoPolos,
  ResultadoComparativoPolos,
} from './types'

/**
 * Busca dados para comparativo entre polos.
 * Executa 3 queries:
 * 1. Dados por turma (polo + série + turma)
 * 2. Dados agregados por polo/série (sem turma)
 * 3. Dados por escola dentro de cada polo
 *
 * Usado por: admin/comparativos-polos
 */
export async function buscarComparativoPolos(
  filtros: FiltrosComparativoPolos
): Promise<ResultadoComparativoPolos> {
  const { polosIds, anoLetivo, serie, escolaId, turmaId, avaliacaoId } = filtros

  // Builder compartilhado para as 3 queries (mesmos filtros, paramIndex começa em 3)
  const where = createWhereBuilder(3)
  if (anoLetivo && anoLetivo.trim() !== '') addCondition(where, 'rc.ano_letivo', anoLetivo.trim())
  addCondition(where, 'rc.avaliacao_id', avaliacaoId)
  addCondition(where, 'rc.serie', serie)
  if (escolaId && escolaId !== '' && escolaId !== 'undefined' && escolaId.toLowerCase() !== 'todas') {
    addCondition(where, 'e.id', escolaId)
  }
  if (turmaId && turmaId !== '' && turmaId !== 'undefined') {
    addCondition(where, 'rc.turma_id', turmaId)
  }

  const sharedParams: (string | number | boolean | null)[] = [polosIds[0], polosIds[1], ...where.params]
  const extraWhere = where.conditions.length > 0 ? ' AND ' + where.conditions.join(' AND ') : ''

  // ===== QUERY 1: DADOS POR TURMA =====
  let query = `
      SELECT
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        t.id as turma_id,
        t.codigo as turma_codigo,
        ${getContagemAlunosSQL()},
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT t.id) as total_turmas,
        ${getMediaGeralAgregadaSQL()} as media_geral,
        ${getMediasDisciplinasSQL()}
      ${getFromJoinsSQL()}
      WHERE p.id IN ($1, $2)
        AND ${PRESENCA_BASE}
    `

  query += extraWhere + `
      GROUP BY
        p.id, p.nome, rc.serie, t.id, t.codigo
      ORDER BY
        p.nome, rc.serie, t.codigo
    `

  const result = await pool.query(query, sharedParams)
  const dadosPorSerie = agruparPorSerie(result.rows)

  // ===== QUERY 2: DADOS AGREGADOS POR POLO/SÉRIE =====
  let queryAgregado = `
      SELECT
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        ${getContagemAlunosSQL()},
        COUNT(DISTINCT e.id) as total_escolas,
        COUNT(DISTINCT t.id) as total_turmas,
        ${getMediaGeralAgregadaSQL()} as media_geral,
        ${getMediasDisciplinasSQL()}
      ${getFromJoinsSQL()}
      WHERE p.id IN ($1, $2)
        AND ${PRESENCA_BASE}
    `

  queryAgregado += extraWhere + `
      GROUP BY
        p.id, p.nome, rc.serie
      ORDER BY
        rc.serie, media_geral DESC NULLS LAST
    `

  const resultAgregado = await pool.query(queryAgregado, sharedParams)
  const dadosPorSerieAgregado = agruparPorSerie(resultAgregado.rows)

  // Ordenar por média geral descendente dentro de cada série
  Object.keys(dadosPorSerieAgregado).forEach((serieKey) => {
    dadosPorSerieAgregado[serieKey].sort((a, b) => {
      const mediaA = parseFloat(a.media_geral) || 0
      const mediaB = parseFloat(b.media_geral) || 0
      return mediaB - mediaA
    })
  })

  // ===== QUERY 3: DADOS POR ESCOLA DENTRO DE CADA POLO =====
  let queryEscolas = `
      SELECT
        p.id as polo_id,
        p.nome as polo_nome,
        e.id as escola_id,
        e.nome as escola_nome,
        rc.serie,
        ${getContagemAlunosSQL()},
        COUNT(DISTINCT t.id) as total_turmas,
        ${getMediaGeralAgregadaSQL()} as media_geral,
        ${getMediasDisciplinasSQL()}
      ${getFromJoinsSQL()}
      WHERE p.id IN ($1, $2)
        AND ${PRESENCA_BASE}
    `

  queryEscolas += extraWhere + `
      GROUP BY
        p.id, p.nome, e.id, e.nome, rc.serie
      ORDER BY
        p.id, rc.serie, media_geral DESC NULLS LAST
    `

  const resultEscolas = await pool.query(queryEscolas, sharedParams)

  // Agrupar por série e polo
  const dadosPorSerieEscola: Record<string, Record<string, any[]>> = {}

  resultEscolas.rows.forEach((row) => {
    const serieKey = row.serie || 'Sem série'
    const poloKey = row.polo_id
    if (!dadosPorSerieEscola[serieKey]) {
      dadosPorSerieEscola[serieKey] = {}
    }
    if (!dadosPorSerieEscola[serieKey][poloKey]) {
      dadosPorSerieEscola[serieKey][poloKey] = []
    }
    dadosPorSerieEscola[serieKey][poloKey].push(row)
  })

  // Ordenar por média geral descendente dentro de cada polo
  Object.keys(dadosPorSerieEscola).forEach((serieKey) => {
    Object.keys(dadosPorSerieEscola[serieKey]).forEach((poloKey) => {
      dadosPorSerieEscola[serieKey][poloKey].sort((a, b) => {
        const mediaA = parseFloat(a.media_geral) || 0
        const mediaB = parseFloat(b.media_geral) || 0
        return mediaB - mediaA
      })
    })
  })

  return {
    dadosPorSerie,
    dadosPorSerieAgregado,
    dadosPorSerieEscola,
    polos: polosIds,
  }
}
