import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/auditoria
 * Lista logs de auditoria com filtros e paginação
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request) => {
  const { searchParams } = new URL(request.url)
  const usuarioId = searchParams.get('usuario_id')
  const acao = searchParams.get('acao')
  const entidade = searchParams.get('entidade')
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (usuarioId) {
    conditions.push(`la.usuario_id = $${paramIndex++}`)
    params.push(usuarioId)
  }
  if (acao) {
    conditions.push(`la.acao = $${paramIndex++}`)
    params.push(acao)
  }
  if (entidade) {
    conditions.push(`la.entidade = $${paramIndex++}`)
    params.push(entidade)
  }
  if (dataInicio) {
    conditions.push(`la.criado_em >= $${paramIndex++}::timestamp`)
    params.push(dataInicio)
  }
  if (dataFim) {
    conditions.push(`la.criado_em <= $${paramIndex++}::timestamp + interval '1 day'`)
    params.push(dataFim)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Total
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM logs_auditoria la ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count, 10)

  // Dados com JOIN para pegar nome do usuário
  const result = await pool.query(
    `SELECT la.id, la.usuario_id, la.usuario_email, la.acao, la.entidade, la.entidade_id,
            la.detalhes, la.ip, la.criado_em,
            u.nome as usuario_nome
     FROM logs_auditoria la
     LEFT JOIN usuarios u ON la.usuario_id = u.id
     ${whereClause}
     ORDER BY la.criado_em DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  )

  // Lista de usuários para filtro
  const usuariosResult = await pool.query(
    `SELECT DISTINCT la.usuario_id, la.usuario_email, u.nome as usuario_nome
     FROM logs_auditoria la
     LEFT JOIN usuarios u ON la.usuario_id = u.id
     WHERE la.usuario_id IS NOT NULL
     ORDER BY u.nome
     LIMIT 200`
  )

  return NextResponse.json({
    logs: result.rows,
    usuarios: usuariosResult.rows,
    total,
    pagina: page,
    totalPaginas: Math.ceil(total / limit),
  })
})
