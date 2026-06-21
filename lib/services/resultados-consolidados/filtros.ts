/**
 * Montagem de filtros WHERE para as queries de resultados consolidados.
 *
 * Centraliza a lógica que antes era repetida três vezes (query principal,
 * countQuery e estatisticasQuery), garantindo que filtros e controle de
 * acesso fiquem sempre sincronizados entre elas.
 *
 * @module services/resultados-consolidados/filtros
 */

import type { FiltrosResultados, UsuarioAcessoResultados } from './types'

/**
 * SQL (sem parâmetros) do filtro de presença, idêntico nas três queries.
 * Concatenar diretamente ao WHERE.
 */
export function getPresencaFiltroSQL(presenca: string | null): string {
  if (!presenca) {
    return ` AND (
      ((UPPER(rc.presenca) = 'P') AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)
      OR (UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE'))
    )`
  }
  if (presenca.toUpperCase() === 'P') {
    return ` AND UPPER(rc.presenca) = 'P' AND rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0`
  }
  if (presenca.toUpperCase() === 'F' || presenca.toLowerCase() === 'falta') {
    return ` AND UPPER(rc.presenca) IN ('F', 'FALTA', 'FALTOU', 'AUSENTE')`
  }
  return ''
}

/**
 * Monta as condições parametrizadas (controle de acesso + filtros) a partir
 * de um índice inicial de parâmetro. Inclui o filtro de presença textual
 * (`incluirPresencaParam`) quando aplicável — a query principal/count/stats
 * o aplicam após o filtro estático de presença.
 *
 * Retorna o SQL a concatenar ao WHERE e os parâmetros na mesma ordem.
 */
export function buildResultadosWhere(
  usuario: UsuarioAcessoResultados,
  filtros: FiltrosResultados,
  startIndex: number = 1
): { sql: string; params: any[] } {
  const { escolaId, poloId, anoLetivo, avaliacaoId, serie, presenca, turmaId, tipoEnsino, busca } = filtros
  let sql = ''
  const params: any[] = []
  let paramIndex = startIndex

  // Controle de acesso por polo/escola
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    sql += ` AND e.polo_id = $${paramIndex}`
    params.push(usuario.polo_id)
    paramIndex++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    sql += ` AND rc.escola_id = $${paramIndex}`
    params.push(usuario.escola_id)
    paramIndex++
  }

  if (escolaId) {
    sql += ` AND rc.escola_id = $${paramIndex}`
    params.push(escolaId)
    paramIndex++
  }

  if (poloId) {
    sql += ` AND e.polo_id = $${paramIndex}`
    params.push(poloId)
    paramIndex++
  }

  if (anoLetivo) {
    sql += ` AND rc.ano_letivo = $${paramIndex}`
    params.push(anoLetivo)
    paramIndex++
  }

  if (avaliacaoId) {
    sql += ` AND rc.avaliacao_id = $${paramIndex}`
    params.push(avaliacaoId)
    paramIndex++
  }

  if (serie) {
    const numeroSerie = serie.match(/\d+/)?.[0]
    if (numeroSerie) {
      sql += ` AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`
      params.push(numeroSerie)
      paramIndex++
    } else {
      sql += ` AND rc.serie ILIKE $${paramIndex}`
      params.push(serie)
      paramIndex++
    }
  }

  if (presenca) {
    sql += ` AND UPPER(rc.presenca) = UPPER($${paramIndex})`
    params.push(presenca)
    paramIndex++
  }

  if (turmaId) {
    sql += ` AND rc.turma_id = $${paramIndex}`
    params.push(turmaId)
    paramIndex++
  }

  if (tipoEnsino) {
    sql += ` AND cs.tipo_ensino = $${paramIndex}`
    params.push(tipoEnsino)
    paramIndex++
  }

  if (busca) {
    sql += ` AND (a.nome ILIKE $${paramIndex} OR e.nome ILIKE $${paramIndex + 1})`
    params.push(`%${busca}%`, `%${busca}%`)
    paramIndex += 2
  }

  return { sql, params }
}
