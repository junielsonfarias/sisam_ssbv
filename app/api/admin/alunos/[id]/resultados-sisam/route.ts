import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request: NextRequest, usuario) => {
  try {
    const url = new URL(request.url)
    const segments = url.pathname.split('/')
    const alunoId = segments[segments.indexOf('alunos') + 1]

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'ID do aluno é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT
        rc.ano_letivo,
        rc.serie,
        rc.nota_lp,
        rc.nota_mat,
        rc.nota_ch,
        rc.nota_cn,
        rc.nota_producao,
        rc.media_aluno,
        rc.presenca,
        rc.nivel_aprendizagem,
        e.nome as escola_nome
      FROM resultados_consolidados rc
      LEFT JOIN escolas e ON rc.escola_id = e.id
      WHERE rc.aluno_id = $1
      ORDER BY rc.ano_letivo DESC, rc.serie`,
      [alunoId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('[resultados-sisam] Erro:', (error as Error).message)
    return NextResponse.json({ mensagem: 'Erro ao buscar resultados SISAM' }, { status: 500 })
  }
})
