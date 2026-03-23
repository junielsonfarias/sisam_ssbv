/**
 * Serviço centralizado do Dashboard
 *
 * Extrai a lógica de negócio da rota dashboard-dados para funções reutilizáveis.
 * Cada função encapsula uma query específica com parâmetros tipados.
 *
 * @module services/dashboard
 */

import pool from '@/database/connection'
import { safeQuery } from '@/lib/api-helpers'
import { NOTAS, LIMITES } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { parseDbInt, parseDbNumber } from '@/lib/utils-numeros'
import { Usuario } from '@/lib/types'

const log = createLogger('Dashboard')

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface DashboardFiltros {
  poloId: string | null
  escolaId: string | null
  anoLetivo: string | null
  avaliacaoId: string | null
  serie: string | null
  turmaId: string | null
  presenca: string | null
  tipoEnsino: string | null
  nivelAprendizagem: string | null
  faixaMedia: string | null
  disciplina: string | null
  taxaAcertoMin: string | null
  taxaAcertoMax: string | null
  questaoCodigo: string | null
  areaConhecimento: string | null
  tipoAnalise: string | null
}

export interface PaginacaoAlunos {
  pagina: number
  limite: number
  offset: number
}

export interface PaginacaoAlunosResponse {
  paginaAtual: number
  itensPorPagina: number
  totalItens: number
  totalPaginas: number
}

export interface MetricasDashboard {
  total_alunos: number
  total_escolas: number
  total_turmas: number
  total_polos: number
  total_presentes: number
  total_faltantes: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number
  media_cn: number
  media_producao: number
  menor_media: number
  maior_media: number
  taxa_presenca: number
  total_respostas: number
  total_acertos: number
  total_erros: number
  taxa_acerto_geral: number
  taxa_erro_geral: number
}

export interface NivelDistribuicao {
  nivel: string
  quantidade: number
}

export interface MediaPorSerie {
  serie: string
  total_alunos: number
  presentes: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number | null
  media_cn: number | null
  media_prod: number | null
}

export interface MediaPorPolo {
  polo_id: string
  polo: string
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  presentes: number
  faltantes: number
}

export interface MediaPorEscola {
  escola_id: string
  escola: string
  polo: string
  total_turmas: number
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number | null
  media_cn: number | null
  media_prod: number | null
  presentes: number
  faltantes: number
}

export interface MediaPorTurma {
  turma_id: string
  turma: string
  escola: string
  serie: string
  total_alunos: number
  media_geral: number
  media_lp: number
  media_mat: number
  media_ch: number | null
  media_cn: number | null
  media_prod: number | null
  presentes: number
  faltantes: number
}

export interface FaixaNota {
  faixa: string
  quantidade: number
}

export interface PresencaDistribuicao {
  status: string
  quantidade: number
}

export interface FiltrosDisponiveis {
  polos: any[]
  escolas: any[]
  series: string[]
  turmas: any[]
  anosLetivos: string[]
  niveis: string[]
  faixasMedia: string[]
}

export interface AnaliseAcertosErros {
  taxaAcertoGeral: any
  taxaAcertoPorDisciplina: any[]
  questoesComMaisErros: any[]
  escolasComMaisErros: any[]
  turmasComMaisErros: any[]
  questoesComMaisAcertos: any[]
  escolasComMaisAcertos: any[]
  turmasComMaisAcertos: any[]
}

export interface ResumosPorSerie {
  questoes: any[]
  escolas: any[]
  turmas: any[]
  disciplinas: any[]
}

export interface DashboardResponse {
  metricas: MetricasDashboard
  niveis: NivelDistribuicao[]
  mediasPorSerie: MediaPorSerie[]
  mediasPorPolo: MediaPorPolo[]
  mediasPorEscola: MediaPorEscola[]
  mediasPorTurma: MediaPorTurma[]
  faixasNota: FaixaNota[]
  presenca: PresencaDistribuicao[]
  topAlunos: any[]
  alunosDetalhados: any[]
  paginacaoAlunos: PaginacaoAlunosResponse
  filtros: FiltrosDisponiveis
  analiseAcertosErros: AnaliseAcertosErros
  resumosPorSerie: ResumosPorSerie
}

/** Resultado de buildDashboardFilters com todas as variantes de WHERE necessárias */
export interface DashboardFilterResult {
  whereClause: string
  whereClauseBase: string
  params: any[]
  paramsBase: any[]
  /** Condições para queries de filtros dropdown */
  filtrosParams: any[]
  filtrosWhereClauseComPresenca: string
  /** Condições para queries de resultados_provas */
  rpWhereClauseComPresenca: string
  rpParams: any[]
  rpWhereClauseSemSerie: string
  rpParamsSemSerie: any[]
  /** JOIN para nivel_aprendizagem */
  joinNivelAprendizagem: string
  /** Queries de filtro separadas */
  seriesWhereClause: string
  turmasWhereClause: string
  anosLetivosWhereClause: string
}

// ============================================================================
// MAPEAMENTO DE DISCIPLINAS
// ============================================================================

const DISCIPLINA_MAP: Record<string, { campo: string; usarTabela: boolean }> = {
  'LP': { campo: 'nota_lp', usarTabela: false },
  'MAT': { campo: 'nota_mat', usarTabela: false },
  'CH': { campo: 'nota_ch', usarTabela: false },
  'CN': { campo: 'nota_cn', usarTabela: false },
  'PT': { campo: 'nota_producao', usarTabela: true }
}

// ============================================================================
// FILTROS
// ============================================================================

/**
 * Constrói todas as variantes de WHERE clause necessárias para o dashboard.
 * Lida com controle de acesso por tipo de usuário e todos os filtros.
 */
