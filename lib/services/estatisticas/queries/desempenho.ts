/**
 * Queries de desempenho das estatísticas (presença, disciplina, séries)
 *
 * Funções: buscarPresenca, buscarMediasPorDisciplina, buscarSeriesDisponiveis
 *
 * @module services/estatisticas/queries/desempenho
 */

import pool from '@/database/connection'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import type { EscopoEstatisticas, FiltrosEstatisticas } from '../types'
import { extrairNumeroSerie } from './filtros'

/**
 * Busca presença (presentes, faltantes e total de alunos avaliados)
 * Alunos avaliados = alunos únicos com presença P ou F (não conta '-')
 */
export async function buscarPresenca(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<{ presentes: number; faltantes: number; totalAvaliados: number }> {
  const params: (string | null)[] = []
  let paramIndex = 1
  // Só contar presença quando há dados reais de avaliação (nota_lp ou nota_mat preenchidas).
  // Registros inicializados sem notas não devem ser contados como "presentes".
  // Semeada como primeira condição para que o whereClause nunca nasça vazio
  // (evita SQL inválido em escopo global sem filtros).
  const whereConditions: string[] = [
    `(rc.nota_lp IS NOT NULL OR rc.nota_mat IS NOT NULL OR rc.total_acertos_lp > 0 OR rc.total_acertos_mat > 0)`
  ]

  // Construir condições WHERE
  if (escopo === 'polo' && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  // Filtro de ano letivo
  if (filtros.anoLetivo) {
    whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
    params.push(filtros.anoLetivo)
    paramIndex++
  }

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`)
    params.push(extrairNumeroSerie(filtros.serie))
    paramIndex++
  }

  // Filtro de avaliação
  if (filtros.avaliacaoId) {
    whereConditions.push(`rc.avaliacao_id = $${paramIndex}`)
    params.push(filtros.avaliacaoId)
    paramIndex++
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  const needsJoin = escopo === 'polo' && filtros.poloId

  const query = `
    SELECT
      COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p') THEN rc.aluno_id END) as presentes,
      COUNT(DISTINCT CASE WHEN rc.presenca IN ('F', 'f') THEN rc.aluno_id END) as faltantes,
      COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_avaliados
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
  `

  const result = await pool.query(query, params)
  return {
    presentes: parseDbInt(result.rows[0]?.presentes),
    faltantes: parseDbInt(result.rows[0]?.faltantes),
    totalAvaliados: parseDbInt(result.rows[0]?.total_avaliados)
  }
}

/**
 * Busca médias por disciplina
 * Usa o mesmo cálculo do dashboard-dados para garantir consistência
 * Anos Iniciais (2, 3, 5): LP, MAT, PROD
 * Anos Finais (6, 7, 8, 9): LP, MAT, CH, CN
 */
export async function buscarMediasPorDisciplina(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<{
  mediaLp: number
  mediaMat: number
  mediaProd: number
  mediaCh: number
  mediaCn: number
}> {
  const params: (string | null)[] = []
  let paramIndex = 1
  const whereConditions: string[] = [
    `rc.presenca IN ('P', 'p')`
  ]

  // Construir condições WHERE
  if (escopo === 'polo' && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  // Filtro de ano letivo
  if (filtros.anoLetivo) {
    whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
    params.push(filtros.anoLetivo)
    paramIndex++
  }

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`)
    params.push(extrairNumeroSerie(filtros.serie))
    paramIndex++
  }

  // Filtro de avaliação
  if (filtros.avaliacaoId) {
    whereConditions.push(`rc.avaliacao_id = $${paramIndex}`)
    params.push(filtros.avaliacaoId)
    paramIndex++
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  const needsJoin = escopo === 'polo' && filtros.poloId

  // Query para médias por disciplina - nota 0 entra no cálculo como 0
  const query = `
    SELECT
      ROUND(AVG(COALESCE(CAST(rc.nota_lp AS DECIMAL), 0)), 2) as media_lp,
      ROUND(AVG(COALESCE(CAST(rc.nota_mat AS DECIMAL), 0)), 2) as media_mat,
      ROUND(AVG(COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)), 2) as media_prod,
      ROUND(AVG(COALESCE(CAST(rc.nota_ch AS DECIMAL), 0)), 2) as media_ch,
      ROUND(AVG(COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)), 2) as media_cn
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
  `

  const result = await pool.query(query, params)

  return {
    mediaLp: parseDbNumber(result.rows[0]?.media_lp),
    mediaMat: parseDbNumber(result.rows[0]?.media_mat),
    mediaProd: parseDbNumber(result.rows[0]?.media_prod),
    mediaCh: parseDbNumber(result.rows[0]?.media_ch),
    mediaCn: parseDbNumber(result.rows[0]?.media_cn)
  }
}

/**
 * Busca séries disponíveis da configuração do sistema
 * Retorna todas as séries configuradas e ativas, independente de terem resultados
 */
export async function buscarSeriesDisponiveis(
  _escopo: EscopoEstatisticas,
  _filtros: FiltrosEstatisticas
): Promise<string[]> {
  // Buscar da tabela de configuração de séries (todas as séries ativas)
  const query = `
    SELECT nome_serie
    FROM configuracao_series
    WHERE ativo = true
    ORDER BY serie::integer
  `

  const result = await pool.query(query)

  return result.rows.map((row: { nome_serie: string }) => row.nome_serie)
}
