/**
 * Queries de contadores de estatísticas (totais e nomes)
 *
 * Funções: buscarNomePolo, buscarNomeEscolaPolo, buscarContadoresGlobais,
 * buscarTotalEscolas, buscarTotalTurmas, buscarTotalAlunos,
 * buscarTotalResultados, buscarTotalAcertos
 *
 * @module services/estatisticas/queries/contadores
 */

import pool from '@/database/connection'
import { parseDbInt } from '@/lib/utils-numeros'
import type { EscopoEstatisticas, FiltrosEstatisticas } from '../types'
import { extrairNumeroSerie, addFiltroSerie } from './filtros'

/**
 * Busca nome do polo
 */
export async function buscarNomePolo(poloId: string): Promise<string> {
  const result = await pool.query(
    'SELECT nome FROM polos WHERE id = $1',
    [poloId]
  )
  return result.rows[0]?.nome || ''
}

/**
 * Busca nome da escola e polo associado
 */
export async function buscarNomeEscolaPolo(escolaId: string): Promise<{ nomeEscola: string; nomePolo: string }> {
  const result = await pool.query(
    `SELECT e.nome as escola_nome, p.nome as polo_nome
     FROM escolas e
     LEFT JOIN polos p ON e.polo_id = p.id
     WHERE e.id = $1`,
    [escolaId]
  )
  return {
    nomeEscola: result.rows[0]?.escola_nome || '',
    nomePolo: result.rows[0]?.polo_nome || ''
  }
}

/**
 * Busca contadores globais (apenas admin/tecnico)
 */
export async function buscarContadoresGlobais(): Promise<{
  totalUsuarios: number
  totalPolos: number
  totalQuestoes: number
}> {
  const [usuarios, polos, questoes] = await Promise.all([
    pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true'),
    pool.query('SELECT COUNT(*) as total FROM polos WHERE ativo = true'),
    pool.query('SELECT COUNT(*) as total FROM questoes')
  ])

  return {
    totalUsuarios: parseDbInt(usuarios.rows[0]?.total),
    totalPolos: parseDbInt(polos.rows[0]?.total),
    totalQuestoes: parseDbInt(questoes.rows[0]?.total)
  }
}

/**
 * Busca total de escolas com alunos no SISAM.
 * Usa MAX entre escolas com resultados e escolas com alunos matriculados nas séries SISAM.
 */
