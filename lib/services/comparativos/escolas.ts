/**
 * Comparativo entre escolas.
 *
 * @module services/comparativos/escolas
 */

import pool from '@/database/connection'
import {
  getContagemAlunosSQL,
  getFromJoinsSQL,
  getMediaGeralAgregadaSQL,
  getMediaGeralAlunoSQL,
  getMediasDisciplinasSQL,
  PRESENCA_BASE,
} from './sql'
import { agruparPorSerie, encontrarMelhor, getFiltroTipoEnsinoSQL } from './filtros'
import type {
  FiltrosComparativoEscolas,
  ResultadoComparativoEscolas,
} from './types'

/**
 * Busca dados para comparativo entre escolas.
 * Executa 3 queries:
 * 1. Dados por turma (escola + série + turma)
 * 2. Dados agregados por escola/série (sem turma)
 * 3. Melhores alunos por escola/série
 *
 * Usado por: admin/comparativos
 */
export async function buscarComparativoEscolas(
  filtros: FiltrosComparativoEscolas
): Promise<ResultadoComparativoEscolas> {
  const { escolasIds, poloId, usuario, tipoEnsino, anoLetivo, avaliacaoId, serie, turmaId } = filtros

  // ===== QUERY 1: DADOS POR TURMA =====
  const params1: (string | number | boolean | null)[] = []
  let paramIndex1 = 1

  let query = `
      SELECT
        e.id as escola_id,
        e.nome as escola_nome,
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        t.id as turma_id,
        t.codigo as turma_codigo,
        ${getContagemAlunosSQL()},
        ${getMediaGeralAgregadaSQL()} as media_geral,
        ${getMediasDisciplinasSQL()}
      ${getFromJoinsSQL()}
      WHERE ${PRESENCA_BASE}
    `

  // Restrições de acesso
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    query += ` AND e.polo_id = $${paramIndex1}`
    params1.push(usuario.polo_id)
    paramIndex1++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    query += ` AND e.id = $${paramIndex1}`
    params1.push(usuario.escola_id)
    paramIndex1++
  }

  // Filtro de escolas
  if (escolasIds.length > 0) {
    const placeholders = escolasIds.map((_, i) => `$${paramIndex1 + i}`).join(',')
    query += ` AND e.id IN (${placeholders})`
    params1.push(...escolasIds)
    paramIndex1 += escolasIds.length
  }

  if (poloId) {
    query += ` AND e.polo_id = $${paramIndex1}`
    params1.push(poloId)
    paramIndex1++
  }

  if (anoLetivo && anoLetivo.trim() !== '') {
    query += ` AND rc.ano_letivo = $${paramIndex1}`
    params1.push(anoLetivo.trim())
    paramIndex1++
  }

  if (avaliacaoId) {
    query += ` AND rc.avaliacao_id = $${paramIndex1}`
    params1.push(avaliacaoId)
    paramIndex1++
  }

  if (serie) {
    query += ` AND rc.serie = $${paramIndex1}`
    params1.push(serie)
    paramIndex1++
  }

  if (turmaId) {
    query += ` AND rc.turma_id = $${paramIndex1}`
    params1.push(turmaId)
    paramIndex1++
  }

  query += getFiltroTipoEnsinoSQL(tipoEnsino)

  query += `
      GROUP BY
        e.id, e.nome, p.id, p.nome, rc.serie, t.id, t.codigo
      ORDER BY
        p.nome, e.nome, rc.serie, t.codigo
    `

  const result = await pool.query(query, params1)
  const dadosPorSerie = agruparPorSerie(result.rows)

  // ===== QUERY 2: DADOS AGREGADOS POR ESCOLA/SÉRIE =====
  const paramsAgregado: (string | number | boolean | null)[] = []
  let paramIndexAgregado = 1

  let queryAgregado = `
      SELECT
        e.id as escola_id,
        e.nome as escola_nome,
        p.id as polo_id,
        p.nome as polo_nome,
        rc.serie,
        NULL as turma_id,
        NULL as turma_codigo,
        ${getContagemAlunosSQL()},
        ${getMediaGeralAgregadaSQL()} as media_geral,
        ${getMediasDisciplinasSQL()},
        COUNT(DISTINCT t.id) as total_turmas
      ${getFromJoinsSQL()}
      WHERE ${PRESENCA_BASE}
    `

  // Restrições de acesso (mesmas da query 1)
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    queryAgregado += ` AND e.polo_id = $${paramIndexAgregado}`
    paramsAgregado.push(usuario.polo_id)
    paramIndexAgregado++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    queryAgregado += ` AND e.id = $${paramIndexAgregado}`
    paramsAgregado.push(usuario.escola_id)
    paramIndexAgregado++
  }

  if (escolasIds.length > 0) {
    const placeholders = escolasIds.map((_, i) => `$${paramIndexAgregado + i}`).join(',')
    queryAgregado += ` AND e.id IN (${placeholders})`
    paramsAgregado.push(...escolasIds)
    paramIndexAgregado += escolasIds.length
  }

  if (poloId) {
    queryAgregado += ` AND e.polo_id = $${paramIndexAgregado}`
    paramsAgregado.push(poloId)
    paramIndexAgregado++
  }

  if (anoLetivo && anoLetivo.trim() !== '') {
    queryAgregado += ` AND rc.ano_letivo = $${paramIndexAgregado}`
    paramsAgregado.push(anoLetivo.trim())
    paramIndexAgregado++
  }

  if (avaliacaoId) {
    queryAgregado += ` AND rc.avaliacao_id = $${paramIndexAgregado}`
    paramsAgregado.push(avaliacaoId)
    paramIndexAgregado++
  }

  if (serie) {
    queryAgregado += ` AND rc.serie = $${paramIndexAgregado}`
    paramsAgregado.push(serie)
    paramIndexAgregado++
  }

  // NÃO incluir filtro de turma_id na query agregada
  queryAgregado += getFiltroTipoEnsinoSQL(tipoEnsino)

  queryAgregado += `
      GROUP BY
        e.id, e.nome, p.id, p.nome, rc.serie
      ORDER BY
        p.nome, e.nome, rc.serie
    `

  const resultAgregado = await pool.query(queryAgregado, paramsAgregado)
  const dadosPorSerieAgregado = agruparPorSerie(resultAgregado.rows)

  // ===== QUERY 3: MELHORES ALUNOS POR ESCOLA/SÉRIE =====
  const melhoresAlunos: Record<string, Record<string, any>> = {}

  for (const row of resultAgregado.rows) {
    const escolaIdRow = row.escola_id
    const serieKey = row.serie || 'Sem série'
    const key = `${escolaIdRow}_${serieKey}`

    if (!melhoresAlunos[key]) {
      let queryMelhores = `
          SELECT
            rc.aluno_id,
            a.nome as aluno_nome,
            t.id as turma_id,
            t.codigo as turma_codigo,
            ${getMediaGeralAlunoSQL()} as media_geral,
            CAST(rc.nota_lp AS DECIMAL) as nota_lp,
            CAST(rc.nota_ch AS DECIMAL) as nota_ch,
            CAST(rc.nota_mat AS DECIMAL) as nota_mat,
            CAST(rc.nota_cn AS DECIMAL) as nota_cn,
            CAST(rc.nota_producao AS DECIMAL) as nota_producao
          FROM resultados_consolidados_unificada rc
          INNER JOIN alunos a ON rc.aluno_id = a.id
          LEFT JOIN turmas t ON rc.turma_id = t.id
          WHERE rc.escola_id = $1 AND rc.serie = $2
        `

      const paramsMelhores: (string | number | boolean | null)[] = [escolaIdRow, serieKey]
      let paramIndexMelhores = 3

      // Restrições de acesso
      if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
        queryMelhores += ` AND rc.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndexMelhores})`
        paramsMelhores.push(usuario.polo_id)
        paramIndexMelhores++
      } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
        queryMelhores += ` AND rc.escola_id = $${paramIndexMelhores}`
        paramsMelhores.push(usuario.escola_id)
        paramIndexMelhores++
      }

      if (anoLetivo && anoLetivo.trim() !== '') {
        queryMelhores += ` AND rc.ano_letivo = $${paramIndexMelhores}`
        paramsMelhores.push(anoLetivo.trim())
        paramIndexMelhores++
      }

      if (avaliacaoId) {
        queryMelhores += ` AND rc.avaliacao_id = $${paramIndexMelhores}`
        paramsMelhores.push(avaliacaoId)
        paramIndexMelhores++
      }

      queryMelhores += ` AND (rc.presenca = 'P' OR rc.presenca = 'p')`

      const resultMelhores = await pool.query(queryMelhores, paramsMelhores)

      if (resultMelhores.rows.length > 0) {
        const alunos = resultMelhores.rows

        const melhorGeral = encontrarMelhor(alunos, 'media_geral')
        const melhorLP = encontrarMelhor(alunos, 'nota_lp')
        const melhorCH = encontrarMelhor(alunos, 'nota_ch')
        const melhorMAT = encontrarMelhor(alunos, 'nota_mat')
        const melhorCN = encontrarMelhor(alunos, 'nota_cn')
        const melhorPROD = encontrarMelhor(alunos, 'nota_producao')

        // Melhor aluno por turma
        const alunosPorTurma: Record<string, any[]> = {}
        alunos.forEach((aluno: any) => {
          const turmaKey = aluno.turma_id || 'sem-turma'
          if (!alunosPorTurma[turmaKey]) {
            alunosPorTurma[turmaKey] = []
          }
          alunosPorTurma[turmaKey].push(aluno)
        })

        const melhoresPorTurma: any[] = []
        Object.entries(alunosPorTurma).forEach(([, alunosTurma]) => {
          const melhor = encontrarMelhor(alunosTurma, 'media_geral')
          melhoresPorTurma.push(melhor)
        })

        melhoresAlunos[key] = {
          melhorGeral,
          melhorLP,
          melhorCH,
          melhorMAT,
          melhorCN,
          melhorPROD,
          melhoresPorTurma,
        }
      }
    }
  }

  return {
    dados: result.rows,
    dadosPorSerie,
    dadosPorSerieAgregado,
    melhoresAlunos,
    totalEscolas: new Set(result.rows.map((r: any) => r.escola_id)).size,
    totalSeries: Object.keys(dadosPorSerie).length,
  }
}
