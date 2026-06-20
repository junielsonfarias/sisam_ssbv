/**
 * Gráfico: Correlação
 *
 * @module services/graficos/analise/correlacao
 */

import pool from '@/database/connection'

import type {
  CorrelacaoItem,
  CorrelacaoMeta,
} from '../types'

import {
  parseDbNumber,
  safeQuery,
} from '../helpers'

export async function fetchCorrelacao(whereClause: string, params: (string | null)[], deveRemoverLimites: boolean): Promise<{ correlacao: CorrelacaoItem[]; correlacao_meta: CorrelacaoMeta }> {
  const numeroSerieSQL = `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g'))`

  const whereCorrelacaoFinais = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} NOT IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_ch IS NOT NULL AND rc.nota_mat IS NOT NULL AND rc.nota_cn IS NOT NULL`

  const whereCorrelacaoIniciais = whereClause
    ? `${whereClause} AND (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_mat IS NOT NULL`
    : `WHERE (rc.presenca = 'P' OR rc.presenca = 'p') AND ${numeroSerieSQL} IN ('2', '3', '5') AND rc.nota_lp IS NOT NULL AND rc.nota_mat IS NOT NULL`

  const queryFinais = `
    SELECT
      'anos_finais' as tipo,
      CAST(rc.nota_lp AS DECIMAL) as lp,
      CAST(rc.nota_ch AS DECIMAL) as ch,
      CAST(rc.nota_mat AS DECIMAL) as mat,
      CAST(rc.nota_cn AS DECIMAL) as cn,
      NULL::DECIMAL as pt
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereCorrelacaoFinais}
    ${deveRemoverLimites ? '' : 'LIMIT 500'}
  `

  const queryIniciais = `
    SELECT
      'anos_iniciais' as tipo,
      CAST(rc.nota_lp AS DECIMAL) as lp,
      NULL::DECIMAL as ch,
      CAST(rc.nota_mat AS DECIMAL) as mat,
      NULL::DECIMAL as cn,
      CAST(rc.nota_producao AS DECIMAL) as pt
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${whereCorrelacaoIniciais}
    ${deveRemoverLimites ? '' : 'LIMIT 500'}
  `

  const [rowsFinais, rowsIniciais] = await Promise.all([
    safeQuery(pool, queryFinais, params, 'fetchCorrelacao:finais'),
    safeQuery(pool, queryIniciais, params, 'fetchCorrelacao:iniciais')
  ])

  const dadosFinais: CorrelacaoItem[] = rowsFinais.map((r) => ({
    tipo: 'anos_finais',
    LP: parseDbNumber(r.lp),
    CH: parseDbNumber(r.ch),
    MAT: parseDbNumber(r.mat),
    CN: parseDbNumber(r.cn),
    PT: null
  }))

  const dadosIniciais: CorrelacaoItem[] = rowsIniciais.map((r) => ({
    tipo: 'anos_iniciais',
    LP: parseDbNumber(r.lp),
    CH: null,
    MAT: parseDbNumber(r.mat),
    CN: null,
    PT: r.pt ? parseDbNumber(r.pt) : null
  }))

  return {
    correlacao: [...dadosFinais, ...dadosIniciais],
    correlacao_meta: {
      tem_anos_finais: dadosFinais.length > 0,
      tem_anos_iniciais: dadosIniciais.length > 0,
      total_anos_finais: dadosFinais.length,
      total_anos_iniciais: dadosIniciais.length
    }
  }
}
