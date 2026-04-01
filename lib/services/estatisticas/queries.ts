/**
 * Queries SQL do serviço de estatísticas
 *
 * Funções de busca de dados no banco para estatísticas.
 *
 * @module services/estatisticas/queries
 */

import pool from '@/database/connection'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import { NOTAS } from '@/lib/constants'
import type { EscopoEstatisticas, FiltrosEstatisticas } from './types'

// ============================================================================
// FUNÇÕES AUXILIARES DE FILTRO
// ============================================================================

/**
 * Normaliza valor de série para SQL: extrai apenas o número
 * Converte '2º Ano', '2º ano', '2' → '2'
 */
function extrairNumeroSerie(serie: string): string {
  const match = serie.match(/(\d+)/)
  return match ? match[1] : serie
}

/**
 * Adiciona filtro de série normalizado (funciona com '2' ou '2º Ano')
 */
function addFiltroSerie(
  whereConditions: string[],
  params: (string | null)[],
  paramIndex: number,
  serie: string,
  alias: string = 'a'
): number {
  whereConditions.push(`COALESCE(${alias}.serie_numero, REGEXP_REPLACE(${alias}.serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`)
  params.push(extrairNumeroSerie(serie))
  return paramIndex + 1
}

// ============================================================================
// QUERIES DE ESTATÍSTICAS
// ============================================================================

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
  const whereConditions: string[] = []

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

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
  const needsJoin = escopo === 'polo' && filtros.poloId

  // Só contar presença quando há dados reais de avaliação (nota_lp ou nota_mat preenchidas)
  // Registros inicializados sem notas não devem ser contados como "presentes"
  const query = `
    SELECT
      COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p') THEN rc.aluno_id END) as presentes,
      COUNT(DISTINCT CASE WHEN rc.presenca IN ('F', 'f') THEN rc.aluno_id END) as faltantes,
      COUNT(DISTINCT CASE WHEN rc.presenca IN ('P', 'p', 'F', 'f') THEN rc.aluno_id END) as total_avaliados
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
    AND (rc.nota_lp IS NOT NULL OR rc.nota_mat IS NOT NULL OR rc.total_acertos_lp > 0 OR rc.total_acertos_mat > 0)
  `

  const result = await pool.query(query, params)
  return {
    presentes: parseDbInt(result.rows[0]?.presentes),
    faltantes: parseDbInt(result.rows[0]?.faltantes),
    totalAvaliados: parseDbInt(result.rows[0]?.total_avaliados)
  }
}

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
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
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
