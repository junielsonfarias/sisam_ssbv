/**
 * Orquestração das consultas de resultados consolidados.
 *
 * Executa em paralelo: contagem, listagem paginada e estatísticas gerais,
 * reutilizando o mesmo builder de filtros/controle de acesso.
 *
 * @module services/resultados-consolidados/consultas
 */

import pool from '@/database/connection'
import { buildPaginacaoResponse } from '@/lib/api-helpers'
import { buildResultadosWhere, getPresencaFiltroSQL } from './filtros'
import { SELECT_RESULTADOS, SELECT_COUNT, SELECT_ESTATISTICAS } from './sql'
import type {
  FiltrosResultados,
  Paginacao,
  ResultadoConsolidadoResponse,
  UsuarioAcessoResultados,
} from './types'

/**
 * Busca resultados consolidados paginados + estatísticas.
 *
 * Usado por: app/api/admin/resultados-consolidados/route.ts
 */
export async function buscarResultadosConsolidados(
  usuario: UsuarioAcessoResultados,
  filtros: FiltrosResultados,
  paginacao: Paginacao
): Promise<ResultadoConsolidadoResponse> {
  const presencaSQL = getPresencaFiltroSQL(filtros.presenca)

  // Query principal (listagem paginada)
  const whereMain = buildResultadosWhere(usuario, filtros, 1)
  const mainParamIndex = 1 + whereMain.params.length
  const query =
    SELECT_RESULTADOS +
    presencaSQL +
    whereMain.sql +
    ` ORDER BY media_aluno DESC NULLS LAST, a.nome` +
    ` LIMIT $${mainParamIndex} OFFSET $${mainParamIndex + 1}`
  const params = [...whereMain.params, paginacao.limite, paginacao.offset]

  // Query de contagem
  const whereCount = buildResultadosWhere(usuario, filtros, 1)
  const countQuery = SELECT_COUNT + presencaSQL + whereCount.sql

  // Query de estatísticas
  const whereStats = buildResultadosWhere(usuario, filtros, 1)
  const estatisticasQuery = SELECT_ESTATISTICAS + presencaSQL + whereStats.sql

  const [countResult, dataResult, estatisticasResult] = await Promise.all([
    pool.query(countQuery, whereCount.params),
    pool.query(query, params),
    pool.query(estatisticasQuery, whereStats.params),
  ])

  const total = parseInt(countResult.rows[0]?.total || '0')

  const stats = estatisticasResult.rows[0] || {}
  const estatisticas = {
    totalAlunos: parseInt(stats.total_alunos || '0'),
    totalPresentes: parseInt(stats.total_presentes || '0'),
    totalFaltas: parseInt(stats.total_faltas || '0'),
    mediaGeral: parseFloat(stats.media_geral || '0') || 0,
    mediaLP: parseFloat(stats.media_lp || '0') || 0,
    mediaCH: parseFloat(stats.media_ch || '0') || 0,
    mediaMAT: parseFloat(stats.media_mat || '0') || 0,
    mediaCN: parseFloat(stats.media_cn || '0') || 0,
    mediaProducao: parseFloat(stats.media_producao || '0') || 0,
    mediaAnosIniciais: parseFloat(stats.media_anos_iniciais || '0') || 0,
    totalAnosIniciais: parseInt(stats.total_anos_iniciais || '0'),
    mediaAnosFinais: parseFloat(stats.media_anos_finais || '0') || 0,
    totalAnosFinais: parseInt(stats.total_anos_finais || '0'),
  }

  return {
    resultados: dataResult.rows,
    estatisticas,
    paginacao: buildPaginacaoResponse(paginacao, total),
  }
}
