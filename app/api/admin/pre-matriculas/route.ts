import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pendente', 'em_analise', 'aprovada', 'rejeitada']),
  motivo_rejeicao: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
})

/**
 * GET /api/admin/pre-matriculas — Lista com filtros, KPIs, paginação
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const escola_id = searchParams.get('escola_id')
  const serie = searchParams.get('serie')
  const ano = searchParams.get('ano') || String(new Date().getFullYear())
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
  const offset = (page - 1) * limit

  // KPIs
  const kpisResult = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
       COUNT(*) FILTER (WHERE status = 'em_analise') AS em_analise,
       COUNT(*) FILTER (WHERE status = 'aprovada') AS aprovadas,
       COUNT(*) FILTER (WHERE status = 'rejeitada') AS rejeitadas,
       COUNT(*) AS total
     FROM pre_matriculas
     WHERE ano_letivo = $1`,
    [ano]
  )

  // Construir query filtrada
  const conditions: string[] = ['pm.ano_letivo = $1']
  const params: any[] = [ano]
  let paramIndex = 2

  if (status) {
    conditions.push(`pm.status = $${paramIndex}`)
    params.push(status)
    paramIndex++
  }
  if (escola_id) {
    conditions.push(`pm.escola_pretendida_id = $${paramIndex}`)
    params.push(escola_id)
    paramIndex++
  }
  if (serie) {
    conditions.push(`pm.serie_pretendida = $${paramIndex}`)
    params.push(serie)
    paramIndex++
  }

  // Escola vê somente as suas pré-matrículas
  const usuario = (request as any).usuario
  if (usuario?.tipo_usuario === 'escola' && usuario?.escola_id) {
    conditions.push(`pm.escola_pretendida_id = $${paramIndex}`)
    params.push(usuario.escola_id)
    paramIndex++
  }

  const where = conditions.join(' AND ')

  // Total filtrado
  const countRes = await pool.query(
    `SELECT COUNT(*) FROM pre_matriculas pm WHERE ${where}`,
    params
  )
  const total = parseInt(countRes.rows[0].count)

  // Dados paginados
  const dataRes = await pool.query(
    `SELECT pm.*, e.nome AS escola_nome, u.nome AS analisado_por_nome
     FROM pre_matriculas pm
     LEFT JOIN escolas e ON e.id = pm.escola_pretendida_id
     LEFT JOIN usuarios u ON u.id = pm.analisado_por
     WHERE ${where}
     ORDER BY pm.criado_em DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  )

  return NextResponse.json({
    kpis: kpisResult.rows[0],
    dados: dataRes.rows,
    paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

/**
 * PUT /api/admin/pre-matriculas — Atualizar status
 */
export const PUT = withAuth(['administrador', 'tecnico', 'escola'], async (request) => {
  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: parsed.error.errors[0].message }, { status: 400 })
    }

    const { id, status, motivo_rejeicao, observacoes } = parsed.data
    const usuario = (request as any).usuario

    if (status === 'rejeitada' && !motivo_rejeicao) {
      return NextResponse.json({ mensagem: 'Informe o motivo da rejeição.' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE pre_matriculas
       SET status = $1, motivo_rejeicao = $2, observacoes = $3,
           analisado_por = $4, analisado_em = NOW(), atualizado_em = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, motivo_rejeicao || null, observacoes || null, usuario?.id, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Pré-matrícula não encontrada.' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Status atualizado com sucesso.', dados: result.rows[0] })
  } catch (error: any) {
    console.error('[ADMIN PRE-MATRICULAS PUT]', error.message)
    return NextResponse.json({ mensagem: 'Erro ao atualizar.' }, { status: 500 })
  }
})
