/**
 * Filtros do Dashboard — construção de WHERE para resultados_provas (rp)
 *
 * Extrai os blocos de WHERE específicos da tabela resultados_provas
 * (com presença/série e sem série) usados por buildDashboardFilters.
 *
 * @module services/dashboard/filters/rp-filters
 */

import { QueryParamValue } from '@/lib/types'
import { Usuario } from '@/lib/types'
import { DashboardFiltros } from '../types'

export interface RpFiltersResult {
  rpWhereClauseComPresenca: string
  rpParams: QueryParamValue[]
  rpWhereClauseSemSerie: string
  rpParamsSemSerie: QueryParamValue[]
}

/**
 * Constrói as cláusulas WHERE para resultados_provas a partir do usuário e filtros.
 * Mantém exatamente a lógica original de buildDashboardFilters.
 */
export function buildRpFilters(
  usuario: Usuario,
  filtros: DashboardFiltros
): RpFiltersResult {
  const {
    poloId, escolaId, anoLetivo, serie, turmaId,
    presenca, disciplina, questaoCodigo
  } = filtros

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
    rpWhereClauseComPresenca,
    rpParams,
    rpWhereClauseSemSerie,
    rpParamsSemSerie
  }
}