export function buildDashboardFilters(
  usuario: Usuario,
  filtros: DashboardFiltros
): DashboardFilterResult {
  const {
    poloId, escolaId, anoLetivo, avaliacaoId, serie, turmaId,
    presenca, tipoEnsino, nivelAprendizagem, faixaMedia, disciplina,
    taxaAcertoMin, taxaAcertoMax, questaoCodigo
  } = filtros

  let whereConditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  // Aplicar restrições de acesso
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(usuario.polo_id)
    paramIndex++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(usuario.escola_id)
    paramIndex++
  }

  // Filtros do usuário
  if (poloId) {
    whereConditions.push(`e.polo_id = $${paramIndex}`)
    params.push(poloId)
    paramIndex++
  }

  if (escolaId) {
    whereConditions.push(`rc.escola_id = $${paramIndex}`)
    params.push(escolaId)
    paramIndex++
  }

  if (anoLetivo) {
    whereConditions.push(`rc.ano_letivo = $${paramIndex}`)
    params.push(anoLetivo)
    paramIndex++
  }

  if (avaliacaoId) {
    whereConditions.push(`rc.avaliacao_id = $${paramIndex}`)
    params.push(avaliacaoId)
    paramIndex++
  }

  if (serie) {
    const numeroSerie = serie.match(/\d+/)?.[0]
    if (numeroSerie) {
      whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${paramIndex}`)
      params.push(numeroSerie)
      paramIndex++
    } else {
      whereConditions.push(`rc.serie ILIKE $${paramIndex}`)
      params.push(serie)
      paramIndex++
    }
  }

  // Filtro por tipo de ensino
  if (tipoEnsino) {
    if (tipoEnsino === 'anos_iniciais') {
      whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')`)
    } else if (tipoEnsino === 'anos_finais') {
      whereConditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('6', '7', '8', '9')`)
    }
  }

  if (turmaId) {
    whereConditions.push(`rc.turma_id = $${paramIndex}`)
    params.push(turmaId)
    paramIndex++
  }

  // Filtro de presença
  if (presenca) {
    whereConditions.push(`(rc.presenca = $${paramIndex} OR rc.presenca = LOWER($${paramIndex}))`)
    params.push(presenca.toUpperCase())
    paramIndex++
  } else {
    whereConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  }

  if (nivelAprendizagem) {
    if (nivelAprendizagem === 'Não classificado') {
      whereConditions.push(`(rc_table.nivel_aprendizagem IS NULL OR rc_table.nivel_aprendizagem = '')`)
    } else {
      whereConditions.push(`rc_table.nivel_aprendizagem = $${paramIndex}`)
      params.push(nivelAprendizagem)
      paramIndex++
    }
  }

  if (faixaMedia) {
    const [min, max] = faixaMedia.split('-').map(Number)
    if (!isNaN(min) && !isNaN(max)) {
      if (disciplina) {
        const infoDisciplina = DISCIPLINA_MAP[disciplina.toUpperCase()]
        if (infoDisciplina) {
          const prefixo = infoDisciplina.usarTabela ? 'rc_table' : 'rc'
          const campoNota = `COALESCE(CAST(${prefixo}.${infoDisciplina.campo} AS DECIMAL), 0)`
          whereConditions.push(`${campoNota} >= $${paramIndex} AND ${campoNota} < $${paramIndex + 1}`)
          params.push(min, max === 10 ? 10.01 : max)
          paramIndex += 2
        }
      } else {
        const mediaCalculada = `
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              ROUND((COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) / 3.0, 2)
            ELSE
              ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0, 2)
          END
        `
        whereConditions.push(`(${mediaCalculada}) >= $${paramIndex} AND (${mediaCalculada}) < $${paramIndex + 1}`)
        params.push(min, max === 10 ? 10.01 : max)
        paramIndex += 2
      }
    }
  }

  // Guardar condições base (sem disciplina) para métricas gerais
  const whereConditionsBase = [...whereConditions]
  const paramsBase = [...params]

  if (disciplina) {
    const infoDisciplina = DISCIPLINA_MAP[disciplina.toUpperCase()]
    if (infoDisciplina) {
      const prefixo = infoDisciplina.usarTabela ? 'rc_table' : 'rc'
      if (!faixaMedia) {
        whereConditions.push(`${prefixo}.${infoDisciplina.campo} IS NOT NULL AND CAST(${prefixo}.${infoDisciplina.campo} AS DECIMAL) > 0`)
      }
    }
  }

  const whereClauseBase = whereConditionsBase.length > 0 ? `WHERE ${whereConditionsBase.join(' AND ')}` : ''

  // Filtro de taxa de acerto mínima/máxima
  if (taxaAcertoMin || taxaAcertoMax) {
    const mediaCalculadaTaxa = `
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
          ROUND((COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) / 3.0, 2)
        ELSE
          ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0, 2)
      END
    `
    if (taxaAcertoMin) {
      const taxaMin = parseFloat(taxaAcertoMin)
      if (!isNaN(taxaMin)) {
        const mediaMin = (taxaMin / 100) * 10
        whereConditions.push(`(${mediaCalculadaTaxa}) >= $${paramIndex}`)
        params.push(mediaMin)
        paramIndex++
      }
    }
    if (taxaAcertoMax) {
      const taxaMax = parseFloat(taxaAcertoMax)
      if (!isNaN(taxaMax)) {
        const mediaMax = (taxaMax / 100) * 10
        whereConditions.push(`(${mediaCalculadaTaxa}) <= $${paramIndex}`)
        params.push(mediaMax)
        paramIndex++
      }
    }
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

  const joinNivelAprendizagem = 'LEFT JOIN resultados_consolidados rc_table ON rc.aluno_id = rc_table.aluno_id AND rc.ano_letivo = rc_table.ano_letivo'

  // ========== FILTROS PARA DROPDOWNS ==========
  const filtrosWhereConditions: string[] = []
  const filtrosParams: any[] = []
  let filtrosParamIndex = 1

  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    filtrosWhereConditions.push(`e.polo_id = $${filtrosParamIndex}`)
    filtrosParams.push(usuario.polo_id)
    filtrosParamIndex++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    filtrosWhereConditions.push(`rc.escola_id = $${filtrosParamIndex}`)
    filtrosParams.push(usuario.escola_id)
    filtrosParamIndex++
  }

  if (anoLetivo) {
    filtrosWhereConditions.push(`rc.ano_letivo = $${filtrosParamIndex}`)
    filtrosParams.push(anoLetivo)
    filtrosParamIndex++
  }

  // Filtros com presença para dropdown
  const filtrosComPresenca = [...filtrosWhereConditions]
  if (presenca) {
    filtrosComPresenca.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
    filtrosParams.push(presenca.toUpperCase())
    filtrosParamIndex++
  } else {
    filtrosComPresenca.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  }
  const filtrosWhereClauseComPresenca = filtrosComPresenca.length > 0
    ? `WHERE ${filtrosComPresenca.join(' AND ')}`
    : ''

  // Series
  const seriesConditions = [...filtrosWhereConditions]
  seriesConditions.push(`rc.serie IS NOT NULL AND rc.serie != ''`)
  if (presenca) {
    seriesConditions.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
    filtrosParams.push(presenca.toUpperCase())
    filtrosParamIndex++
  } else {
    seriesConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  }
  const seriesWhereClause = seriesConditions.length > 0 ? `WHERE ${seriesConditions.join(' AND ')}` : ''

  // Turmas
  const turmasConditions = [...filtrosWhereConditions]
  if (presenca) {
    turmasConditions.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
    filtrosParams.push(presenca.toUpperCase())
    filtrosParamIndex++
  } else {
    turmasConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  }
  const turmasWhereClause = turmasConditions.length > 0 ? `WHERE ${turmasConditions.join(' AND ')}` : ''

  // Anos letivos
  const anosLetivosConditions = [...filtrosWhereConditions]
  anosLetivosConditions.push(`rc.ano_letivo IS NOT NULL AND rc.ano_letivo != ''`)
  if (presenca) {
    anosLetivosConditions.push(`(rc.presenca = $${filtrosParamIndex} OR rc.presenca = LOWER($${filtrosParamIndex}))`)
    filtrosParams.push(presenca.toUpperCase())
    filtrosParamIndex++
  } else {
    anosLetivosConditions.push(`(rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f')`)
  }
  const anosLetivosWhereClause = anosLetivosConditions.length > 0 ? `WHERE ${anosLetivosConditions.join(' AND ')}` : ''

  // ========== CONDIÇÕES PARA resultados_provas ==========
  const rpWhereConditions: string[] = []
  const rpParams: any[] = []
  let rpParamIndex = 1

  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    rpWhereConditions.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndex})`)
    rpParams.push(usuario.polo_id)
    rpParamIndex++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    rpWhereConditions.push(`rp.escola_id = $${rpParamIndex}`)
    rpParams.push(usuario.escola_id)
    rpParamIndex++
  }

  if (poloId) {
    rpWhereConditions.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndex})`)
    rpParams.push(poloId)
    rpParamIndex++
  }

  if (escolaId) {
    rpWhereConditions.push(`rp.escola_id = $${rpParamIndex}`)
    rpParams.push(escolaId)
    rpParamIndex++
  }

  if (anoLetivo) {
    rpWhereConditions.push(`rp.ano_letivo = $${rpParamIndex}`)
    rpParams.push(anoLetivo)
    rpParamIndex++
  }

  if (serie) {
    const numeroSerie = serie.match(/\d+/)?.[0]
    if (numeroSerie) {
      rpWhereConditions.push(`REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g') = $${rpParamIndex}`)
      rpParams.push(numeroSerie)
      rpParamIndex++
    } else {
      rpWhereConditions.push(`rp.serie ILIKE $${rpParamIndex}`)
      rpParams.push(serie)
      rpParamIndex++
    }
  }

  if (turmaId) {
    rpWhereConditions.push(`rp.turma_id = $${rpParamIndex}`)
    rpParams.push(turmaId)
    rpParamIndex++
  }

  if (presenca) {
    rpWhereConditions.push(`(rp.presenca = $${rpParamIndex} OR rp.presenca = LOWER($${rpParamIndex}))`)
    rpParams.push(presenca.toUpperCase())
    rpParamIndex++
  }

  if (disciplina) {
    const disciplinaUpper = disciplina.toUpperCase().trim()
    let searchPatterns: string[] = []

    if (disciplinaUpper === 'LP' || disciplinaUpper === 'LÍNGUA PORTUGUESA' || disciplinaUpper === 'LINGUA PORTUGUESA') {
      searchPatterns = ['LP', 'Língua Portuguesa', 'Lingua Portuguesa', 'LÍNGUA PORTUGUESA', 'LINGUA PORTUGUESA', 'português', 'Português', 'PORTUGUÊS']
    } else if (disciplinaUpper === 'MAT' || disciplinaUpper === 'MATEMÁTICA' || disciplinaUpper === 'MATEMATICA') {
      searchPatterns = ['MAT', 'Matemática', 'Matematica', 'MATEMÁTICA', 'MATEMATICA']
    } else if (disciplinaUpper === 'CH' || disciplinaUpper === 'CIÊNCIAS HUMANAS' || disciplinaUpper === 'CIENCIAS HUMANAS') {
      searchPatterns = ['CH', 'Ciências Humanas', 'Ciencias Humanas', 'CIÊNCIAS HUMANAS', 'CIENCIAS HUMANAS', 'humanas', 'Humanas', 'HUMANAS']
    } else if (disciplinaUpper === 'CN' || disciplinaUpper === 'CIÊNCIAS DA NATUREZA' || disciplinaUpper === 'CIENCIAS DA NATUREZA') {
      searchPatterns = ['CN', 'Ciências da Natureza', 'Ciencias da Natureza', 'CIÊNCIAS DA NATUREZA', 'CIENCIAS DA NATUREZA', 'natureza', 'Natureza', 'NATUREZA']
    } else if (disciplinaUpper === 'PT' || disciplinaUpper === 'PRODUÇÃO TEXTUAL' || disciplinaUpper === 'PRODUCAO TEXTUAL') {
      searchPatterns = ['PT', 'Produção Textual', 'Producao Textual', 'PRODUÇÃO TEXTUAL', 'PRODUCAO TEXTUAL', 'Redação', 'Redacao', 'REDAÇÃO', 'REDACAO']
    } else {
      searchPatterns = [disciplina, disciplinaUpper, disciplina.toLowerCase()]
    }

    const conditions: string[] = []
    searchPatterns.forEach((pattern) => {
      conditions.push(`rp.disciplina = $${rpParamIndex}`)
      conditions.push(`rp.area_conhecimento = $${rpParamIndex}`)
      rpParams.push(pattern)
      rpParamIndex++
    })

    rpWhereConditions.push(`(${conditions.join(' OR ')})`)
  }

  if (questaoCodigo) {
    rpWhereConditions.push(`rp.questao_codigo = $${rpParamIndex}`)
    rpParams.push(questaoCodigo)
    rpParamIndex++
  }

  // Com presença para análises
  const rpWhereConditionsComPresenca = [...rpWhereConditions]
  if (!presenca) {
    rpWhereConditionsComPresenca.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)
  }
  const rpWhereClauseComPresenca = rpWhereConditionsComPresenca.length > 0
    ? `WHERE ${rpWhereConditionsComPresenca.join(' AND ')}`
    : ''

  // ========== CONDIÇÕES PARA resumos sem série ==========
  const rpWhereConditionsSemSerie: string[] = []
  const rpParamsSemSerie: any[] = []
  let rpParamIndexSemSerie = 1

  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    rpWhereConditionsSemSerie.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndexSemSerie})`)
    rpParamsSemSerie.push(usuario.polo_id)
    rpParamIndexSemSerie++
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    rpWhereConditionsSemSerie.push(`rp.escola_id = $${rpParamIndexSemSerie}`)
    rpParamsSemSerie.push(usuario.escola_id)
    rpParamIndexSemSerie++
  }

  if (poloId) {
    rpWhereConditionsSemSerie.push(`rp.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${rpParamIndexSemSerie})`)
    rpParamsSemSerie.push(poloId)
    rpParamIndexSemSerie++
  }
  if (escolaId) {
    rpWhereConditionsSemSerie.push(`rp.escola_id = $${rpParamIndexSemSerie}`)
    rpParamsSemSerie.push(escolaId)
    rpParamIndexSemSerie++
  }
  if (anoLetivo) {
    rpWhereConditionsSemSerie.push(`rp.ano_letivo = $${rpParamIndexSemSerie}`)
    rpParamsSemSerie.push(anoLetivo)
    rpParamIndexSemSerie++
  }
  if (turmaId) {
    rpWhereConditionsSemSerie.push(`rp.turma_id = $${rpParamIndexSemSerie}`)
    rpParamsSemSerie.push(turmaId)
    rpParamIndexSemSerie++
  }
  if (presenca) {
    rpWhereConditionsSemSerie.push(`(rp.presenca = $${rpParamIndexSemSerie} OR rp.presenca = LOWER($${rpParamIndexSemSerie}))`)
    rpParamsSemSerie.push(presenca.toUpperCase())
    rpParamIndexSemSerie++
  } else {
    rpWhereConditionsSemSerie.push(`(rp.presenca = 'P' OR rp.presenca = 'p')`)
  }

  const rpWhereClauseSemSerie = rpWhereConditionsSemSerie.length > 0
    ? `WHERE ${rpWhereConditionsSemSerie.join(' AND ')}`
    : ''

  return {
    whereClause,
    whereClauseBase,
    params,
    paramsBase,
    filtrosParams,
    filtrosWhereClauseComPresenca,
    rpWhereClauseComPresenca,
    rpParams,
    rpWhereClauseSemSerie,
    rpParamsSemSerie,
    joinNivelAprendizagem,
    seriesWhereClause,
    turmasWhereClause,
    anosLetivosWhereClause
  }
}

// ============================================================================
// QUERIES DE DADOS
// ============================================================================

/**
 * Busca métricas gerais do dashboard (totais, médias, etc.)
 */
export async function fetchDashboardMetricas(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any> {
  const sql = `
    SELECT
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      COUNT(DISTINCT rc.escola_id) as total_escolas,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(DISTINCT e.polo_id) as total_polos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as total_presentes,
      COUNT(CASE WHEN (rc.presenca = 'F' OR rc.presenca = 'f') THEN 1 END) as total_faltantes,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
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
        ELSE NULL
      END), 2) as media_geral,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_lp IS NOT NULL AND CAST(rc.nota_lp AS DECIMAL) > 0) THEN CAST(rc.nota_lp AS DECIMAL) ELSE NULL END), 2) as media_lp,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_mat IS NOT NULL AND CAST(rc.nota_mat AS DECIMAL) > 0) THEN CAST(rc.nota_mat AS DECIMAL) ELSE NULL END), 2) as media_mat,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_ch IS NOT NULL AND CAST(rc.nota_ch AS DECIMAL) > 0) THEN CAST(rc.nota_ch AS DECIMAL) ELSE NULL END), 2) as media_ch,
      ROUND(AVG(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') AND (rc.nota_cn IS NOT NULL AND CAST(rc.nota_cn AS DECIMAL) > 0) THEN CAST(rc.nota_cn AS DECIMAL) ELSE NULL END), 2) as media_cn,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p')
          AND REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5')
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
  return safeQuery(pool, sql, paramsBase, 'metricas')
}

