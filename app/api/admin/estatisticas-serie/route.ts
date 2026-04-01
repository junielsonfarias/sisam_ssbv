import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import {
  parseSearchParams, createWhereBuilder, addCondition, addRawCondition,
  addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('EstatisticasSerie')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/estatisticas-serie
 * Retorna estatísticas agregadas por série, incluindo produção textual e nível de aprendizagem
 */
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { escola_id, polo_id, ano_letivo, serie, avaliacao_id } = parseSearchParams(
      searchParams, ['escola_id', 'polo_id', 'ano_letivo', 'serie', 'avaliacao_id']
    )

    const where = createWhereBuilder()
    addRawCondition(where, 'rc.serie IS NOT NULL')
    addAccessControl(where, usuario, { escolaIdField: 'rc.escola_id', poloIdField: 'e.polo_id' })
    addCondition(where, 'rc.escola_id', escola_id)
    addCondition(where, 'e.polo_id', polo_id)
    addCondition(where, 'rc.ano_letivo', ano_letivo)
    addCondition(where, 'rc.avaliacao_id', avaliacao_id)

    if (serie) {
      const numSerie = serie.match(/(\d+)/)?.[1] || serie
      addRawCondition(where, `COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g')) = $${where.paramIndex}`, [numSerie])
    }

    const result = await pool.query(
      `SELECT
        COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')) as numero_serie,
        rc.serie as nome_serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT rc.escola_id) as total_escolas,
        COUNT(DISTINCT rc.turma_id) as total_turmas,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' THEN 1 END) as presentes,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'F' THEN 1 END) as faltas,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_lp IS NOT NULL THEN rc.nota_lp END)::numeric, 2) as media_lp,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_mat IS NOT NULL THEN rc.nota_mat END)::numeric, 2) as media_mat,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_ch IS NOT NULL THEN rc.nota_ch END)::numeric, 2) as media_ch,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_cn IS NOT NULL THEN rc.nota_cn END)::numeric, 2) as media_cn,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_producao IS NOT NULL THEN rc.nota_producao END)::numeric, 2) as media_producao,
        ROUND(AVG(CASE
          WHEN UPPER(rc.presenca) = 'P' THEN
            CASE
              WHEN COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')) IN ('2', '3', '5') THEN
                (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_producao, 0)) / 3.0
              ELSE
                (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_ch, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_cn, 0)) / 4.0
            END
          ELSE NULL
        END)::numeric, 2) as media_geral,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nivel_aprendizagem ILIKE '%insuficiente%' THEN 1 END) as qtd_insuficiente,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND (rc.nivel_aprendizagem ILIKE '%básico%' OR rc.nivel_aprendizagem ILIKE '%basico%') THEN 1 END) as qtd_basico,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nivel_aprendizagem ILIKE '%adequado%' THEN 1 END) as qtd_adequado,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND (rc.nivel_aprendizagem ILIKE '%avançado%' OR rc.nivel_aprendizagem ILIKE '%avancado%') THEN 1 END) as qtd_avancado,
        cs.tem_producao_textual, cs.qtd_itens_producao, cs.avalia_ch, cs.avalia_cn,
        cs.usa_nivel_aprendizagem, cs.total_questoes_objetivas
      FROM resultados_consolidados rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN configuracao_series cs ON cs.serie = COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'))
      WHERE ${buildConditionsString(where)}
      GROUP BY
        COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')), rc.serie,
        cs.tem_producao_textual, cs.qtd_itens_producao, cs.avalia_ch, cs.avalia_cn,
        cs.usa_nivel_aprendizagem, cs.total_questoes_objetivas
      ORDER BY COALESCE(rc.serie_numero, REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'))::integer`,
      where.params
    )

    // Processar resultados para adicionar informações extras
    const estatisticas = result.rows.map((row: any) => ({
      ...row,
      // Determinar tipo de avaliação
      tipo_avaliacao: row.tem_producao_textual ? 'anos_iniciais' : 'anos_finais',
      // Calcular percentuais de nível de aprendizagem
      percentual_insuficiente: row.presentes > 0 ? Math.round((row.qtd_insuficiente / row.presentes) * 100) : 0,
      percentual_basico: row.presentes > 0 ? Math.round((row.qtd_basico / row.presentes) * 100) : 0,
      percentual_adequado: row.presentes > 0 ? Math.round((row.qtd_adequado / row.presentes) * 100) : 0,
      percentual_avancado: row.presentes > 0 ? Math.round((row.qtd_avancado / row.presentes) * 100) : 0,
      // Calcular taxa de presença
      taxa_presenca: row.total_alunos > 0 ? Math.round((row.presentes / row.total_alunos) * 100) : 0,
    }))

    return NextResponse.json({
      estatisticas,
      total_series: estatisticas.length
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar estatísticas por série', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
