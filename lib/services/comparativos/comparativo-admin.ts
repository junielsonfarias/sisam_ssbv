/**
 * Comparativo entre escolas/série para o endpoint GET /api/admin/comparativos.
 *
 * Decomposição da rota (que estava acima de 400 linhas). Mantém EXATAMENTE
 * o comportamento original da rota: queries por turma, agregada por série e
 * melhores alunos (query única + agrupamento em memória).
 *
 * Diferente de `buscarComparativoEscolas` (escolas.ts), que usa divisor
 * dinâmico para a média de melhores alunos. Aqui a média geral usa divisor
 * fixo (getMediaGeralSQL), preservando o contrato histórico deste endpoint.
 *
 * @module services/comparativos/comparativo-admin
 */

import pool from '@/database/connection'
import { getMediaGeralSQL } from '@/lib/sql/media-geral'
import {
  getContagemAlunosSQL,
  getFromJoinsSQL,
  getMediaGeralAgregadaSQL,
  getMediasDisciplinasSQL,
  PRESENCA_BASE,
} from './sql'
import { agruparPorSerie, getFiltroTipoEnsinoSQL } from './filtros'
import type {
  FiltrosComparativoEscolas,
  ResultadoComparativoEscolas,
} from './types'

type Param = string | number | boolean | null | undefined

interface AcumuladorFiltros {
  query: string
  params: Param[]
  paramIndex: number
}

/**
 * Aplica restrição de acesso (polo/escola) + filtros comuns à query.
 * Centraliza a montagem reutilizada pelas duas queries principais.
 * `incluirTurma` controla o filtro de turma_id (a query agregada não usa).
 */
function aplicarFiltros(
  acc: AcumuladorFiltros,
  filtros: FiltrosComparativoEscolas,
  incluirTurma: boolean
): void {
  const { escolasIds, poloId, usuario, anoLetivo, avaliacaoId, serie, turmaId, tipoEnsino } = filtros

  // Restrições de acesso
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    acc.query += ` AND e.polo_id = $${acc.paramIndex}`
    acc.params.push(usuario.polo_id)
    acc.paramIndex++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    acc.query += ` AND e.id = $${acc.paramIndex}`
    acc.params.push(usuario.escola_id)
    acc.paramIndex++
  }

  if (escolasIds.length > 0) {
    const placeholders = escolasIds.map((_, i) => `$${acc.paramIndex + i}`).join(',')
    acc.query += ` AND e.id IN (${placeholders})`
    acc.params.push(...escolasIds)
    acc.paramIndex += escolasIds.length
  }

  if (poloId) {
    acc.query += ` AND e.polo_id = $${acc.paramIndex}`
    acc.params.push(poloId)
    acc.paramIndex++
  }

  if (anoLetivo && anoLetivo.trim() !== '') {
    acc.query += ` AND rc.ano_letivo = $${acc.paramIndex}`
    acc.params.push(anoLetivo.trim())
    acc.paramIndex++
  }

  if (avaliacaoId) {
    acc.query += ` AND rc.avaliacao_id = $${acc.paramIndex}`
    acc.params.push(avaliacaoId)
    acc.paramIndex++
  }

  if (serie) {
    acc.query += ` AND rc.serie = $${acc.paramIndex}`
    acc.params.push(serie)
    acc.paramIndex++
  }

  if (incluirTurma && turmaId) {
    acc.query += ` AND rc.turma_id = $${acc.paramIndex}`
    acc.params.push(turmaId)
    acc.paramIndex++
  }

  acc.query += getFiltroTipoEnsinoSQL(tipoEnsino)
}

/**
 * Busca dados para o comparativo do painel admin (endpoint /api/admin/comparativos).
 *
 * Usado por: app/api/admin/comparativos/route.ts
 */
