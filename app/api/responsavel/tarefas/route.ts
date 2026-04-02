import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/tarefas?aluno_id=UUID
 * Lista tarefas pendentes e recentes das turmas dos filhos
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    // Buscar turmas dos filhos
    let turmaQuery = `
      SELECT DISTINCT a.turma_id FROM alunos a
      INNER JOIN responsaveis_alunos ra ON ra.aluno_id = a.id
      WHERE ra.usuario_id = $1 AND ra.ativo = true AND a.ativo = true AND a.turma_id IS NOT NULL`
    const params: string[] = [usuario.id]

    if (alunoId) {
      params.push(alunoId)
      turmaQuery += ` AND a.id = $${params.length}`
    }

    const turmasResult = await pool.query(turmaQuery, params)
    const turmaIds = turmasResult.rows.map((r: any) => r.turma_id)

    if (turmaIds.length === 0) {
      return NextResponse.json({ tarefas: [] })
    }

    // Buscar tarefas das turmas (ultimos 60 dias)
    const result = await pool.query(
      `SELECT t.id, t.titulo, t.descricao, t.disciplina, t.data_entrega, t.tipo, t.criado_em,
              tu.codigo AS turma_codigo, tu.nome AS turma_nome, tu.serie,
              u.nome AS professor_nome
       FROM tarefas_turma t
       INNER JOIN turmas tu ON t.turma_id = tu.id
       INNER JOIN usuarios u ON t.professor_id = u.id
       WHERE t.turma_id = ANY($1) AND t.ativo = true
         AND t.data_entrega >= CURRENT_DATE - INTERVAL '60 days'
       ORDER BY t.data_entrega ASC
       LIMIT 50`,
      [turmaIds]
    )

    return NextResponse.json({ tarefas: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao buscar tarefas responsavel:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
