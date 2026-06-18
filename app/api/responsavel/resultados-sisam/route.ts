import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/resultados-sisam?aluno_id=UUID
 *
 * Resultados da Avaliação Municipal (SISAM) do aluno — somente leitura,
 * validado pelo vínculo ativo em responsaveis_alunos.
 * Fonte: resultados_consolidados (1 linha por aluno x avaliação).
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const alunoId = new URL(request.url).searchParams.get('aluno_id')
    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id e obrigatorio' }, { status: 400 })
    }

    const vinculo = await pool.query(
      'SELECT 1 FROM responsaveis_alunos WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true LIMIT 1',
      [usuario.id, alunoId]
    )
    if (vinculo.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao vinculado a este responsavel' }, { status: 403 })
    }

    const result = await pool.query(
      `SELECT
         rc.ano_letivo, rc.serie, rc.presenca,
         rc.nota_lp, rc.nota_mat, rc.nota_ch, rc.nota_cn, rc.nota_producao,
         rc.media_aluno, rc.nivel_aprendizagem,
         rc.nivel_lp, rc.nivel_mat, rc.nivel_prod,
         av.nome AS avaliacao_nome, av.tipo AS avaliacao_tipo,
         e.nome AS escola_nome
       FROM resultados_consolidados rc
       LEFT JOIN avaliacoes av ON av.id = rc.avaliacao_id
       LEFT JOIN escolas e ON e.id = rc.escola_id
       WHERE rc.aluno_id = $1
       ORDER BY rc.ano_letivo DESC, av.ordem NULLS LAST, rc.serie`,
      [alunoId]
    )

    return NextResponse.json({ resultados: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao buscar resultados SISAM:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
