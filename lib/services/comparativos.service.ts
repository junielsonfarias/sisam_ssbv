/**
 * Serviço centralizado de Comparativos
 *
 * Extrai lógica comum das rotas:
 * - admin/comparativos (comparativo entre escolas)
 * - admin/comparativos-polos (comparativo entre polos)
 *
 * Ambas compartilham:
 * - SQL de médias por disciplina (media_geral com divisor fixo por série)
 * - SQL de médias individuais (LP, CH, MAT, CN, PROD, acertos)
 * - Filtros WHERE (ano_letivo, serie, escola_id, avaliacao_id, turma_id)
 * - Agrupamento de resultados por série
 * - REGEXP_REPLACE para extração de número da série
 *
 * Cache permanece nas rotas (não no service).
 *
 * @module services/comparativos
 */

import pool from '@/database/connection'
import {
  createWhereBuilder,
  addCondition,
  addInCondition,
  WhereClauseResult,
} from '@/lib/api-helpers'

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface FiltrosComparativos {
  anoLetivo?: string | null
  serie?: string | null
  escolaId?: string | null
  turmaId?: string | null
  avaliacaoId?: string | null
  tipoEnsino?: string | null
}

export interface UsuarioAcesso {
  tipo_usuario: string
  polo_id?: string | null
  escola_id?: string | null
}

export interface FiltrosComparativoEscolas extends FiltrosComparativos {
  escolasIds: string[]
  poloId?: string | null
  usuario: UsuarioAcesso
}

export interface FiltrosComparativoPolos extends FiltrosComparativos {
  polosIds: [string, string]
}

export interface ResultadoComparativoEscolas {
  dados: any[]
  dadosPorSerie: Record<string, any[]>
  dadosPorSerieAgregado: Record<string, any[]>
  melhoresAlunos: Record<string, Record<string, any>>
  totalEscolas: number
  totalSeries: number
}

export interface ResultadoComparativoPolos {
  dadosPorSerie: Record<string, any[]>
  dadosPorSerieAgregado: Record<string, any[]>
  dadosPorSerieEscola: Record<string, Record<string, any[]>>
  polos: string[]
}

// ============================================================================
// SQL FRAGMENTS COMPARTILHADOS
// ============================================================================

/** SQL para extrair número da série */
const NUMERO_SERIE_SQL = `REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')`

/**
 * SQL: média geral com divisor fixo por série (AVG agregado).
 * Anos iniciais (2,3,5): LP + MAT + PROD / 3
 * Anos finais (6-9): LP + CH + MAT + CN / 4
 */
export function getMediaGeralAgregadaSQL(): string {
  return `AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN ${NUMERO_SERIE_SQL} IN ('2', '3', '5') THEN
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
              ) / 3.0
            ELSE
              (
                COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
              ) / 4.0
          END
        ELSE NULL END)`
}

/**
 * SQL: média geral por aluno (com ROUND e divisor dinâmico baseado em notas presentes).
 * Usado na query de melhores alunos.
 */
export function getMediaGeralAlunoSQL(): string {
  return `CASE
              WHEN ${NUMERO_SERIE_SQL} IN ('2', '3', '5') THEN
                ROUND(
                  (
                    COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
                  ) /
                  NULLIF(
                    CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                    0
                  ),
                  1
                )
              ELSE
                ROUND(
                  (
                    COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
                    COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
                  ) /
                  NULLIF(
                    CASE WHEN rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0 THEN 1 ELSE 0 END +
                    CASE WHEN rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0 THEN 1 ELSE 0 END,
                    0
                  ),
                  1
                )
            END`
}

/**
 * SQL: colunas de médias individuais por disciplina (presença P).
 * Compartilhado entre todas as queries de comparativos.
 */
export function getMediasDisciplinasSQL(): string {
  return `AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END) as media_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END) as media_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END) as media_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END) as media_cn,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND rc.nota_producao IS NOT NULL THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END) as media_producao,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_lp IS NOT NULL) THEN CAST(rc.total_acertos_lp AS INTEGER) ELSE NULL END) as media_acertos_lp,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_ch IS NOT NULL) THEN CAST(rc.total_acertos_ch AS INTEGER) ELSE NULL END) as media_acertos_ch,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_mat IS NOT NULL) THEN CAST(rc.total_acertos_mat AS INTEGER) ELSE NULL END) as media_acertos_mat,
        AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.total_acertos_cn IS NOT NULL) THEN CAST(rc.total_acertos_cn AS INTEGER) ELSE NULL END) as media_acertos_cn`
}

