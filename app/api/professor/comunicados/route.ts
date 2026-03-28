import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { z } from 'zod'
import { cacheDelPattern } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const comunicadoSchema = z.object({
  turma_id: z.string().uuid(),
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  mensagem: z.string().min(1, 'Mensagem é obrigatória').max(5000),
  tipo: z.enum(['aviso', 'lembrete', 'urgente', 'reuniao']).default('aviso'),
})

/**
 * GET /api/professor/comunicados?turma_id=X
 */
export const GET = withAuth(['professor', 'administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
  }

  if (usuario.tipo_usuario === 'professor') {
    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }
  }

  const result = await pool.query(`
    SELECT c.*, t.nome AS turma_nome, u.nome AS professor_nome
    FROM comunicados_turma c
    JOIN turmas t ON t.id = c.turma_id
    JOIN usuarios u ON u.id = c.professor_id
    WHERE c.turma_id = $1
    ORDER BY c.data_publicacao DESC
  `, [turmaId])

  return NextResponse.json({ comunicados: result.rows })
})

/**
 * POST /api/professor/comunicados
 */
export const POST = withAuth('professor', async (request, usuario) => {
  const body = await request.json()
  const validacao = comunicadoSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { turma_id, titulo, mensagem, tipo } = validacao.data

  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const result = await pool.query(`
    INSERT INTO comunicados_turma (turma_id, professor_id, titulo, mensagem, tipo)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [turma_id, usuario.id, titulo, mensagem, tipo])

  await cacheDelPattern('comunicados:*')
  return NextResponse.json({ comunicado: result.rows[0], mensagem: 'Comunicado publicado com sucesso' })
})

/**
 * DELETE /api/professor/comunicados?id=X (soft delete)
 */
export const DELETE = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ mensagem: 'id é obrigatório' }, { status: 400 })
  }

  const result = await pool.query(
    'UPDATE comunicados_turma SET ativo = false WHERE id = $1 AND professor_id = $2 RETURNING id',
    [id, usuario.id]
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Comunicado não encontrado' }, { status: 404 })
  }

  await cacheDelPattern('comunicados:*')
  return NextResponse.json({ mensagem: 'Comunicado removido com sucesso' })
})
