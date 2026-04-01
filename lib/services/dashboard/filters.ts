/**
 * Filtros do Dashboard
 *
 * Construção de WHERE clauses e busca de filtros disponíveis.
 *
 * @module services/dashboard/filters
 */

import pool from '@/database/connection'
import { safeQuery, getMediaGeralMixedRoundedSQL } from '@/lib/api-helpers'
import { QueryParamValue } from '@/lib/types'
import { Usuario } from '@/lib/types'
import {
  DashboardFiltros,
  DashboardFilterResult,
  FiltrosDisponiveis,
  PoloFiltroDbRow,
  EscolaFiltroDbRow,
  SerieFiltroDbRow,
  TurmaFiltroDbRow,
  AnoLetivoFiltroDbRow,
  NivelFiltroDbRow,
  DISCIPLINA_MAP
} from './types'

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
  const params: QueryParamValue[] = []
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
      whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${paramIndex}`)
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
      whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('2', '3', '5')`)
    } else if (tipoEnsino === 'anos_finais') {
      whereConditions.push(`COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) IN ('6', '7', '8', '9')`)
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
        const mediaCalculada = getMediaGeralMixedRoundedSQL('rc', 'rc_table', 'rc')
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
    const mediaCalculadaTaxa = getMediaGeralMixedRoundedSQL('rc', 'rc_table', 'rc')
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
  const filtrosParams: QueryParamValue[] = []
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
  const rpParams: QueryParamValue[] = []
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
      rpWhereConditions.push(`COALESCE(rp.serie_numero, REGEXP_REPLACE(rp.serie::text, '[^0-9]', '', 'g')) = $${rpParamIndex}`)
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
  const rpParamsSemSerie: QueryParamValue[] = []
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