/**
 * SQL: contagem de alunos (total e presentes).
 * Compartilhado entre todas as queries de comparativos.
 */
export function getContagemAlunosSQL(): string {
  return `COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_alunos,
        COUNT(DISTINCT CASE WHEN rc.presenca = 'P' OR rc.presenca = 'p' THEN rc.aluno_id END) as alunos_presentes`
}

/**
 * SQL: FROM + JOINs padrão para queries de comparativos.
 */
export function getFromJoinsSQL(): string {
  return `FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      INNER JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON rc.turma_id = t.id`
}

/** Condição base: presença P ou F */
const PRESENCA_BASE = `(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`

// ============================================================================
// HELPERS COMPARTILHADOS
// ============================================================================

/**
 * Constrói filtros WHERE comuns para comparativos.
 * Usado por: comparativos e comparativos-polos.
 */
export function construirFiltrosComparativos(
  filtros: FiltrosComparativos,
  startIndex: number = 1
): WhereClauseResult {
  const where = createWhereBuilder(startIndex)

  if (filtros.anoLetivo && filtros.anoLetivo.trim() !== '') {
    addCondition(where, 'rc.ano_letivo', filtros.anoLetivo.trim())
  }
  addCondition(where, 'rc.avaliacao_id', filtros.avaliacaoId)
  addCondition(where, 'rc.serie', filtros.serie)

  if (filtros.escolaId && filtros.escolaId !== '' && filtros.escolaId !== 'undefined' && filtros.escolaId.toLowerCase() !== 'todas') {
    addCondition(where, 'e.id', filtros.escolaId)
  }
  if (filtros.turmaId && filtros.turmaId !== '' && filtros.turmaId !== 'undefined') {
    addCondition(where, 'rc.turma_id', filtros.turmaId)
  }

  return where
}

/**
 * Adiciona condições de acesso baseadas no tipo de usuário.
 * Polo vê apenas suas escolas, escola vê apenas seus dados.
 */
export function aplicarRestricaoAcesso(
  where: WhereClauseResult,
  usuario: UsuarioAcesso
): void {
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    addCondition(where, 'e.polo_id', usuario.polo_id)
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    addCondition(where, 'e.id', usuario.escola_id)
  }
}

/**
 * Gera SQL de filtro por tipo de ensino (anos iniciais/finais).
 * Retorna string para concatenar ao WHERE ou string vazia.
 */
export function getFiltroTipoEnsinoSQL(tipoEnsino?: string | null): string {
  if (tipoEnsino === 'anos_iniciais') {
    return ` AND ${NUMERO_SERIE_SQL} IN ('2', '3', '5')`
  } else if (tipoEnsino === 'anos_finais') {
    return ` AND ${NUMERO_SERIE_SQL} IN ('6', '7', '8', '9')`
  }
  return ''
}

/**
 * Agrupa rows de resultado por série.
 * Retorna Record<string, rows[]> onde a chave é o valor de row.serie.
 */
export function agruparPorSerie(rows: any[]): Record<string, any[]> {
  const agrupado: Record<string, any[]> = {}
  rows.forEach((row) => {
    const serieKey = row.serie || 'Sem série'
    if (!agrupado[serieKey]) {
      agrupado[serieKey] = []
    }
    agrupado[serieKey].push(row)
  })
  return agrupado
}

/**
 * Encontra o melhor aluno (maior valor) de um array para um campo.
 */
function encontrarMelhor(alunos: any[], campo: string): any {
  return alunos.reduce((prev, curr) => {
    const prevVal = parseFloat(prev[campo]) || 0
    const currVal = parseFloat(curr[campo]) || 0
    return currVal > prevVal ? curr : prev
  })
}

// ============================================================================
// BUSCA: COMPARATIVO ENTRE ESCOLAS
// ============================================================================

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

// ============================================================================
// BUSCA: COMPARATIVO ENTRE POLOS
// ============================================================================

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
