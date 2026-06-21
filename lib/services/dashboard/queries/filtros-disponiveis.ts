/**
 * Queries do Dashboard: opções para filtros dropdown
 *
 * @module services/dashboard/queries/filtros-disponiveis
 */

import pool from '@/database/connection'
import { safeQuery } from '@/lib/api-helpers'
import type {
  DashboardFilterResult,
  FiltrosDisponiveis,
  PoloFiltroDbRow,
  EscolaFiltroDbRow,
  SerieFiltroDbRow,
  TurmaFiltroDbRow,
  AnoLetivoFiltroDbRow,
  NivelFiltroDbRow,
} from '../types'

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
