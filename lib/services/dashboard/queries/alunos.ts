/**
 * Queries do Dashboard: top alunos e alunos detalhados (paginação)
 *
 * @module services/dashboard/queries/alunos
 */

import pool from '@/database/connection'
import { safeQuery, getMediaGeralMixedRoundedSQL } from '@/lib/api-helpers'
import { parseDbInt } from '@/lib/utils-numeros'
import type { QueryParamValue } from '@/lib/types'
import type {
  TopAlunoDbRow,
  AlunoDetalhadoDbRow,
  TotalDbRow,
  PaginacaoAlunos,
} from '../types'

/**
 * Busca top 10 alunos
 */
export async function fetchTopAlunos(
  whereClause: string,
  params: QueryParamValue[],
  presenca: string | null
): Promise<TopAlunoDbRow[]> {
  const baseConditions = whereClause ? whereClause.replace('WHERE ', '') : ''
  const topConditions = baseConditions ? [baseConditions] : []
  if (!presenca) {
    topConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
  }
  if (presenca !== 'F') {
    topConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
  }
  const topWhere = topConditions.length > 0 ? `WHERE ${topConditions.join(' AND ')}` : ''

  const topOrderBy = presenca === 'F'
    ? 'ORDER BY a.nome ASC'
    : `ORDER BY ${getMediaGeralMixedRoundedSQL('rc', 'rc_table', 'rc')} DESC`

  const sql = `
    SELECT
      a.nome as aluno,
      e.nome as escola,
      rc.serie,
      t.codigo as turma,
      ${getMediaGeralMixedRoundedSQL('rc', 'rc_table', 'rc')} as media_aluno,
      CASE WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN rc_table.nota_lp ELSE rc.nota_lp END as nota_lp,
      CASE WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN rc_table.nota_mat ELSE rc.nota_mat END as nota_mat,
      rc.nota_ch,
      rc.nota_cn,
      rc.presenca,
      COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem
    FROM resultados_consolidados_unificada rc
    INNER JOIN alunos a ON rc.aluno_id = a.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
    ${topWhere}
    ${topOrderBy}
    LIMIT 10
  `
  return safeQuery<TopAlunoDbRow>(pool, sql, params, 'topAlunos')
}

/**
 * Busca alunos detalhados com paginação
 */
export async function fetchAlunosDetalhados(
  whereClause: string,
  params: QueryParamValue[],
  paginacao: PaginacaoAlunos,
  presenca: string | null
): Promise<{ alunos: AlunoDetalhadoDbRow[]; total: number }> {
  const orderBy = presenca === 'F'
    ? 'ORDER BY a.nome ASC'
    : `ORDER BY ${getMediaGeralMixedRoundedSQL('rc', 'rc_table', 'rc')} DESC NULLS LAST`

  const joinNivelAprendizagem = 'LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo'

  // Coerção defensiva: LIMIT/OFFSET são interpolados na string SQL (não aceitam placeholder
  // de forma trivial aqui), então garantimos inteiros seguros mesmo se a origem externa
  // enviar valores malformados (ex.: NaN vindo de parseInt('abc')).
  const limiteSeguro = Number.isFinite(paginacao.limite) && paginacao.limite > 0
    ? Math.floor(paginacao.limite)
    : 50
  const offsetSeguro = Number.isFinite(paginacao.offset) && paginacao.offset >= 0
    ? Math.floor(paginacao.offset)
    : 0

  const totalSql = `
    SELECT COUNT(DISTINCT rc.aluno_id) as total
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClause}
  `

  const alunosSql = `
    SELECT
      a.id,
      a.nome as aluno,
      a.codigo,
      e.id as escola_id,
      e.nome as escola,
      p.nome as polo,
      rc.serie,
      rc.turma_id,
      t.codigo as turma,
      rc.presenca,
      ${getMediaGeralMixedRoundedSQL('rc', 'rc_table', 'rc')} as media_aluno,
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN rc_table.nota_lp
        ELSE rc.nota_lp
      END as nota_lp,
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN rc_table.nota_mat
        ELSE rc.nota_mat
      END as nota_mat,
      rc.nota_ch,
      rc.nota_cn,
      COALESCE(rc_table.nota_producao, NULL) as nota_producao,
      COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem,
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN rc_table.total_acertos_lp
        ELSE rc.total_acertos_lp
      END as total_acertos_lp,
      rc.total_acertos_ch,
      CASE
        WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN rc_table.total_acertos_mat
        ELSE rc.total_acertos_mat
      END as total_acertos_mat,
      rc.total_acertos_cn,
      cs.qtd_questoes_lp,
      cs.qtd_questoes_mat,
      cs.qtd_questoes_ch,
      cs.qtd_questoes_cn,
      rc_table.nivel_lp,
      rc_table.nivel_mat,
      rc_table.nivel_prod,
      rc_table.nivel_aluno
    FROM resultados_consolidados_unificada rc
    INNER JOIN alunos a ON rc.aluno_id = a.id
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN polos p ON e.polo_id = p.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
    LEFT JOIN configuracao_series cs ON COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = cs.serie::text
    ${whereClause}
    ${orderBy}
    LIMIT ${limiteSeguro} OFFSET ${offsetSeguro}
  `

  const [totalRows, alunosRows] = await Promise.all([
    safeQuery<TotalDbRow>(pool, totalSql, params, 'totalAlunos'),
    safeQuery<AlunoDetalhadoDbRow>(pool, alunosSql, params, 'alunosDetalhados')
  ])

  return {
    alunos: alunosRows,
    total: parseDbInt((totalRows[0] as TotalDbRow | undefined)?.total)
  }
}
