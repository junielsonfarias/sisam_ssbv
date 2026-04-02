import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/filhos
 * Retorna todos os filhos/alunos vinculados ao responsavel logado
 */
export const GET = withAuth(['responsavel'], async (_request, usuario) => {
  try {
    const result = await pool.query(
      `SELECT
        a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao,
        a.data_nascimento, a.pcd, a.turma_id, a.escola_id,
        e.nome AS escola_nome,
        t.codigo AS turma_codigo, t.nome AS turma_nome,
        ra.tipo_vinculo
      FROM alunos a
      INNER JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE ra.usuario_id = $1 AND ra.ativo = true AND a.ativo = true
      ORDER BY a.nome`,
      [usuario.id]
    )

    return NextResponse.json({ filhos: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao buscar filhos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
