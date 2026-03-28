import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['aberto', 'em_analise', 'respondido', 'encerrado']).optional(),
  resposta: z.string().max(5000).nullable().optional(),
})

/**
 * GET /api/admin/ouvidoria?tipo=X&status=Y&page=1&limit=20
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const status = searchParams.get('status')
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: (string | number)[] = []
  let paramIndex = 1

  if (tipo) {
    conditions.push(`o.tipo = $${paramIndex++}`)
    params.push(tipo)
  }
  if (status) {
    conditions.push(`o.status = $${paramIndex++}`)
    params.push(status)
  }
  if (dataInicio) {
    conditions.push(`o.criado_em >= $${paramIndex++}`)
    params.push(dataInicio)
  }
  if (dataFim) {
    conditions.push(`o.criado_em <= $${paramIndex++}::date + interval '1 day'`)
    params.push(dataFim)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM ouvidoria o ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count, 10)

  const result = await pool.query(
    `SELECT o.*, e.nome as escola_nome, u.nome as respondido_por_nome
     FROM ouvidoria o
     LEFT JOIN escolas e ON o.escola_id = e.id
     LEFT JOIN usuarios u ON o.respondido_por = u.id
     ${whereClause}
     ORDER BY o.criado_em DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  )

  // KPIs
  const kpis = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'aberto') as total_aberto,
       COUNT(*) FILTER (WHERE status = 'em_analise') as total_em_analise,
       COUNT(*) FILTER (WHERE status = 'respondido') as total_respondido,
       COUNT(*) FILTER (WHERE status = 'encerrado') as total_encerrado,
       COUNT(*) as total
     FROM ouvidoria`
  )

  return NextResponse.json({
    manifestacoes: result.rows,
    kpis: kpis.rows[0],
    total,
    totalPaginas: Math.ceil(total / limit),
    pagina: page,
  })
})

/**
 * PUT /api/admin/ouvidoria — atualizar status/resposta
 */
export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', detalhes: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { id, status, resposta } = parsed.data
  const sets: string[] = ['atualizado_em = NOW()']
  const params: (string | null)[] = []
  let paramIndex = 1

  if (status) {
    sets.push(`status = $${paramIndex++}`)
    params.push(status)
  }
  if (resposta !== undefined) {
    sets.push(`resposta = $${paramIndex++}`)
    params.push(resposta)
    sets.push(`respondido_por = $${paramIndex++}`)
    params.push(usuario.id)
    sets.push(`respondido_em = NOW()`)
  }

  params.push(id)

  await pool.query(
    `UPDATE ouvidoria SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    params
  )

  return NextResponse.json({ sucesso: true })
})