export async function buscarTotalEscolas(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  // 1) Escolas com resultados consolidados
  const rcWhere: string[] = []
  const rcParams: (string | null)[] = []
  let rcIdx = 1

  if (escopo === 'polo' && filtros.poloId) {
    rcWhere.push(`e.polo_id = $${rcIdx}`)
    rcParams.push(filtros.poloId); rcIdx++
  } else if (escopo === 'escola' && filtros.escolaId) {
    rcWhere.push(`rc.escola_id = $${rcIdx}`)
    rcParams.push(filtros.escolaId); rcIdx++
  }
  if (filtros.anoLetivo) {
    rcWhere.push(`rc.ano_letivo = $${rcIdx}`)
    rcParams.push(filtros.anoLetivo); rcIdx++
  }
  if (filtros.serie) {
    rcWhere.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${rcIdx}`)
    rcParams.push(extrairNumeroSerie(filtros.serie)); rcIdx++
  }

  const rcClause = rcWhere.length > 0 ? `WHERE ${rcWhere.join(' AND ')}` : ''
  const needsJoinRc = escopo === 'polo' && filtros.poloId
  const rcResult = await pool.query(`
    SELECT COUNT(DISTINCT rc.escola_id) as total
    FROM resultados_consolidados rc
    ${needsJoinRc ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${rcClause}
  `, rcParams)
  const totalRc = parseDbInt(rcResult.rows[0]?.total)

  // 2) Escolas com alunos matriculados nas séries SISAM
  let totalMat = 0
  if (filtros.anoLetivo) {
    const matWhere: string[] = [
      `a.ano_letivo = $1`, `a.situacao = 'cursando'`,
      `a.serie IN (SELECT serie FROM sisam_series_participantes WHERE ano_letivo = $1 AND ativo = true)`
    ]
    const matParams: (string | null)[] = [filtros.anoLetivo]
    let matIdx = 2

    if (escopo === 'polo' && filtros.poloId) {
      matWhere.push(`e.polo_id = $${matIdx}`)
      matParams.push(filtros.poloId); matIdx++
    } else if (escopo === 'escola' && filtros.escolaId) {
      matWhere.push(`a.escola_id = $${matIdx}`)
      matParams.push(filtros.escolaId); matIdx++
    }
    if (filtros.serie) {
      matWhere.push(`COALESCE(a.serie_numero, REGEXP_REPLACE(a.serie::text, '[^0-9]', '', 'g')) = $${matIdx}`)
      matParams.push(extrairNumeroSerie(filtros.serie)); matIdx++
    }

    const matResult = await pool.query(`
      SELECT COUNT(DISTINCT a.escola_id) as total
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id AND e.ativo = true
      WHERE ${matWhere.join(' AND ')}
    `, matParams)
    totalMat = parseDbInt(matResult.rows[0]?.total)
  }

  return Math.max(totalRc, totalMat)
}

/**
 * Busca total de turmas com alunos matriculados
 * Prioriza dados do gestor escolar (tabela turmas + alunos)
 */
export async function buscarTotalTurmas(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  const params: (string | null)[] = []
  let paramIndex = 1
  const whereConditions: string[] = ['t.ativo = true']

  if (escopo === 'polo' && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    whereConditions.push(`t.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  if (filtros.anoLetivo) {
    whereConditions.push(`t.ano_letivo = $${paramIndex}`)
    params.push(filtros.anoLetivo)
    paramIndex++
  }

  if (filtros.serie) {
    paramIndex = addFiltroSerie(whereConditions, params, paramIndex, filtros.serie, 't')
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`

  const query = `
    SELECT COUNT(DISTINCT t.id) as total
    FROM turmas t
    INNER JOIN escolas e ON t.escola_id = e.id AND e.ativo = true
    ${whereClause}
  `

  const result = await pool.query(query, params)
  return parseDbInt(result.rows[0]?.total)
}

/**
 * Busca total de alunos do SISAM.
 * Usa o MAIOR entre:
 *   - Alunos com resultados consolidados (prova já aplicada)
 *   - Alunos matriculados nas séries participantes do SISAM (gestor escolar)
 * Isso garante que o KPI reflita a realidade mesmo antes da prova ser aplicada.
 */
export async function buscarTotalAlunos(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  // 1) Contar alunos com resultados consolidados
  const rcWhere: string[] = []
  const rcParams: (string | null)[] = []
  let rcIdx = 1

  if (escopo === 'polo' && filtros.poloId) {
    rcWhere.push(`rc.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rcIdx})`)
    rcParams.push(filtros.poloId); rcIdx++
  } else if (escopo === 'escola' && filtros.escolaId) {
    rcWhere.push(`rc.escola_id = $${rcIdx}`)
    rcParams.push(filtros.escolaId); rcIdx++
  }
  if (filtros.anoLetivo) {
    rcWhere.push(`rc.ano_letivo = $${rcIdx}`)
    rcParams.push(filtros.anoLetivo); rcIdx++
  }
  if (filtros.serie) {
    rcWhere.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${rcIdx}`)
    rcParams.push(extrairNumeroSerie(filtros.serie)); rcIdx++
  }
  if (filtros.avaliacaoId) {
    rcWhere.push(`rc.avaliacao_id = $${rcIdx}::uuid`)
    rcParams.push(filtros.avaliacaoId); rcIdx++
  }

  const rcClause = rcWhere.length > 0 ? `WHERE ${rcWhere.join(' AND ')}` : ''
  const rcResult = await pool.query(`SELECT COUNT(DISTINCT rc.aluno_id) as total FROM resultados_consolidados rc ${rcClause}`, rcParams)
  const totalResultados = parseDbInt(rcResult.rows[0]?.total)

  // 2) Contar alunos matriculados nas séries SISAM
  let totalMatriculados = 0
  if (filtros.anoLetivo) {
    const matWhere: string[] = [
      `a.ano_letivo = $1`,
      `a.situacao = 'cursando'`,
      `a.serie IN (SELECT serie FROM sisam_series_participantes WHERE ano_letivo = $1 AND ativo = true)`
    ]
    const matParams: (string | null)[] = [filtros.anoLetivo]
    let matIdx = 2

    if (escopo === 'polo' && filtros.poloId) {
      matWhere.push(`a.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${matIdx})`)
      matParams.push(filtros.poloId); matIdx++
    } else if (escopo === 'escola' && filtros.escolaId) {
      matWhere.push(`a.escola_id = $${matIdx}`)
      matParams.push(filtros.escolaId); matIdx++
    }
    if (filtros.serie) {
      matWhere.push(`COALESCE(a.serie_numero, REGEXP_REPLACE(a.serie::text, '[^0-9]', '', 'g')) = $${matIdx}`)
      matParams.push(extrairNumeroSerie(filtros.serie)); matIdx++
    }

    const matResult = await pool.query(`SELECT COUNT(*) as total FROM alunos a WHERE ${matWhere.join(' AND ')}`, matParams)
    totalMatriculados = parseDbInt(matResult.rows[0]?.total)
  }

  // Retornar o maior dos dois
  return Math.max(totalResultados, totalMatriculados)
}

/**
 * Busca total de resultados de provas
 */
export async function buscarTotalResultados(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  let query = 'SELECT COUNT(*) as total FROM resultados_provas'
  const params: (string | null)[] = []
  let paramIndex = 1
  let hasWhere = false

  if (escopo === 'polo' && filtros.poloId) {
    query += ` WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndex})`
    params.push(filtros.poloId)
    paramIndex++
    hasWhere = true
  } else if (escopo === 'escola' && filtros.escolaId) {
    query += ` WHERE escola_id = $${paramIndex}`
    params.push(filtros.escolaId)
    paramIndex++
    hasWhere = true
  }

  // Filtro de ano letivo
  if (filtros.anoLetivo) {
    query += hasWhere ? ' AND' : ' WHERE'
    query += ` ano_letivo = $${paramIndex}`
    params.push(filtros.anoLetivo)
    paramIndex++
    hasWhere = true
  }

  // Filtro de série (normalizado)
  if (filtros.serie) {
    query += hasWhere ? ' AND' : ' WHERE'
    query += ` COALESCE(serie_numero, REGEXP_REPLACE(serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`
    params.push(extrairNumeroSerie(filtros.serie))
    paramIndex++
    hasWhere = true
  }

  // Filtro de avaliação
  if (filtros.avaliacaoId) {
    query += hasWhere ? ' AND' : ' WHERE'
    query += ` avaliacao_id = $${paramIndex}`
    params.push(filtros.avaliacaoId)
    paramIndex++
    hasWhere = true
  }

  const result = await pool.query(query, params)
  return parseDbInt(result.rows[0]?.total)
}

/**
 * Busca total de acertos (apenas para escola)
 */
export async function buscarTotalAcertos(escolaId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1 AND acertou = true',
    [escolaId]
  )
  return parseDbInt(result.rows[0]?.total)
}
