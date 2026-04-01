/**
 * Queries do Dashboard
 *
 * Funções de busca de dados (métricas, médias, faixas, presença, alunos, filtros).
 *
 * @module services/dashboard/queries
 */

import pool from '@/database/connection'
import { safeQuery, getMediaGeralSQL, getMediaGeralMixedSQL, getMediaGeralMixedRoundedSQL, getMediaGeralAvgSQL } from '@/lib/api-helpers'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import type { QueryParamValue } from '@/lib/types'
import type {
  MetricasDbRow,
  NivelDbRow,
  MediaSerieDbRow,
  MediaPoloDbRow,
  MediaEscolaDbRow,
  MediaTurmaDbRow,
  FaixaNotaDbRow,
  PresencaDbRow,
  TopAlunoDbRow,
  AlunoDetalhadoDbRow,
  TotalDbRow,
  DashboardFilterResult,
  FiltrosDisponiveis,
  PoloFiltroDbRow,
  EscolaFiltroDbRow,
  SerieFiltroDbRow,
  TurmaFiltroDbRow,
  AnoLetivoFiltroDbRow,
  NivelFiltroDbRow,
  PaginacaoAlunos,
} from './types'

/**
 * Busca métricas gerais do dashboard (totais, médias, etc.)
 */
export async function fetchDashboardMetricas(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MetricasDbRow[]> {
  const sql = `
    SELECT
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.escola_id) as total_escolas,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(DISTINCT e.polo_id) as total_polos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as total_faltantes,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p')
          AND COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')
          AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0)
        THEN CAST(rc.nota_producao AS DECIMAL)
        ELSE NULL
      END), 2) as media_producao,
      MIN(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as menor_media,
      MAX(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0) THEN CAST(rc.media_aluno AS DECIMAL) ELSE NULL END) as maior_media
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
  `
  return safeQuery<MetricasDbRow>(pool, sql, paramsBase, 'metricas')
}

/**
 * Busca distribuição por nível de aprendizagem (apenas anos iniciais)
 */
export async function fetchDashboardNiveis(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<NivelDbRow[]> {
  // Adicionar condições de anos iniciais e presença
  const baseConditions = whereClauseBase ? whereClauseBase.replace('WHERE ', '') : ''
  const niveisConditions = baseConditions ? [baseConditions] : []
  niveisConditions.push(`(COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5'))`)
  niveisConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  const niveisWhere = `WHERE ${niveisConditions.join(' AND ')}`

  const sql = `
    SELECT
      COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel,
      COUNT(*) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
    ${niveisWhere}
    GROUP BY COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
    ORDER BY
      CASE COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado')
        WHEN 'Insuficiente' THEN 1
        WHEN 'N1' THEN 1
        WHEN 'Básico' THEN 2
        WHEN 'N2' THEN 2
        WHEN 'Adequado' THEN 3
        WHEN 'N3' THEN 3
        WHEN 'Avançado' THEN 4
        WHEN 'N4' THEN 4
        ELSE 5
      END
  `
  return safeQuery<NivelDbRow>(pool, sql, paramsBase, 'niveis')
}

/**
 * Busca médias por série
 */
export async function fetchMediasPorSerie(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaSerieDbRow[]> {
  const sql = `
    SELECT
      rc.serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY rc.serie
    HAVING rc.serie IS NOT NULL
    ORDER BY COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'))::integer NULLS LAST
  `
  return safeQuery<MediaSerieDbRow>(pool, sql, paramsBase, 'mediasPorSerie')
}

/**
 * Busca médias por polo
 */
export async function fetchMediasPorPolo(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaPoloDbRow[]> {
  const sql = `
    SELECT
      p.id as polo_id,
      p.nome as polo,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    INNER JOIN polos p ON e.polo_id = p.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY p.id, p.nome
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery<MediaPoloDbRow>(pool, sql, paramsBase, 'mediasPorPolo')
}

/**
 * Busca médias por escola
 */
export async function fetchMediasPorEscola(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaEscolaDbRow[]> {
  const sql = `
    SELECT
      e.id as escola_id,
      e.nome as escola,
      p.nome as polo,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ${getMediaGeralAvgSQL('rc')} as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN polos p ON e.polo_id = p.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY e.id, e.nome, p.nome
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery<MediaEscolaDbRow>(pool, sql, paramsBase, 'mediasPorEscola')
}

/**
 * Busca médias por turma
 */
export async function fetchMediasPorTurma(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<MediaTurmaDbRow[]> {
  const sql = `
    SELECT
      t.id as turma_id,
      t.codigo as turma,
      e.nome as escola,
      t.serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          ${getMediaGeralMixedSQL('t', 'rc', 'rc')}
        ELSE NULL
      END), 2) as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_producao IS NOT NULL AND CAST(rc.nota_producao AS DECIMAL) > 0) THEN CAST(rc.nota_producao AS DECIMAL) ELSE NULL END), 2) as media_prod,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as faltantes
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    LEFT JOIN turmas t ON rc.turma_id = t.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY t.id, t.codigo, t.nome, e.id, e.nome, t.serie
    HAVING t.id IS NOT NULL
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery<MediaTurmaDbRow>(pool, sql, paramsBase, 'mediasPorTurma')
}

/**
 * Busca distribuição por faixa de nota
 */
export async function fetchFaixasNota(
  whereClause: string,
  params: QueryParamValue[],
  joinNivelAprendizagem: string,
  presenca: string | null
): Promise<FaixaNotaDbRow[]> {
  // Construir condições de faixas de nota
  const baseConditions = whereClause ? whereClause.replace('WHERE ', '') : ''
  const faixasConditions = baseConditions ? [baseConditions] : []
  if (!presenca) {
    faixasConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p')`)
  }
  faixasConditions.push(`(rc.media_aluno IS NOT NULL AND CAST(rc.media_aluno AS DECIMAL) > 0)`)
  const faixasWhere = faixasConditions.length > 0 ? `WHERE ${faixasConditions.join(' AND ')}` : ''

  const sql = `
    SELECT faixa, quantidade FROM (
      SELECT
        CASE
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 0 AND CAST(rc.media_aluno AS DECIMAL) < 2 THEN '0 a 2'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 2 AND CAST(rc.media_aluno AS DECIMAL) < 4 THEN '2 a 4'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 AND CAST(rc.media_aluno AS DECIMAL) < 6 THEN '4 a 6'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 AND CAST(rc.media_aluno AS DECIMAL) < 8 THEN '6 a 8'
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 AND CAST(rc.media_aluno AS DECIMAL) <= 10 THEN '8 a 10'
          ELSE 'N/A'
        END as faixa,
        CASE
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 0 AND CAST(rc.media_aluno AS DECIMAL) < 2 THEN 1
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 2 AND CAST(rc.media_aluno AS DECIMAL) < 4 THEN 2
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 4 AND CAST(rc.media_aluno AS DECIMAL) < 6 THEN 3
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 6 AND CAST(rc.media_aluno AS DECIMAL) < 8 THEN 4
          WHEN CAST(rc.media_aluno AS DECIMAL) >= 8 AND CAST(rc.media_aluno AS DECIMAL) <= 10 THEN 5
          ELSE 6
        END as ordem,
        COUNT(*) as quantidade
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${joinNivelAprendizagem}
      ${faixasWhere}
      GROUP BY faixa, ordem
    ) sub
    ORDER BY ordem
  `
  return safeQuery<FaixaNotaDbRow>(pool, sql, params, 'faixasNota')
}

/**
 * Busca distribuição de presença
 */
export async function fetchPresenca(
  whereClauseBase: string,
  paramsBase: QueryParamValue[],
  joinNivelAprendizagem: string
): Promise<PresencaDbRow[]> {
  const sql = `
    SELECT
      CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 'Presente'
        WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 'Faltante'
        ELSE 'Não informado'
      END as status,
      COUNT(*) as quantidade
    FROM resultados_consolidados_unificada rc
    INNER JOIN escolas e ON rc.escola_id = e.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY
      CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 'Presente'
        WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 'Faltante'
        ELSE 'Não informado'
      END
    ORDER BY quantidade DESC
  `
  return safeQuery<PresencaDbRow>(pool, sql, paramsBase, 'presenca')
}

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
    LIMIT ${paginacao.limite} OFFSET ${paginacao.offset}
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

/**
 * Busca opções para filtros dropdown
 */
export async function fetchFiltrosDisponiveis(
  filters: DashboardFilterResult
): Promise<FiltrosDisponiveis> {
  const {
    filtrosParams,
    filtrosWhereClauseComPresenca,
    seriesWhereClause,
    turmasWhereClause,
    anosLetivosWhereClause
  } = filters

  const [polosRows, escolasRows, seriesRows, turmasRows, anosLetivosRows, niveisRows] = await Promise.all([
    safeQuery<PoloFiltroDbRow>(pool, `
      SELECT DISTINCT p.id, p.nome
      FROM polos p
      INNER JOIN escolas e ON e.polo_id = p.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClauseComPresenca}
      ORDER BY p.nome
    `, filtrosParams, 'filtros.polos'),

    safeQuery<EscolaFiltroDbRow>(pool, `
      SELECT DISTINCT e.id, e.nome, e.polo_id
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClauseComPresenca}
      ORDER BY e.nome
    `, filtrosParams, 'filtros.escolas'),

    safeQuery<SerieFiltroDbRow>(pool, `
      SELECT DISTINCT COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')) || 'º Ano' as serie,
             COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'))::integer as serie_numero
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${seriesWhereClause}
      ORDER BY serie_numero
    `, filtrosParams, 'filtros.series'),

    safeQuery<TurmaFiltroDbRow>(pool, `
      SELECT DISTINCT t.id, t.codigo, t.escola_id
      FROM turmas t
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${turmasWhereClause}
      ORDER BY t.codigo
    `, filtrosParams, 'filtros.turmas'),

    safeQuery<AnoLetivoFiltroDbRow>(pool, `
      SELECT DISTINCT rc.ano_letivo
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${anosLetivosWhereClause}
      ORDER BY rc.ano_letivo DESC
    `, filtrosParams, 'filtros.anosLetivos'),

    safeQuery<NivelFiltroDbRow>(pool, `
      SELECT DISTINCT
        COALESCE(NULLIF(rc_table.nivel_aprendizagem, ''), 'Não classificado') as nivel
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo
      ${filtrosWhereClauseComPresenca}
      ORDER BY nivel
    `, filtrosParams, 'filtros.niveis')
  ])

  return {
    polos: polosRows,
    escolas: escolasRows,
    series: seriesRows.map((r: SerieFiltroDbRow) => r.serie),
    turmas: turmasRows,
    anosLetivos: anosLetivosRows.map((r: AnoLetivoFiltroDbRow) => r.ano_letivo),
    niveis: niveisRows.map((r: NivelFiltroDbRow) => r.nivel),
    faixasMedia: ['0-2', '2-4', '4-6', '6-8', '8-10']
  }
}
