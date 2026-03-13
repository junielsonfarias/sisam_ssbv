import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { getErrorMessage } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/evolucao
 *
 * Compara resultados entre Avaliação Diagnóstica e Final do mesmo ano.
 * Retorna dados por aluno com notas de cada avaliação e delta de evolução.
 *
 * Params: ano_letivo (obrigatório), polo_id, escola_id, serie (opcionais)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo')
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('escola_id')
    const serie = searchParams.get('serie')

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

    // Buscar resultados comparativos com JOIN
    let conditions: string[] = ['rc_d.avaliacao_id = $1', 'rc_f.avaliacao_id = $2']
    const params: any[] = [avDiagnostica.id, avFinal.id]
    let paramIndex = 3

    // Restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      conditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      conditions.push(`rc_d.escola_id = $${paramIndex}`)
      params.push(usuario.escola_id)
      paramIndex++
    }

    if (poloId) {
      conditions.push(`e.polo_id = $${paramIndex}`)
      params.push(poloId)
      paramIndex++
    }
    if (escolaId) {
      conditions.push(`rc_d.escola_id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }
    if (serie) {
      const num = serie.match(/\d+/)?.[0]
      if (num) {
        conditions.push(`REGEXP_REPLACE(rc_d.serie::text, '[^0-9]', '', 'g') = $${paramIndex}`)
        params.push(num)
        paramIndex++
      }
    }

    const whereClause = conditions.join(' AND ')

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
      WHERE ${whereClause}
      ORDER BY a.nome
      LIMIT 500
    `

    const result = await pool.query(query, params)

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
    console.error('Erro ao buscar evolução:', getErrorMessage(error))
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
