import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/estatisticas-serie
 * Retorna estatísticas agregadas por série, incluindo produção textual e nível de aprendizagem
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')

    // Query base para estatísticas por série
    let baseQuery = `
      SELECT
        REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') as numero_serie,
        rc.serie as nome_serie,
        COUNT(DISTINCT rc.aluno_id) as total_alunos,
        COUNT(DISTINCT rc.escola_id) as total_escolas,
        COUNT(DISTINCT rc.turma_id) as total_turmas,

        -- Presença
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' THEN 1 END) as presentes,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'F' THEN 1 END) as faltas,

        -- Médias por disciplina (apenas presentes)
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_lp IS NOT NULL THEN rc.nota_lp END)::numeric, 2) as media_lp,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_mat IS NOT NULL THEN rc.nota_mat END)::numeric, 2) as media_mat,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_ch IS NOT NULL THEN rc.nota_ch END)::numeric, 2) as media_ch,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_cn IS NOT NULL THEN rc.nota_cn END)::numeric, 2) as media_cn,
        ROUND(AVG(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nota_producao IS NOT NULL THEN rc.nota_producao END)::numeric, 2) as media_producao,
        -- Média geral com divisor fixo: Anos Iniciais (2,3,5) = 3 disciplinas, Anos Finais (6,7,8,9) = 4 disciplinas
        ROUND(AVG(CASE
          WHEN UPPER(rc.presenca) = 'P' THEN
            CASE
              WHEN REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g') IN ('2', '3', '5') THEN
                (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_producao, 0)) / 3.0
              ELSE
                (COALESCE(rc.nota_lp, 0) + COALESCE(rc.nota_ch, 0) + COALESCE(rc.nota_mat, 0) + COALESCE(rc.nota_cn, 0)) / 4.0
            END
          ELSE NULL
        END)::numeric, 2) as media_geral,

        -- Distribuição por nível de aprendizagem
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nivel_aprendizagem ILIKE '%insuficiente%' THEN 1 END) as qtd_insuficiente,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND (rc.nivel_aprendizagem ILIKE '%básico%' OR rc.nivel_aprendizagem ILIKE '%basico%') THEN 1 END) as qtd_basico,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND rc.nivel_aprendizagem ILIKE '%adequado%' THEN 1 END) as qtd_adequado,
        COUNT(CASE WHEN UPPER(rc.presenca) = 'P' AND (rc.nivel_aprendizagem ILIKE '%avançado%' OR rc.nivel_aprendizagem ILIKE '%avancado%') THEN 1 END) as qtd_avancado,

        -- Configuração da série
        cs.tem_producao_textual,
        cs.qtd_itens_producao,
        cs.avalia_ch,
        cs.avalia_cn,
        cs.usa_nivel_aprendizagem,
        cs.total_questoes_objetivas

      FROM resultados_consolidados rc
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN configuracao_series cs ON cs.serie = REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')
      WHERE rc.serie IS NOT NULL
    `

    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      baseQuery += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      baseQuery += ` AND rc.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (escolaId) {
      baseQuery += ` AND rc.escola_id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    if (poloId) {
      baseQuery += ` AND e.polo_id = $${paramIndex}`
      params.push(poloId)
      paramIndex++
    }

    if (anoLetivo) {
      baseQuery += ` AND rc.ano_letivo = $${paramIndex}`
      params.push(anoLetivo)
      paramIndex++
    }

    if (serie) {
      baseQuery += ` AND rc.serie = $${paramIndex}`
      params.push(serie)
      paramIndex++
    }

    baseQuery += `
      GROUP BY
        REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g'),
        rc.serie,
        cs.tem_producao_textual,
        cs.qtd_itens_producao,
        cs.avalia_ch,
        cs.avalia_cn,
        cs.usa_nivel_aprendizagem,
        cs.total_questoes_objetivas
      ORDER BY REGEXP_REPLACE(rc.serie, '[^0-9]', '', 'g')::integer
    `

    const result = await pool.query(baseQuery, params)

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
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas por série:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
