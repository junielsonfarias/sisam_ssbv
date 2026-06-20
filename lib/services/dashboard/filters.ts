/**
 * Filtros do Dashboard
 *
 * Construção de WHERE clauses para o dashboard.
 *
 * @module services/dashboard/filters
 */

import { getMediaGeralMixedRoundedSQL } from '@/lib/api-helpers'
import { QueryParamValue } from '@/lib/types'
import { Usuario } from '@/lib/types'
import {
  DashboardFiltros,
  DashboardFilterResult,
  DISCIPLINA_MAP
} from './types'
import { buildRpFilters } from './filters/rp-filters'

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
    taxaAcertoMin, taxaAcertoMax
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

  // ========== CONDIÇÕES PARA resultados_provas (extraídas em helper) ==========
  const {
    rpWhereClauseComPresenca,
    rpParams,
    rpWhereClauseSemSerie,
    rpParamsSemSerie
  } = buildRpFilters(usuario, filtros)

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
