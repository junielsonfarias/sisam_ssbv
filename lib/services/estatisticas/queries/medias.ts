/**
 * Queries de médias das estatísticas (média geral/aprovação e por tipo de ensino)
 *
 * Funções: buscarMediaEAprovacao, buscarMediasPorTipoEnsino
 *
 * @module services/estatisticas/queries/medias
 */

import pool from '@/database/connection'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import { NOTAS } from '@/lib/constants'
import type { EscopoEstatisticas, FiltrosEstatisticas } from '../types'
import { extrairNumeroSerie } from './filtros'

/**
 * Busca média geral e taxa de aprovação
 * PADRONIZADO: Usa divisor fixo para consistência com dashboard-dados
 * Anos Iniciais (2, 3, 5): (LP + MAT + PROD) / 3
 * Anos Finais (6, 7, 8, 9): (LP + CH + MAT + CN) / 4
 */
export async function buscarMediaEAprovacao(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<{ mediaGeral: number; taxaAprovacao: number }> {
  const params: (string | null)[] = []
  let paramIndex = 1
  const whereConditions: string[] = [
    `(rc.presenca IN ('P', 'p'))`
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

  // Query com média calculada usando DIVISOR FIXO para consistência
  const query = `
    SELECT
      ROUND(AVG(
        CASE
          -- Anos iniciais (2, 3, 5): média de LP, MAT e PROD (divisor fixo 3)
          WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
            ) / 3.0
          -- Anos finais (6, 7, 8, 9): média de LP, CH, MAT, CN (divisor fixo 4)
          ELSE
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / 4.0
        END
      ), 2) as media_geral,
      COUNT(CASE WHEN
        CASE
          WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
            (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
          ELSE
            (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
        END >= ${NOTAS.APROVACAO} THEN 1 END) as aprovados,
      COUNT(*) as total_presentes
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
  `

  const result = await pool.query(query, params)
  const mediaGeral = parseDbNumber(result.rows[0]?.media_geral)
  const aprovados = parseDbInt(result.rows[0]?.aprovados)
  const totalPresentes = parseDbInt(result.rows[0]?.total_presentes)
  const taxaAprovacao = totalPresentes > 0 ? (aprovados / totalPresentes) * 100 : 0

  return { mediaGeral, taxaAprovacao }
}

/**
 * Busca médias por tipo de ensino (anos iniciais e finais)
 * Anos Iniciais: 2º, 3º, 5º (séries 2, 3, 5) - disciplinas: LP, MAT, PROD
 * Anos Finais: 6º, 7º, 8º, 9º (séries 6, 7, 8, 9) - disciplinas: LP, MAT, CH, CN
 * PADRONIZADO: Usa divisor fixo para consistência com dashboard-dados
 */
export async function buscarMediasPorTipoEnsino(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<{
  mediaAnosIniciais: number
  mediaAnosFinais: number
  totalAnosIniciais: number
  totalAnosFinais: number
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

  // Query com DIVISOR FIXO para consistência com dashboard-dados
  // Anos Iniciais: (LP + MAT + PROD) / 3
  // Anos Finais: (LP + CH + MAT + CN) / 4
  const query = `
    SELECT
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN 'anos_iniciais'
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9') THEN 'anos_finais'
        ELSE 'outro'
      END as tipo_ensino,
      ROUND(AVG(
        CASE
          -- Anos iniciais: divisor fixo 3
          WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)
            ) / 3.0
          -- Anos finais: divisor fixo 4
          ELSE
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / 4.0
        END
      ), 2) as media,
      COUNT(DISTINCT rc.aluno_id) as total
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
    GROUP BY tipo_ensino
  `

  const result = await pool.query(query, params)

  let mediaAnosIniciais = 0
  let mediaAnosFinais = 0
  let totalAnosIniciais = 0
  let totalAnosFinais = 0

  for (const row of result.rows) {
    if (row.tipo_ensino === 'anos_iniciais') {
      mediaAnosIniciais = parseDbNumber(row.media)
      totalAnosIniciais = parseDbInt(row.total)
    } else if (row.tipo_ensino === 'anos_finais') {
      mediaAnosFinais = parseDbNumber(row.media)
      totalAnosFinais = parseDbInt(row.total)
    }
  }

  // Complementar com matrículas: usar o MAIOR por tipo entre resultados e matriculados
  if (filtros.anoLetivo) {
    const matParams: string[] = [filtros.anoLetivo]
    let matWhere = `a.ano_letivo = $1 AND a.situacao = 'cursando'
      AND a.serie IN (SELECT serie FROM sisam_series_participantes WHERE ano_letivo = $1 AND ativo = true)`
    let matParamIndex = 2

    if (escopo === 'polo' && filtros.poloId) {
      matWhere += ` AND a.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${matParamIndex})`
      matParams.push(filtros.poloId)
      matParamIndex++
    } else if (escopo === 'escola' && filtros.escolaId) {
      matWhere += ` AND a.escola_id = $${matParamIndex}`
      matParams.push(filtros.escolaId)
      matParamIndex++
    }

    const matResult = await pool.query(`
      SELECT
        CASE WHEN a.serie IN ('1','2','3','4','5') THEN 'anos_iniciais'
             WHEN a.serie IN ('6','7','8','9') THEN 'anos_finais'
        END as tipo_ensino,
        COUNT(*) as total
      FROM alunos a
      WHERE ${matWhere}
      GROUP BY tipo_ensino
    `, matParams)

    for (const row of matResult.rows) {
      if (row.tipo_ensino === 'anos_iniciais') totalAnosIniciais = Math.max(totalAnosIniciais, parseDbInt(row.total))
      else if (row.tipo_ensino === 'anos_finais') totalAnosFinais = Math.max(totalAnosFinais, parseDbInt(row.total))
    }
  }

  return { mediaAnosIniciais, mediaAnosFinais, totalAnosIniciais, totalAnosFinais }
}
