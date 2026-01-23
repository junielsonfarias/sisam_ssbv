/**
 * Serviço centralizado de estatísticas
 *
 * Este serviço unifica a lógica de busca de estatísticas para todos os tipos de usuários:
 * - Administrador/Técnico: Acesso global a todos os dados
 * - Polo: Acesso filtrado pelo polo_id do usuário
 * - Escola: Acesso filtrado pela escola_id do usuário
 *
 * @module services/estatisticas
 */

import pool from '@/database/connection'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import { Usuario } from '@/lib/types'
import { NOTAS, PRESENCA } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

// Logger específico para este módulo
const log = createLogger('EstatisticasService')

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Tipo de escopo para filtrar estatísticas
 */
export type EscopoEstatisticas = 'global' | 'polo' | 'escola'

/**
 * Filtros para busca de estatísticas
 */
export interface FiltrosEstatisticas {
  /** ID do polo para filtrar (usado quando escopo é 'polo') */
  poloId?: string | null
  /** ID da escola para filtrar (usado quando escopo é 'escola') */
  escolaId?: string | null
  /** Ano letivo para filtrar */
  anoLetivo?: string | null
  /** Série para filtrar (ex: '2º Ano', '8º Ano') */
  serie?: string | null
}

/**
 * Resultado das estatísticas gerais
 */
export interface EstatisticasGerais {
  // Identificação (preenchido conforme o escopo)
  nomeEscola?: string
  nomePolo?: string

  // Contadores globais (apenas para admin/tecnico)
  totalUsuarios?: number
  totalPolos?: number
  totalQuestoes?: number

  // Contadores comuns
  totalEscolas: number
  totalResultados: number
  totalAlunos: number          // Total de alunos cadastrados (tabela alunos)
  totalAlunosAvaliados: number // Total de alunos com resultados (P ou F na presença)
  totalTurmas: number
  totalAlunosPresentes: number
  totalAlunosFaltantes: number

  // Métricas de desempenho
  mediaGeral: number
  taxaAprovacao: number
  taxaAcertos?: number

  // Métricas por tipo de ensino
  mediaAnosIniciais: number
  mediaAnosFinais: number
  totalAnosIniciais: number
  totalAnosFinais: number

  // Séries disponíveis (com dados)
  seriesDisponiveis?: string[]
}

/**
 * Resultado de uma query individual com tratamento de erro
 */
interface QueryResult<T> {
  sucesso: boolean
  dados?: T
  erro?: string
}

// ============================================================================
// CONSTANTES LOCAIS (derivadas de lib/constants)
// ============================================================================

/** Valores de presença considerados como "presente" (case insensitive) */
const PRESENCA_PRESENTE = [PRESENCA.PRESENTE, PRESENCA.PRESENTE.toLowerCase()]

/** Valores de presença considerados como "faltante" (case insensitive) */
const PRESENCA_FALTANTE = [PRESENCA.FALTOU, PRESENCA.FALTOU.toLowerCase()]

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Executa uma query com tratamento de erro isolado
 * Evita que uma falha em uma query quebre todas as outras
 *
 * @param queryFn - Função que executa a query
 * @param descricao - Descrição da query para log de erro
 * @returns Resultado da query ou valor padrão em caso de erro
 */
async function executarQuerySegura<T>(
  queryFn: () => Promise<T>,
  descricao: string
): Promise<QueryResult<T>> {
  try {
    const dados = await queryFn()
    return { sucesso: true, dados }
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
    log.error(`Erro ao ${descricao}`, error, { data: { descricao } })
    return { sucesso: false, erro: mensagem }
  }
}

/**
 * Determina o escopo de estatísticas baseado no tipo de usuário
 */
export function determinarEscopo(usuario: Usuario): EscopoEstatisticas {
  const tipo = usuario.tipo_usuario as string // Cast para string permite comparação com legacy 'admin'

  if (tipo === 'administrador' || tipo === 'admin' || tipo === 'tecnico') {
    return 'global'
  }

  if (tipo === 'polo') {
    return 'polo'
  }

  return 'escola'
}

/**
 * Monta a cláusula WHERE baseada no escopo
 */
