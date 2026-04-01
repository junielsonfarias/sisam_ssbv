import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { getErrorMessage } from '@/lib/validation'
import {
  parseSearchParams, createWhereBuilder, addCondition, addRawCondition,
  addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminEvolucao')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/evolucao
 *
 * Compara resultados entre Avaliação Diagnóstica e Final do mesmo ano.
 * Retorna dados por aluno com notas de cada avaliação e delta de evolução.
 *
 * Params: ano_letivo (obrigatório), polo_id, escola_id, serie (opcionais)
 */
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const anoLetivo = searchParams.get('ano_letivo')

    if (!anoLetivo) {
      return NextResponse.json({ mensagem: 'ano_letivo é obrigatório' }, { status: 400 })
    }

    // Buscar as avaliações do ano
    const avaliacoesResult = await pool.query(
      `SELECT id, nome, tipo, ordem FROM avaliacoes WHERE ano_letivo = $1 AND ativo = true ORDER BY ordem`,
      [anoLetivo]
    )

    if (avaliacoesResult.rows.length < 2) {
      return NextResponse.json({
        mensagem: 'Este ano não possui duas avaliações para comparar',
        avaliacoes: avaliacoesResult.rows,
        alunos: [],
        resumo: null,
      })
    }

    const avDiagnostica = avaliacoesResult.rows.find((a: any) => a.tipo === 'diagnostica') || avaliacoesResult.rows[0]
    const avFinal = avaliacoesResult.rows.find((a: any) => a.tipo === 'final') || avaliacoesResult.rows[1]

    const { polo_id, escola_id, serie } = parseSearchParams(searchParams, ['polo_id', 'escola_id', 'serie'])

    // Buscar resultados comparativos com JOIN
    const where = createWhereBuilder()
    addCondition(where, 'rc_d.avaliacao_id', avDiagnostica.id)
    addCondition(where, 'rc_f.avaliacao_id', avFinal.id)
    addAccessControl(where, usuario, { escolaIdField: 'rc_d.escola_id', poloIdField: 'e.polo_id' })
    addCondition(where, 'e.polo_id', polo_id)
    addCondition(where, 'rc_d.escola_id', escola_id)

    if (serie) {
      const num = serie.match(/\d+/)?.[0]
      if (num) {
        addRawCondition(where, `COALESCE(rc_d.serie_numero, REGEXP_REPLACE(rc_d.serie::text, '[^0-9]', '', 'g')) = $${where.paramIndex}`, [num])
      }
    }

    const query = `
      SELECT
        a.id AS aluno_id,
        a.nome AS aluno_nome,
        e.nome AS escola_nome,
        p.nome AS polo_nome,
        rc_d.serie,
        -- Diagnóstica
        rc_d.nota_lp AS diag_nota_lp,
        rc_d.nota_mat AS diag_nota_mat,
        rc_d.nota_ch AS diag_nota_ch,
        rc_d.nota_cn AS diag_nota_cn,
        rc_d.nota_producao AS diag_nota_prod,
        rc_d.media_aluno AS diag_media,
        -- Final
        rc_f.nota_lp AS final_nota_lp,
        rc_f.nota_mat AS final_nota_mat,
        rc_f.nota_ch AS final_nota_ch,
        rc_f.nota_cn AS final_nota_cn,
        rc_f.nota_producao AS final_nota_prod,
        rc_f.media_aluno AS final_media,
        -- Deltas
        ROUND(COALESCE(CAST(rc_f.nota_lp AS DECIMAL), 0) - COALESCE(CAST(rc_d.nota_lp AS DECIMAL), 0), 2) AS delta_lp,
        ROUND(COALESCE(CAST(rc_f.nota_mat AS DECIMAL), 0) - COALESCE(CAST(rc_d.nota_mat AS DECIMAL), 0), 2) AS delta_mat,
        ROUND(COALESCE(CAST(rc_f.media_aluno AS DECIMAL), 0) - COALESCE(CAST(rc_d.media_aluno AS DECIMAL), 0), 2) AS delta_media
      FROM resultados_consolidados rc_d
      INNER JOIN resultados_consolidados rc_f ON rc_d.aluno_id = rc_f.aluno_id
      INNER JOIN alunos a ON rc_d.aluno_id = a.id
      INNER JOIN escolas e ON rc_d.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      WHERE ${buildConditionsString(where)}
      ORDER BY a.nome
      LIMIT 500
    `

    const result = await pool.query(query, where.params)

    // Calcular resumo
    const alunos = result.rows
    let melhoraram = 0
    let pioraram = 0
    let mantiveram = 0
    let somaEvolucao = 0

    for (const al of alunos) {
      const delta = parseFloat(al.delta_media) || 0
      if (delta > 0) melhoraram++
      else if (delta < 0) pioraram++
      else mantiveram++
      somaEvolucao += delta
    }

    return NextResponse.json({
      avaliacoes: {
        diagnostica: { id: avDiagnostica.id, nome: avDiagnostica.nome },
        final: { id: avFinal.id, nome: avFinal.nome },
      },
      alunos,
      resumo: {
        total_alunos: alunos.length,
        melhoraram,
        pioraram,
        mantiveram,
        pct_melhoraram: alunos.length > 0 ? Math.round((melhoraram / alunos.length) * 100) : 0,
        media_evolucao: alunos.length > 0 ? Math.round((somaEvolucao / alunos.length) * 100) / 100 : 0,
      },
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar evolução', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