export async function buscarComparativoAdmin(
  filtros: FiltrosComparativoEscolas
): Promise<ResultadoComparativoEscolas> {
  const { usuario, anoLetivo, avaliacaoId } = filtros

  // ===== QUERY 1: DADOS POR TURMA =====
  const acc1: AcumuladorFiltros = {
    query: `
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
    `,
    params: [],
    paramIndex: 1,
  }
  aplicarFiltros(acc1, filtros, true)
  acc1.query += `
      GROUP BY
        e.id, e.nome, p.id, p.nome, rc.serie, t.id, t.codigo
      ORDER BY
        p.nome, e.nome, rc.serie, t.codigo
    `

  const result = await pool.query(acc1.query, acc1.params)
  const dadosPorSerie = agruparPorSerie(result.rows)

  // ===== QUERY 2: DADOS AGREGADOS POR ESCOLA/SÉRIE (sem turma) =====
  const acc2: AcumuladorFiltros = {
    query: `
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
    `,
    params: [],
    paramIndex: 1,
  }
  aplicarFiltros(acc2, filtros, false)
  acc2.query += `
      GROUP BY
        e.id, e.nome, p.id, p.nome, rc.serie
      ORDER BY
        p.nome, e.nome, rc.serie
    `

  const resultAgregado = await pool.query(acc2.query, acc2.params)
  const dadosPorSerieAgregado = agruparPorSerie(resultAgregado.rows)

  // ===== QUERY 3: MELHORES ALUNOS (query única + agrupamento em memória) =====
  const melhoresAlunos: Record<string, Record<string, any>> = {}

  if (resultAgregado.rows.length > 0) {
    let queryMelhores = `
        SELECT
          rc.escola_id,
          rc.serie,
          rc.aluno_id,
          a.nome as aluno_nome,
          t.id as turma_id,
          t.codigo as turma_codigo,
          ROUND((${getMediaGeralSQL('rc')})::numeric, 1) as media_geral,
          CAST(rc.nota_lp AS DECIMAL) as nota_lp,
          CAST(rc.nota_ch AS DECIMAL) as nota_ch,
          CAST(rc.nota_mat AS DECIMAL) as nota_mat,
          CAST(rc.nota_cn AS DECIMAL) as nota_cn,
          CAST(rc.nota_producao AS DECIMAL) as nota_producao
        FROM resultados_consolidados_unificada rc
        INNER JOIN alunos a ON rc.aluno_id = a.id
        LEFT JOIN turmas t ON rc.turma_id = t.id
        WHERE (rc.presenca = 'P' OR rc.presenca = 'p')
      `
    const paramsMelhores: any[] = []
    let paramIndexMelhores = 1

    const escolasDoResultado = [...new Set(resultAgregado.rows.map((r: any) => r.escola_id))]
    const escolasPlaceholders = escolasDoResultado.map(() => `$${paramIndexMelhores++}`).join(', ')
    queryMelhores += ` AND rc.escola_id IN (${escolasPlaceholders})`
    paramsMelhores.push(...escolasDoResultado)

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

    const resultMelhores = await pool.query(queryMelhores, paramsMelhores)

    // Agrupar por escola_id + serie e calcular melhores em memória
    const alunosPorChave: Record<string, any[]> = {}
    for (const aluno of resultMelhores.rows) {
      const key = `${aluno.escola_id}_${aluno.serie || 'Sem série'}`
      if (!alunosPorChave[key]) alunosPorChave[key] = []
      alunosPorChave[key].push(aluno)
    }

    const melhorPor = (alunos: any[], campo: string) =>
      alunos.reduce((prev, curr) => (parseFloat(curr[campo]) || 0) > (parseFloat(prev[campo]) || 0) ? curr : prev)

    for (const [key, alunos] of Object.entries(alunosPorChave)) {
      const alunosPorTurma: Record<string, any[]> = {}
      alunos.forEach((a: any) => {
        const tk = a.turma_id || 'sem-turma'
        if (!alunosPorTurma[tk]) alunosPorTurma[tk] = []
        alunosPorTurma[tk].push(a)
      })
      const melhoresPorTurma = Object.values(alunosPorTurma).map(ta => melhorPor(ta, 'media_geral'))

      melhoresAlunos[key] = {
        melhorGeral: melhorPor(alunos, 'media_geral'),
        melhorLP: melhorPor(alunos, 'nota_lp'),
        melhorCH: melhorPor(alunos, 'nota_ch'),
        melhorMAT: melhorPor(alunos, 'nota_mat'),
        melhorCN: melhorPor(alunos, 'nota_cn'),
        melhorPROD: melhorPor(alunos, 'nota_producao'),
        melhoresPorTurma,
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
