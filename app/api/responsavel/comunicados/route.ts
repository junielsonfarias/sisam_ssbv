import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/comunicados?aluno_id=UUID
 * Retorna comunicados das turmas dos filhos do responsavel
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    // Buscar turmas dos filhos vinculados
    let turmaIds: string[] = []

    if (alunoId) {
      // Verificar vinculo
      const vinculoResult = await pool.query(
        `SELECT a.turma_id FROM alunos a
         INNER JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
         WHERE ra.usuario_id = $1 AND a.id = $2 AND ra.ativo = true`,
        [usuario.id, alunoId]
      )
      turmaIds = vinculoResult.rows.map((r: any) => r.turma_id).filter(Boolean)
    } else {
      // Todas as turmas dos filhos
      const filhosResult = await pool.query(
        `SELECT DISTINCT a.turma_id FROM alunos a
         INNER JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
         WHERE ra.usuario_id = $1 AND ra.ativo = true AND a.ativo = true AND a.turma_id IS NOT NULL`,
        [usuario.id]
      )
      turmaIds = filhosResult.rows.map((r: any) => r.turma_id)
    }

    if (turmaIds.length === 0) {
      return NextResponse.json({ comunicados: [] })
    }

    // Buscar comunicados das turmas (tabela correta: comunicados_turma, coluna: mensagem)
    const result = await pool.query(
      `SELECT c.id, c.titulo, c.mensagem AS conteudo, c.tipo, c.criado_em,
              u.nome AS professor_nome,
              t.codigo AS turma_codigo, t.nome AS turma_nome
       FROM comunicados_turma c
       INNER JOIN usuarios u ON c.professor_id = u.id
       LEFT JOIN turmas t ON c.turma_id = t.id
       WHERE c.turma_id = ANY($1) AND c.ativo = true
       ORDER BY c.criado_em DESC
       LIMIT 50`,
      [turmaIds]
    )

    return NextResponse.json({ comunicados: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao buscar comunicados:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
