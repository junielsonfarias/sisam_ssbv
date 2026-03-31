import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { cacheDelPattern } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const eventoSchema = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().max(5000).nullable().optional(),
  tipo: z.enum(['reuniao', 'formatura', 'jogos', 'capacitacao', 'geral']).default('geral'),
  data_inicio: z.string().min(1),
  data_fim: z.string().nullable().optional(),
  local: z.string().max(255).nullable().optional(),
  publico: z.boolean().default(true),
})

const eventoUpdateSchema = eventoSchema.partial().extend({
  id: z.string().uuid(),
})

/**
 * GET /api/admin/eventos — listar todos os eventos (incluindo privados)
 */
export const GET = withAuth(['administrador', 'tecnico', 'editor', 'publicador'], async (request) => {
  const { searchParams } = new URL(request.url)
  const ano = searchParams.get('ano') || String(new Date().getFullYear())

  const result = await pool.query(
    `SELECT e.*, u.nome as criado_por_nome
     FROM eventos e
     LEFT JOIN usuarios u ON e.criado_por = u.id
     WHERE EXTRACT(YEAR FROM e.data_inicio) = $1
     ORDER BY e.data_inicio DESC`,
    [ano]
  )

  return NextResponse.json({ eventos: result.rows })
})

/**
 * POST /api/admin/eventos — criar evento
 */
export const POST = withAuth(['administrador', 'tecnico', 'editor', 'publicador'], async (request, usuario) => {
  const body = await request.json()
  const parsed = eventoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  const { titulo, descricao, tipo, data_inicio, data_fim, local, publico } = parsed.data

  const result = await pool.query(
    `INSERT INTO eventos (titulo, descricao, tipo, data_inicio, data_fim, local, publico, criado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [titulo, descricao || null, tipo, data_inicio, data_fim || null, local || null, publico, usuario.id]
  )

  await cacheDelPattern('eventos:*')
  return NextResponse.json(result.rows[0], { status: 201 })
})

/**
 * PUT /api/admin/eventos — atualizar evento
 */
export const PUT = withAuth(['administrador', 'tecnico', 'editor', 'publicador'], async (request) => {
  const body = await request.json()
  const parsed = eventoUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  const { id, ...fields } = parsed.data
  const sets: string[] = ['atualizado_em = NOW()']
  const params: (string | boolean | null)[] = []
  let paramIndex = 1

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = $${paramIndex++}`)
      params.push(value as string | boolean | null)
    }
  }

  params.push(id)

  const result = await pool.query(
    `UPDATE eventos SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Evento não encontrado' }, { status: 404 })
  }

  await cacheDelPattern('eventos:*')
  return NextResponse.json(result.rows[0])
})

/**
 * DELETE /api/admin/eventos — excluir evento
 */
export const DELETE = withAuth(['administrador', 'tecnico'], async (request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
  }

  await pool.query('UPDATE eventos SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1', [id])

  await cacheDelPattern('eventos:*')
  return NextResponse.json({ sucesso: true })
})
