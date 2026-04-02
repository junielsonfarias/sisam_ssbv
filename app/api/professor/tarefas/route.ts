import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const criarTarefaSchema = z.object({
  turma_id: z.string().uuid(),
  titulo: z.string().min(3).max(255),
  descricao: z.string().max(2000).optional(),
  disciplina: z.string().max(100).optional(),
  data_entrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(['atividade', 'trabalho', 'prova', 'pesquisa', 'leitura']).default('atividade'),
})

/**
 * GET /api/professor/tarefas?turma_id=UUID
 * Lista tarefas do professor (todas ou por turma)
 */
export const GET = withAuth(['professor'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')

    let query = `
      SELECT t.*, tu.codigo AS turma_codigo, tu.nome AS turma_nome, tu.serie
      FROM tarefas_turma t
      INNER JOIN turmas tu ON t.turma_id = tu.id
      WHERE t.professor_id = $1 AND t.ativo = true`
    const params: string[] = [usuario.id]

    if (turmaId) {
      params.push(turmaId)
      query += ` AND t.turma_id = $${params.length}`
    }

    query += ` ORDER BY t.data_entrega DESC LIMIT 100`

    const result = await pool.query(query, params)
    return NextResponse.json({ tarefas: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao buscar tarefas:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

/**
 * POST /api/professor/tarefas
 * Criar nova tarefa
 */
export const POST = withAuth(['professor'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = criarTarefaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos', erros: parsed.error.errors }, { status: 400 })
    }

    const { turma_id, titulo, descricao, disciplina, data_entrega, tipo } = parsed.data

    const result = await pool.query(
      `INSERT INTO tarefas_turma (turma_id, professor_id, titulo, descricao, disciplina, data_entrega, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [turma_id, usuario.id, titulo, descricao || null, disciplina || null, data_entrega, tipo]
    )

    // Push notification para pais (fire-and-forget)
    import('@/lib/services/push.service').then(({ notificarComunicadoTurma }) => {
      notificarComunicadoTurma(turma_id, `Nova tarefa: ${titulo}`, 'Professor')
    }).catch(() => {})

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar tarefa:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

/**
 * DELETE /api/professor/tarefas?id=UUID
 * Soft-delete tarefa
 */
export const DELETE = withAuth(['professor'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ mensagem: 'id obrigatorio' }, { status: 400 })

    await pool.query(
      'UPDATE tarefas_turma SET ativo = false WHERE id = $1 AND professor_id = $2',
      [id, usuario.id]
    )

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Erro ao deletar tarefa:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