function montarFiltroEscopo(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas,
  aliasEscola: string = 'e',
  aliasResultado: string = 'rc'
): { where: string; params: (string | null)[] } {
  const params: (string | null)[] = []
  let where = ''

  if (escopo === 'polo' && filtros.poloId) {
    where = `${aliasEscola}.polo_id = $1`
    params.push(filtros.poloId)
  } else if (escopo === 'escola' && filtros.escolaId) {
    where = `${aliasResultado}.escola_id = $1`
    params.push(filtros.escolaId)
  }

  return { where, params }
}

/**
 * Gera filtro SQL para série
 * Retorna a condição SQL e se deve usar AND ou não
 */
function gerarFiltroSerie(serie: string | null | undefined, alias: string = 'rc'): string {
  if (!serie) return ''
  return `${alias}.serie = '${serie}'`
}

// ============================================================================
// QUERIES DE ESTATÍSTICAS
// ============================================================================

/**
 * Busca nome do polo
 */
async function buscarNomePolo(poloId: string): Promise<string> {
  const result = await pool.query(
    'SELECT nome FROM polos WHERE id = $1',
    [poloId]
  )
  return result.rows[0]?.nome || ''
}

/**
 * Busca nome da escola e polo associado
 */
async function buscarNomeEscolaPolo(escolaId: string): Promise<{ nomeEscola: string; nomePolo: string }> {
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
async function buscarContadoresGlobais(): Promise<{
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
 * Busca total de escolas com dados de avaliação
 * Usa resultados_consolidados_unificada para garantir consistência com a página de Dados
 */
async function buscarTotalEscolas(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  const params: (string | null)[] = []
  let paramIndex = 1
  const whereConditions: string[] = []

  // Filtro de escopo
  if (escopo === 'polo' && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`rc.serie = $${paramIndex}`)
    params.push(filtros.serie)
    paramIndex++
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
  const needsJoin = escopo === 'polo' && filtros.poloId

  const query = `
    SELECT COUNT(DISTINCT rc.escola_id) as total
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
  `

  const result = await pool.query(query, params)
  return parseDbInt(result.rows[0]?.total)
}

/**
 * Busca total de turmas com dados de avaliação
 * Usa resultados_consolidados_unificada para garantir consistência com a página de Dados
 */
async function buscarTotalTurmas(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  const params: (string | null)[] = []
  let paramIndex = 1
  const whereConditions: string[] = []

  // Filtro de escopo
  if (escopo === 'polo' && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`rc.serie = $${paramIndex}`)
    params.push(filtros.serie)
    paramIndex++
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
  const needsJoin = escopo === 'polo' && filtros.poloId

  const query = `
    SELECT COUNT(DISTINCT rc.turma_id) as total
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
  `

  const result = await pool.query(query, params)
  return parseDbInt(result.rows[0]?.total)
}

/**
 * Busca total de alunos
 */
async function buscarTotalAlunos(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<number> {
  let query = 'SELECT COUNT(*) as total FROM alunos WHERE ativo = true'
  const params: (string | null)[] = []
  let paramIndex = 1

  if (escopo === 'polo' && filtros.poloId) {
    query += ` AND escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndex})`
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    query += ` AND escola_id = $${paramIndex}`
    params.push(filtros.escolaId)
    paramIndex++
  }

  // Filtro de série
  if (filtros.serie) {
    query += ` AND serie = $${paramIndex}`
    params.push(filtros.serie)
    paramIndex++
  }

  const result = await pool.query(query, params)
  return parseDbInt(result.rows[0]?.total)
}

/**
 * Busca total de resultados de provas
 */
async function buscarTotalResultados(
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

  // Filtro de série
  if (filtros.serie) {
    query += hasWhere ? ' AND' : ' WHERE'
    query += ` serie = $${paramIndex}`
    params.push(filtros.serie)
    paramIndex++
  }

  const result = await pool.query(query, params)
  return parseDbInt(result.rows[0]?.total)
}

/**
 * Busca total de acertos (apenas para escola)
 */
async function buscarTotalAcertos(escolaId: string): Promise<number> {
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
async function buscarPresenca(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<{ presentes: number; faltantes: number; totalAvaliados: number }> {
  const params: (string | null)[] = []
  let paramIndex = 1
  let whereConditions: string[] = []

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

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`rc.serie = $${paramIndex}`)
    params.push(filtros.serie)
    paramIndex++
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
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
 * Busca média geral e taxa de aprovação
 */
async function buscarMediaEAprovacao(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<{ mediaGeral: number; taxaAprovacao: number }> {
  const params: (string | null)[] = []
  let paramIndex = 1
  let whereConditions: string[] = [
    `(rc.presenca IN ('P', 'p'))`,
    `rc.media_aluno IS NOT NULL`,
    `CAST(rc.media_aluno AS DECIMAL) > 0`
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

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`rc.serie = $${paramIndex}`)
    params.push(filtros.serie)
    paramIndex++
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  const needsJoin = escopo === 'polo' && filtros.poloId

  const query = `
    SELECT
      ROUND(AVG(CAST(rc.media_aluno AS DECIMAL)), 2) as media_geral,
      COUNT(CASE WHEN CAST(rc.media_aluno AS DECIMAL) >= ${NOTAS.APROVACAO} THEN 1 END) as aprovados,
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
 * Calcula a média dinamicamente a partir das notas individuais quando media_aluno não está disponível
 */
async function buscarMediasPorTipoEnsino(
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
  let whereConditions: string[] = [
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

  // Filtro de série
  if (filtros.serie) {
    whereConditions.push(`rc.serie = $${paramIndex}`)
    params.push(filtros.serie)
    paramIndex++
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  const needsJoin = escopo === 'polo' && filtros.poloId

  // Query que calcula a média dinamicamente:
  // - Se media_aluno está disponível, usa ela
  // - Senão, calcula a partir das notas individuais baseado no tipo de ensino
  // Anos Iniciais: (LP + MAT + PROD) / 3
  // Anos Finais: (LP + MAT + CH + CN) / 4
  const query = `
    SELECT
      CASE
        WHEN LEFT(rc.serie, 1) IN ('2', '3', '5') THEN 'anos_iniciais'
        WHEN LEFT(rc.serie, 1) IN ('6', '7', '8', '9') THEN 'anos_finais'
        ELSE 'outro'
      END as tipo_ensino,
      ROUND(AVG(
        COALESCE(
          NULLIF(CAST(rc.media_aluno AS DECIMAL), 0),
          CASE
            WHEN LEFT(rc.serie, 1) IN ('2', '3', '5') THEN
              (COALESCE(NULLIF(CAST(rc.nota_lp AS DECIMAL), 0), 0) +
               COALESCE(NULLIF(CAST(rc.nota_mat AS DECIMAL), 0), 0) +
               COALESCE(NULLIF(CAST(rc.nota_producao AS DECIMAL), 0), 0)) /
              NULLIF(
                (CASE WHEN COALESCE(NULLIF(CAST(rc.nota_lp AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END +
                 CASE WHEN COALESCE(NULLIF(CAST(rc.nota_mat AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END +
                 CASE WHEN COALESCE(NULLIF(CAST(rc.nota_producao AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END), 0)
            ELSE
              (COALESCE(NULLIF(CAST(rc.nota_lp AS DECIMAL), 0), 0) +
               COALESCE(NULLIF(CAST(rc.nota_mat AS DECIMAL), 0), 0) +
               COALESCE(NULLIF(CAST(rc.nota_ch AS DECIMAL), 0), 0) +
               COALESCE(NULLIF(CAST(rc.nota_cn AS DECIMAL), 0), 0)) /
              NULLIF(
                (CASE WHEN COALESCE(NULLIF(CAST(rc.nota_lp AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END +
                 CASE WHEN COALESCE(NULLIF(CAST(rc.nota_mat AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END +
                 CASE WHEN COALESCE(NULLIF(CAST(rc.nota_ch AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END +
                 CASE WHEN COALESCE(NULLIF(CAST(rc.nota_cn AS DECIMAL), 0), 0) > 0 THEN 1 ELSE 0 END), 0)
          END
        )
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

  return { mediaAnosIniciais, mediaAnosFinais, totalAnosIniciais, totalAnosFinais }
}

/**
 * Busca séries disponíveis (que têm dados)
 * Retorna apenas as séries que têm resultados cadastrados
 */
async function buscarSeriesDisponiveis(
  escopo: EscopoEstatisticas,
  filtros: FiltrosEstatisticas
): Promise<string[]> {
  const params: (string | null)[] = []
  let paramIndex = 1
  let whereConditions: string[] = [
    `rc.serie IS NOT NULL`,
    `rc.serie != ''`
  ]

  // Construir condições WHERE baseadas no escopo
  if (escopo === 'polo' && filtros.poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(filtros.poloId)
    paramIndex++
  } else if (escopo === 'escola' && filtros.escolaId) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(filtros.escolaId)
    paramIndex++
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`
  const needsJoin = escopo === 'polo' && filtros.poloId

  const query = `
    SELECT DISTINCT rc.serie
    FROM resultados_consolidados_unificada rc
    ${needsJoin ? 'INNER JOIN escolas e ON rc.escola_id = e.id' : ''}
    ${whereClause}
    ORDER BY rc.serie
  `

  const result = await pool.query(query, params)

  // Ordenar séries: Anos Iniciais (2, 3, 5) primeiro, depois Anos Finais (6, 7, 8, 9)
  const seriesOrdenadas = result.rows
    .map((row: any) => row.serie as string)
    .sort((a: string, b: string) => {
      const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0
      const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0
      return numA - numB
    })

  return seriesOrdenadas
}

// ============================================================================
// FUNÇÃO PRINCIPAL DO SERVIÇO
// ============================================================================

/**
 * Busca estatísticas gerais baseado no usuário e filtros
 *
 * Esta função centraliza toda a lógica de busca de estatísticas,
 * aplicando automaticamente os filtros baseados no tipo de usuário.
 *
 * @param usuario - Usuário autenticado
 * @param filtrosAdicionais - Filtros adicionais opcionais
 * @returns Estatísticas gerais filtradas pelo escopo do usuário
 *
 * @example
 * // Para admin/tecnico - retorna estatísticas globais
 * const stats = await getEstatisticas(usuarioAdmin)
 *
 * @example
 * // Para polo - retorna estatísticas filtradas pelo polo
 * const stats = await getEstatisticas(usuarioPolo)
 *
 * @example
 * // Para escola - retorna estatísticas filtradas pela escola
 * const stats = await getEstatisticas(usuarioEscola)
 */
export async function getEstatisticas(
  usuario: Usuario,
  filtrosAdicionais?: Partial<FiltrosEstatisticas>
): Promise<EstatisticasGerais> {
  const escopo = determinarEscopo(usuario)

  // Montar filtros baseados no escopo do usuário
  const filtros: FiltrosEstatisticas = {
    poloId: escopo === 'polo' ? usuario.polo_id : filtrosAdicionais?.poloId,
    escolaId: escopo === 'escola' ? usuario.escola_id : filtrosAdicionais?.escolaId,
    anoLetivo: filtrosAdicionais?.anoLetivo,
    serie: filtrosAdicionais?.serie
  }

  // Inicializar resultado com valores padrão
  const resultado: EstatisticasGerais = {
    totalEscolas: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalAlunosAvaliados: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
    taxaAprovacao: 0,
    mediaAnosIniciais: 0,
    mediaAnosFinais: 0,
    totalAnosIniciais: 0,
    totalAnosFinais: 0
  }

  // Buscar identificação (nome polo/escola)
  if (escopo === 'polo' && filtros.poloId) {
    const nomeQuery = await executarQuerySegura(
      () => buscarNomePolo(filtros.poloId!),
      'buscar nome do polo'
    )
    if (nomeQuery.sucesso) {
      resultado.nomePolo = nomeQuery.dados
    }
  } else if (escopo === 'escola' && filtros.escolaId) {
    const nomesQuery = await executarQuerySegura(
      () => buscarNomeEscolaPolo(filtros.escolaId!),
      'buscar nome da escola e polo'
    )
    if (nomesQuery.sucesso && nomesQuery.dados) {
      resultado.nomeEscola = nomesQuery.dados.nomeEscola
      resultado.nomePolo = nomesQuery.dados.nomePolo
    }
  }

  // Buscar contadores globais (apenas para admin/tecnico)
  if (escopo === 'global') {
    const globaisQuery = await executarQuerySegura(
      () => buscarContadoresGlobais(),
      'buscar contadores globais'
    )
    if (globaisQuery.sucesso && globaisQuery.dados) {
      resultado.totalUsuarios = globaisQuery.dados.totalUsuarios
      resultado.totalPolos = globaisQuery.dados.totalPolos
      resultado.totalQuestoes = globaisQuery.dados.totalQuestoes
    }
  }

  // Executar queries em paralelo para melhor performance
  const [
    escolasQuery,
    turmasQuery,
    alunosQuery,
    resultadosQuery,
    presencaQuery,
    mediaQuery,
    tipoEnsinoQuery,
    seriesQuery
  ] = await Promise.all([
    executarQuerySegura(() => buscarTotalEscolas(escopo, filtros), 'buscar total de escolas'),
    executarQuerySegura(() => buscarTotalTurmas(escopo, filtros), 'buscar total de turmas'),
    executarQuerySegura(() => buscarTotalAlunos(escopo, filtros), 'buscar total de alunos'),
    executarQuerySegura(() => buscarTotalResultados(escopo, filtros), 'buscar total de resultados'),
    executarQuerySegura(() => buscarPresenca(escopo, filtros), 'buscar presença'),
    executarQuerySegura(() => buscarMediaEAprovacao(escopo, filtros), 'buscar média e aprovação'),
    executarQuerySegura(() => buscarMediasPorTipoEnsino(escopo, filtros), 'buscar médias por tipo de ensino'),
    executarQuerySegura(() => buscarSeriesDisponiveis(escopo, filtros), 'buscar séries disponíveis')
  ])

  // Preencher resultado com dados das queries
  if (escolasQuery.sucesso) resultado.totalEscolas = escolasQuery.dados!
  if (turmasQuery.sucesso) resultado.totalTurmas = turmasQuery.dados!
  if (alunosQuery.sucesso) resultado.totalAlunos = alunosQuery.dados!
  if (resultadosQuery.sucesso) resultado.totalResultados = resultadosQuery.dados!

  if (presencaQuery.sucesso && presencaQuery.dados) {
    resultado.totalAlunosPresentes = presencaQuery.dados.presentes
    resultado.totalAlunosFaltantes = presencaQuery.dados.faltantes
    resultado.totalAlunosAvaliados = presencaQuery.dados.totalAvaliados
  }

  if (mediaQuery.sucesso && mediaQuery.dados) {
    resultado.mediaGeral = mediaQuery.dados.mediaGeral
    resultado.taxaAprovacao = mediaQuery.dados.taxaAprovacao
  }

  if (tipoEnsinoQuery.sucesso && tipoEnsinoQuery.dados) {
    resultado.mediaAnosIniciais = tipoEnsinoQuery.dados.mediaAnosIniciais
    resultado.mediaAnosFinais = tipoEnsinoQuery.dados.mediaAnosFinais
    resultado.totalAnosIniciais = tipoEnsinoQuery.dados.totalAnosIniciais
    resultado.totalAnosFinais = tipoEnsinoQuery.dados.totalAnosFinais
  }

  if (seriesQuery.sucesso && seriesQuery.dados) {
    resultado.seriesDisponiveis = seriesQuery.dados
  }

  // Buscar taxa de acertos (apenas para escola)
  if (escopo === 'escola' && filtros.escolaId) {
    const acertosQuery = await executarQuerySegura(
      () => buscarTotalAcertos(filtros.escolaId!),
      'buscar total de acertos'
    )
    if (acertosQuery.sucesso) {
      const totalAcertos = acertosQuery.dados!
      resultado.taxaAcertos = resultado.totalResultados > 0
        ? (totalAcertos / resultado.totalResultados) * 100
        : 0
    }
  }

  return resultado
}

/**
 * Retorna estatísticas com valores padrão em caso de erro
 * Útil para não quebrar o frontend quando há falhas no banco
 */
export function getEstatisticasPadrao(): EstatisticasGerais {
  return {
    totalEscolas: 0,
    totalResultados: 0,
    totalAlunos: 0,
    totalAlunosAvaliados: 0,
    totalTurmas: 0,
    totalAlunosPresentes: 0,
    totalAlunosFaltantes: 0,
    mediaGeral: 0,
    taxaAprovacao: 0,
    mediaAnosIniciais: 0,
    mediaAnosFinais: 0,
    totalAnosIniciais: 0,
    totalAnosFinais: 0
  }
}