/**
 * Busca distribuição por nível de aprendizagem (apenas anos iniciais)
 */
export async function fetchDashboardNiveis(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any[]> {
  // Adicionar condições de anos iniciais e presença
  const baseConditions = whereClauseBase ? whereClauseBase.replace('WHERE ', '') : ''
  const niveisConditions = baseConditions ? [baseConditions] : []
  niveisConditions.push(`(REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5'))`)
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
  return safeQuery(pool, sql, paramsBase, 'niveis')
}

/**
 * Busca médias por série
 */
export async function fetchMediasPorSerie(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any[]> {
  const sql = `
    SELECT
      rc.serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      COUNT(CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN 1 END) as presentes,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
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
        ELSE NULL
      END), 2) as media_geral,
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
    ORDER BY REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer NULLS LAST
  `
  return safeQuery(pool, sql, paramsBase, 'mediasPorSerie')
}

/**
 * Busca médias por polo
 */
export async function fetchMediasPorPolo(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any[]> {
  const sql = `
    SELECT
      p.id as polo_id,
      p.nome as polo,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_producao AS DECIMAL), 0)) / 3.0
            ELSE
              (COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0
          END
        ELSE NULL
      END), 2) as media_geral,
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
  return safeQuery(pool, sql, paramsBase, 'mediasPorPolo')
}

/**
 * Busca médias por escola
 */
export async function fetchMediasPorEscola(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any[]> {
  const sql = `
    SELECT
      e.id as escola_id,
      e.nome as escola,
      p.nome as polo,
      COUNT(DISTINCT rc.turma_id) as total_turmas,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
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
    LEFT JOIN polos p ON e.polo_id = p.id
    ${joinNivelAprendizagem}
    ${whereClauseBase}
    GROUP BY e.id, e.nome, p.nome
    ORDER BY media_geral DESC NULLS LAST
  `
  return safeQuery(pool, sql, paramsBase, 'mediasPorEscola')
}

/**
 * Busca médias por turma
 */
export async function fetchMediasPorTurma(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any[]> {
  const sql = `
    SELECT
      t.id as turma_id,
      t.codigo as turma,
      e.nome as escola,
      t.serie,
      COUNT(DISTINCT CASE WHEN (rc.presenca = 'P' OR rc.presenca = 'p' OR rc.presenca = 'F' OR rc.presenca = 'f') THEN rc.aluno_id END) as total_alunos,
      ROUND(AVG(CASE
        WHEN (rc.presenca = 'P' OR rc.presenca = 'p') THEN
          CASE
            WHEN REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
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
  return safeQuery(pool, sql, paramsBase, 'mediasPorTurma')
}

/**
 * Busca distribuição por faixa de nota
 */
export async function fetchFaixasNota(
  whereClause: string,
  params: any[],
  joinNivelAprendizagem: string,
  presenca: string | null
): Promise<any[]> {
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
  return safeQuery(pool, sql, params, 'faixasNota')
}

/**
 * Busca distribuição de presença
 */
export async function fetchPresenca(
  whereClauseBase: string,
  paramsBase: any[],
  joinNivelAprendizagem: string
): Promise<any[]> {
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
  return safeQuery(pool, sql, paramsBase, 'presenca')
}

/**
 * Busca top 10 alunos
 */
export async function fetchTopAlunos(
  whereClause: string,
  params: any[],
  presenca: string | null
): Promise<any[]> {
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
    : `ORDER BY
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            ROUND((COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) / 3.0, 2)
          ELSE
            ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0, 2)
        END DESC`

  const sql = `
    SELECT
      a.nome as aluno,
      e.nome as escola,
      rc.serie,
      t.codigo as turma,
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
          ROUND(
            (
              COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)
            ) / 3.0,
            2
          )
        ELSE
          ROUND(
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / 4.0,
            2
          )
      END as media_aluno,
      CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_lp ELSE rc.nota_lp END as nota_lp,
      CASE WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_mat ELSE rc.nota_mat END as nota_mat,
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
  return safeQuery(pool, sql, params, 'topAlunos')
}

/**
 * Busca alunos detalhados com paginação
 */
export async function fetchAlunosDetalhados(
  whereClause: string,
  params: any[],
  paginacao: PaginacaoAlunos,
  presenca: string | null
): Promise<{ alunos: any[]; total: number }> {
  const orderBy = presenca === 'F'
    ? 'ORDER BY a.nome ASC'
    : `ORDER BY
        CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
            ROUND((COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)) / 3.0, 2)
          ELSE
            ROUND((COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) + COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) + COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) + COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)) / 4.0, 2)
        END DESC NULLS LAST`

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
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
          ROUND(
            (
              COALESCE(CAST(rc_table.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc_table.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc_table.nota_producao AS DECIMAL), 0)
            ) / 3.0,
            2
          )
        ELSE
          ROUND(
            (
              COALESCE(CAST(rc.nota_lp AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_ch AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_mat AS DECIMAL), 0) +
              COALESCE(CAST(rc.nota_cn AS DECIMAL), 0)
            ) / 4.0,
            2
          )
      END as media_aluno,
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_lp
        ELSE rc.nota_lp
      END as nota_lp,
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.nota_mat
        ELSE rc.nota_mat
      END as nota_mat,
      rc.nota_ch,
      rc.nota_cn,
      COALESCE(rc_table.nota_producao, NULL) as nota_producao,
      COALESCE(rc_table.nivel_aprendizagem, NULL) as nivel_aprendizagem,
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.total_acertos_lp
        ELSE rc.total_acertos_lp
      END as total_acertos_lp,
      rc.total_acertos_ch,
      CASE
        WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN rc_table.total_acertos_mat
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
    LEFT JOIN configuracao_series cs ON REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = cs.serie::text
    ${whereClause}
    ${orderBy}
    LIMIT ${paginacao.limite} OFFSET ${paginacao.offset}
  `

  const [totalRows, alunosRows] = await Promise.all([
    safeQuery(pool, totalSql, params, 'totalAlunos'),
    safeQuery(pool, alunosSql, params, 'alunosDetalhados')
  ])

  return {
    alunos: alunosRows,
    total: parseDbInt((totalRows[0] as any)?.total)
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
    safeQuery(pool, `
      SELECT DISTINCT p.id, p.nome
      FROM polos p
      INNER JOIN escolas e ON e.polo_id = p.id
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClauseComPresenca}
      ORDER BY p.nome
    `, filtrosParams, 'filtros.polos'),

    safeQuery(pool, `
      SELECT DISTINCT e.id, e.nome, e.polo_id
      FROM escolas e
      INNER JOIN resultados_consolidados_unificada rc ON rc.escola_id = e.id
      ${filtrosWhereClauseComPresenca}
      ORDER BY e.nome
    `, filtrosParams, 'filtros.escolas'),

    safeQuery(pool, `
      SELECT DISTINCT REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') || 'º Ano' as serie,
             REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer as serie_numero
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${seriesWhereClause}
      ORDER BY serie_numero
    `, filtrosParams, 'filtros.series'),

    safeQuery(pool, `
      SELECT DISTINCT t.id, t.codigo, t.escola_id
      FROM turmas t
      INNER JOIN resultados_consolidados_unificada rc ON rc.turma_id = t.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${turmasWhereClause}
      ORDER BY t.codigo
    `, filtrosParams, 'filtros.turmas'),

    safeQuery(pool, `
      SELECT DISTINCT rc.ano_letivo
      FROM resultados_consolidados_unificada rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      ${anosLetivosWhereClause}
      ORDER BY rc.ano_letivo DESC
    `, filtrosParams, 'filtros.anosLetivos'),

    safeQuery(pool, `
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
    series: seriesRows.map((r: any) => r.serie),
    turmas: turmasRows,
    anosLetivos: anosLetivosRows.map((r: any) => r.ano_letivo),
    niveis: niveisRows.map((r: any) => r.nivel),
    faixasMedia: ['0-2', '2-4', '4-6', '6-8', '8-10']
  }
}

/**
 * Busca análise de acertos/erros (resultados_provas)
 */
export async function fetchAnaliseAcertosErros(
  rpWhereClauseComPresenca: string,
  rpParams: any[]
): Promise<AnaliseAcertosErros> {
  const [
    taxaAcertoPorDisciplinaRows,
    taxaAcertoGeralRows,
    questoesErrosRows,
    escolasErrosRows,
    turmasErrosRows,
    questoesAcertosRows,
    escolasAcertosRows,
    turmasAcertosRows
  ] = await Promise.all([
    // Taxa de acerto por disciplina
    safeQuery(pool, `
      SELECT
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      ${rpWhereClauseComPresenca}
      GROUP BY COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      ORDER BY taxa_erro DESC, total_erros DESC
    `, rpParams, 'taxaAcertoPorDisciplina'),

    // Taxa de acerto geral
    safeQuery(pool, `
      SELECT
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto_geral,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro_geral
      FROM resultados_provas rp
      ${rpWhereClauseComPresenca}
    `, rpParams, 'taxaAcertoGeral'),

    // Questões com mais erros
    safeQuery(pool, `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseComPresenca}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `, rpParams, 'questoesComMaisErros'),

    // Escolas com mais erros
    safeQuery(pool, `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseComPresenca}
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(*) >= 1
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `, rpParams, 'escolasComMaisErros'),

    // Turmas com mais erros
    safeQuery(pool, `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseComPresenca}
      GROUP BY t.id, t.codigo, e.nome, rp.serie
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
      ORDER BY taxa_erro DESC, total_erros DESC
      LIMIT 20
    `, rpParams, 'turmasComMaisErros'),

    // Questões com mais acertos
    safeQuery(pool, `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseComPresenca}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `, rpParams, 'questoesComMaisAcertos'),

    // Escolas com mais acertos
    safeQuery(pool, `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseComPresenca}
      GROUP BY e.id, e.nome, p.nome
      HAVING COUNT(*) >= 1
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `, rpParams, 'escolasComMaisAcertos'),

    // Turmas com mais acertos
    safeQuery(pool, `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        ROUND((COUNT(CASE WHEN rp.acertou = true THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_acerto,
        ROUND((COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as taxa_erro,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseComPresenca}
      GROUP BY t.id, t.codigo, e.nome, rp.serie
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
      ORDER BY taxa_acerto DESC, total_acertos DESC
      LIMIT 20
    `, rpParams, 'turmasComMaisAcertos')
  ])

  const taxaAcertoGeral = (taxaAcertoGeralRows[0] as any) || null

  return {
    taxaAcertoGeral: taxaAcertoGeral ? {
      total_respostas: parseDbInt(taxaAcertoGeral.total_respostas),
      total_acertos: parseDbInt(taxaAcertoGeral.total_acertos),
      total_erros: parseDbInt(taxaAcertoGeral.total_erros),
      taxa_acerto_geral: parseDbNumber(taxaAcertoGeral.taxa_acerto_geral),
      taxa_erro_geral: parseDbNumber(taxaAcertoGeral.taxa_erro_geral)
    } : null,
    taxaAcertoPorDisciplina: taxaAcertoPorDisciplinaRows.map((row: any) => ({
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro)
    })),
    questoesComMaisErros: questoesErrosRows.map((row: any) => ({
      questao_codigo: row.questao_codigo,
      questao_descricao: row.questao_descricao || 'Descrição não disponível',
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro)
    })),
    escolasComMaisErros: escolasErrosRows.map((row: any) => ({
      escola_id: row.escola_id,
      escola: row.escola,
      polo: row.polo,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    turmasComMaisErros: turmasErrosRows.map((row: any) => ({
      turma_id: row.turma_id,
      turma: row.turma,
      escola: row.escola,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    questoesComMaisAcertos: questoesAcertosRows.map((row: any) => ({
      questao_codigo: row.questao_codigo,
      questao_descricao: row.questao_descricao || 'Descrição não disponível',
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro)
    })),
    escolasComMaisAcertos: escolasAcertosRows.map((row: any) => ({
      escola_id: row.escola_id,
      escola: row.escola,
      polo: row.polo,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    turmasComMaisAcertos: turmasAcertosRows.map((row: any) => ({
      turma_id: row.turma_id,
      turma: row.turma,
      escola: row.escola,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      taxa_acerto: parseDbNumber(row.taxa_acerto),
      taxa_erro: parseDbNumber(row.taxa_erro),
      total_alunos: parseDbInt(row.total_alunos)
    }))
  }
}

/**
 * Busca resumos por série para cache local no frontend
 */
export async function fetchResumosPorSerie(
  rpWhereClauseSemSerie: string,
  rpParamsSemSerie: any[],
  serie: string | null
): Promise<ResumosPorSerie> {
  // Somente buscar se não há filtro de série (dados de TODAS as séries para cache local)
  if (serie) {
    return { questoes: [], escolas: [], turmas: [], disciplinas: [] }
  }

  const [questoesRows, escolasRows, turmasRows, disciplinasRows] = await Promise.all([
    safeQuery(pool, `
      SELECT
        rp.questao_codigo,
        q.descricao as questao_descricao,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
      FROM resultados_provas rp
      LEFT JOIN questoes q ON rp.questao_id = q.id OR rp.questao_codigo = q.codigo
      ${rpWhereClauseSemSerie}
      GROUP BY rp.questao_codigo, q.descricao, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado'), rp.serie
      HAVING COUNT(*) >= 1
    `, rpParamsSemSerie, 'resumoQuestoesPorSerie'),

    safeQuery(pool, `
      SELECT
        e.id as escola_id,
        e.nome as escola,
        p.nome as polo,
        rp.serie,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      ${rpWhereClauseSemSerie}
      GROUP BY e.id, e.nome, p.nome, rp.serie, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING COUNT(*) >= 1
    `, rpParamsSemSerie, 'resumoEscolasPorSerie'),

    safeQuery(pool, `
      SELECT
        t.id as turma_id,
        t.codigo as turma,
        e.nome as escola,
        rp.serie,
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros,
        COUNT(DISTINCT rp.aluno_id) as total_alunos
      FROM resultados_provas rp
      INNER JOIN escolas e ON rp.escola_id = e.id
      LEFT JOIN turmas t ON rp.turma_id = t.id
      ${rpWhereClauseSemSerie}
      GROUP BY t.id, t.codigo, e.nome, rp.serie, COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado')
      HAVING t.id IS NOT NULL AND COUNT(*) >= 10
    `, rpParamsSemSerie, 'resumoTurmasPorSerie'),

    safeQuery(pool, `
      SELECT
        COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado') as disciplina,
        rp.serie,
        COUNT(*) as total_respostas,
        COUNT(CASE WHEN rp.acertou = true THEN 1 END) as total_acertos,
        COUNT(CASE WHEN rp.acertou = false OR rp.acertou IS NULL THEN 1 END) as total_erros
      FROM resultados_provas rp
      ${rpWhereClauseSemSerie}
      GROUP BY COALESCE(rp.disciplina, rp.area_conhecimento, 'Não informado'), rp.serie
    `, rpParamsSemSerie, 'resumoDisciplinasPorSerie')
  ])

  return {
    questoes: questoesRows.map((row: any) => ({
      questao_codigo: row.questao_codigo,
      questao_descricao: row.questao_descricao || 'Descrição não disponível',
      disciplina: row.disciplina,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros)
    })),
    escolas: escolasRows.map((row: any) => ({
      escola_id: row.escola_id,
      escola: row.escola,
      polo: row.polo,
      serie: row.serie,
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    turmas: turmasRows.map((row: any) => ({
      turma_id: row.turma_id,
      turma: row.turma,
      escola: row.escola,
      serie: row.serie,
      disciplina: row.disciplina,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros),
      total_alunos: parseDbInt(row.total_alunos)
    })),
    disciplinas: disciplinasRows.map((row: any) => ({
      disciplina: row.disciplina,
      serie: row.serie,
      total_respostas: parseDbInt(row.total_respostas),
      total_acertos: parseDbInt(row.total_acertos),
      total_erros: parseDbInt(row.total_erros)
    }))
  }
}

// ============================================================================
// ORQUESTRADOR PRINCIPAL
// ============================================================================

/**
 * Busca todos os dados do dashboard em paralelo.
 * Orquestrador principal que chama todas as funções de fetch.
 */
export async function getDashboardData(
  usuario: Usuario,
  filtros: DashboardFiltros,
  paginacao: PaginacaoAlunos
): Promise<DashboardResponse> {
  log.info('Buscando dados do dashboard', { userId: usuario.id })

  const filters = buildDashboardFilters(usuario, filtros)
  const {
    whereClause, whereClauseBase, params, paramsBase,
    joinNivelAprendizagem, rpWhereClauseComPresenca, rpParams,
    rpWhereClauseSemSerie, rpParamsSemSerie
  } = filters

  // Executar todas as queries em paralelo
  const [
    metricasRows,
    niveisRows,
    mediasPorSerieRows,
    mediasPorPoloRows,
    mediasPorEscolaRows,
    mediasPorTurmaRows,
    faixasNotaRows,
    presencaRows,
    topAlunosRows,
    alunosResult,
    filtrosDisp,
    analise,
    resumos
  ] = await Promise.all([
    fetchDashboardMetricas(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchDashboardNiveis(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorSerie(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorPolo(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorEscola(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchMediasPorTurma(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchFaixasNota(whereClause, params, joinNivelAprendizagem, filtros.presenca),
    fetchPresenca(whereClauseBase, paramsBase, joinNivelAprendizagem),
    fetchTopAlunos(whereClause, params, filtros.presenca),
    fetchAlunosDetalhados(whereClause, params, paginacao, filtros.presenca),
    fetchFiltrosDisponiveis(filters),
    fetchAnaliseAcertosErros(rpWhereClauseComPresenca, rpParams),
    fetchResumosPorSerie(rpWhereClauseSemSerie, rpParamsSemSerie, filtros.serie)
  ])

  const metricas = metricasRows[0] || {}
  const taxaAcertoGeral = analise.taxaAcertoGeral || {}

  // Montar resposta
  return {
    metricas: {
      total_alunos: parseDbInt(metricas.total_alunos),
      total_escolas: parseDbInt(metricas.total_escolas),
      total_turmas: parseDbInt(metricas.total_turmas),
      total_polos: parseDbInt(metricas.total_polos),
      total_presentes: parseDbInt(metricas.total_presentes),
      total_faltantes: parseDbInt(metricas.total_faltantes),
      media_geral: parseDbNumber(metricas.media_geral),
      media_lp: parseDbNumber(metricas.media_lp),
      media_mat: parseDbNumber(metricas.media_mat),
      media_ch: parseDbNumber(metricas.media_ch),
      media_cn: parseDbNumber(metricas.media_cn),
      media_producao: parseDbNumber(metricas.media_producao),
      menor_media: parseDbNumber(metricas.menor_media),
      maior_media: parseDbNumber(metricas.maior_media),
      taxa_presenca: parseDbInt(metricas.total_alunos) > 0
        ? Math.round((parseDbInt(metricas.total_presentes) / parseDbInt(metricas.total_alunos)) * 100)
        : 0,
      total_respostas: parseDbInt(taxaAcertoGeral.total_respostas),
      total_acertos: parseDbInt(taxaAcertoGeral.total_acertos),
      total_erros: parseDbInt(taxaAcertoGeral.total_erros),
      taxa_acerto_geral: parseDbNumber(taxaAcertoGeral.taxa_acerto_geral),
      taxa_erro_geral: parseDbNumber(taxaAcertoGeral.taxa_erro_geral)
    },
    niveis: niveisRows.map((row: any) => ({
      nivel: row.nivel,
      quantidade: parseDbInt(row.quantidade)
    })),
    mediasPorSerie: mediasPorSerieRows.map((row: any) => {
      const numeroSerie = row.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciais = numeroSerie === '2' || numeroSerie === '3' || numeroSerie === '5'
      const isAnosFinais = numeroSerie === '6' || numeroSerie === '7' || numeroSerie === '8' || numeroSerie === '9'

      return {
        serie: row.serie,
        total_alunos: parseDbInt(row.total_alunos),
        presentes: parseDbInt(row.presentes),
        media_geral: parseDbNumber(row.media_geral),
        media_lp: parseDbNumber(row.media_lp),
        media_mat: parseDbNumber(row.media_mat),
        media_ch: isAnosFinais ? (parseDbNumber(row.media_ch)) : null,
        media_cn: isAnosFinais ? (parseDbNumber(row.media_cn)) : null,
        media_prod: isAnosIniciais ? (parseDbNumber(row.media_prod)) : null
      }
    }),
    mediasPorPolo: mediasPorPoloRows.map((row: any) => ({
      polo_id: row.polo_id,
      polo: row.polo,
      total_alunos: parseDbInt(row.total_alunos),
      media_geral: parseDbNumber(row.media_geral),
      media_lp: parseDbNumber(row.media_lp),
      media_mat: parseDbNumber(row.media_mat),
      presentes: parseDbInt(row.presentes),
      faltantes: parseDbInt(row.faltantes)
    })),
    mediasPorEscola: mediasPorEscolaRows.map((row: any) => {
      const numeroSerieFiltro = filtros.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciaisFiltro = numeroSerieFiltro === '2' || numeroSerieFiltro === '3' || numeroSerieFiltro === '5'
      const isAnosFinaisFiltro = numeroSerieFiltro === '6' || numeroSerieFiltro === '7' || numeroSerieFiltro === '8' || numeroSerieFiltro === '9'

      return {
        escola_id: row.escola_id,
        escola: row.escola,
        polo: row.polo,
        total_turmas: parseDbInt(row.total_turmas),
        total_alunos: parseDbInt(row.total_alunos),
        media_geral: parseDbNumber(row.media_geral),
        media_lp: parseDbNumber(row.media_lp),
        media_mat: parseDbNumber(row.media_mat),
        media_ch: (!filtros.serie || isAnosFinaisFiltro) ? (parseDbNumber(row.media_ch)) : null,
        media_cn: (!filtros.serie || isAnosFinaisFiltro) ? (parseDbNumber(row.media_cn)) : null,
        media_prod: (!filtros.serie || isAnosIniciaisFiltro) ? (parseDbNumber(row.media_prod)) : null,
        presentes: parseDbInt(row.presentes),
        faltantes: parseDbInt(row.faltantes)
      }
    }),
    mediasPorTurma: mediasPorTurmaRows.map((row: any) => {
      const numeroSerieTurma = row.serie?.match(/(\d+)/)?.[1]
      const isAnosIniciaisTurma = numeroSerieTurma === '2' || numeroSerieTurma === '3' || numeroSerieTurma === '5'
      const isAnosFinaisTurma = numeroSerieTurma === '6' || numeroSerieTurma === '7' || numeroSerieTurma === '8' || numeroSerieTurma === '9'

      return {
        turma_id: row.turma_id,
        turma: row.turma,
        escola: row.escola,
        serie: row.serie,
        total_alunos: parseDbInt(row.total_alunos),
        media_geral: parseDbNumber(row.media_geral),
        media_lp: parseDbNumber(row.media_lp),
        media_mat: parseDbNumber(row.media_mat),
        media_ch: isAnosFinaisTurma ? (parseDbNumber(row.media_ch)) : null,
        media_cn: isAnosFinaisTurma ? (parseDbNumber(row.media_cn)) : null,
        media_prod: isAnosIniciaisTurma ? (parseDbNumber(row.media_prod)) : null,
        presentes: parseDbInt(row.presentes),
        faltantes: parseDbInt(row.faltantes)
      }
    }),
    faixasNota: faixasNotaRows.map((row: any) => ({
      faixa: row.faixa,
      quantidade: parseDbInt(row.quantidade)
    })),
    presenca: presencaRows.map((row: any) => ({
      status: row.status,
      quantidade: parseDbInt(row.quantidade)
    })),
    topAlunos: topAlunosRows,
    alunosDetalhados: alunosResult.alunos,
    paginacaoAlunos: {
      paginaAtual: paginacao.pagina,
      itensPorPagina: paginacao.limite,
      totalItens: alunosResult.total,
      totalPaginas: Math.ceil(alunosResult.total / paginacao.limite)
    },
    filtros: filtrosDisp,
    analiseAcertosErros: analise,
    resumosPorSerie: resumos
  }
}
