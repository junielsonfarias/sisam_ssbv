/**
 * Helpers de filtros e agrupamento para comparativos.
 *
 * @module services/comparativos/filtros
 */

import {
  createWhereBuilder,
  addCondition,
  WhereClauseResult,
} from '@/lib/api-helpers'
import { NUMERO_SERIE_SQL } from './sql'
import type { FiltrosComparativos, UsuarioAcesso } from './types'

/**
 * Constrói filtros WHERE comuns para comparativos.
 * Usado por: comparativos e comparativos-polos.
 */
export function construirFiltrosComparativos(
  filtros: FiltrosComparativos,
  startIndex: number = 1
): WhereClauseResult {
  const where = createWhereBuilder(startIndex)

  if (filtros.anoLetivo && filtros.anoLetivo.trim() !== '') {
    addCondition(where, 'rc.ano_letivo', filtros.anoLetivo.trim())
  }
  addCondition(where, 'rc.avaliacao_id', filtros.avaliacaoId)
  addCondition(where, 'rc.serie', filtros.serie)

  if (filtros.escolaId && filtros.escolaId !== '' && filtros.escolaId !== 'undefined' && filtros.escolaId.toLowerCase() !== 'todas') {
    addCondition(where, 'e.id', filtros.escolaId)
  }
  if (filtros.turmaId && filtros.turmaId !== '' && filtros.turmaId !== 'undefined') {
    addCondition(where, 'rc.turma_id', filtros.turmaId)
  }

  return where
}

/**
 * Adiciona condições de acesso baseadas no tipo de usuário.
 * Polo vê apenas suas escolas, escola vê apenas seus dados.
 */
export function aplicarRestricaoAcesso(
  where: WhereClauseResult,
  usuario: UsuarioAcesso
): void {
  if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
    addCondition(where, 'e.polo_id', usuario.polo_id)
  } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    addCondition(where, 'e.id', usuario.escola_id)
  }
}

/**
 * Gera SQL de filtro por tipo de ensino (anos iniciais/finais).
 * Retorna string para concatenar ao WHERE ou string vazia.
 */
export function getFiltroTipoEnsinoSQL(tipoEnsino?: string | null): string {
  if (tipoEnsino === 'anos_iniciais') {
    return ` AND ${NUMERO_SERIE_SQL} IN ('2', '3', '5')`
  } else if (tipoEnsino === 'anos_finais') {
    return ` AND ${NUMERO_SERIE_SQL} IN ('6', '7', '8', '9')`
  }
  return ''
}

/**
 * Agrupa rows de resultado por série.
 * Retorna Record<string, rows[]> onde a chave é o valor de row.serie.
 */
export function agruparPorSerie(rows: any[]): Record<string, any[]> {
  const agrupado: Record<string, any[]> = {}
  rows.forEach((row) => {
    const serieKey = row.serie || 'Sem série'
    if (!agrupado[serieKey]) {
      agrupado[serieKey] = []
    }
    agrupado[serieKey].push(row)
  })
  return agrupado
}

/**
 * Encontra o melhor aluno (maior valor) de um array para um campo.
 */
export function encontrarMelhor(alunos: any[], campo: string): any {
  return alunos.reduce((prev, curr) => {
    const prevVal = parseFloat(prev[campo]) || 0
    const currVal = parseFloat(curr[campo]) || 0
    return currVal > prevVal ? curr : prev
  })
}
