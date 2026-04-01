import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminAuditoria')

export const dynamic = 'force-dynamic'

// Schema de validação dos query params
const auditoriaQuerySchema = z.object({
  usuario_id: z.string().uuid('ID de usuário inválido').optional(),
  acao: z.string().max(50).optional(),
  entidade: z.string().max(50).optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data início inválida (YYYY-MM-DD)').optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data fim inválida (YYYY-MM-DD)').optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(50),
})

/**
 * GET /api/admin/auditoria
 * Lista logs de auditoria com filtros e paginação
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request) => {
  const { searchParams } = new URL(request.url)

  // Extrair e validar query params
  const rawParams: Record<string, string> = {}
  searchParams.forEach((value, key) => { rawParams[key] = value })
  const parsed = auditoriaQuerySchema.safeParse(rawParams)

  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Parâmetros inválidos', erros: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { usuario_id: usuarioId, acao, entidade, data_inicio: dataInicio, data_fim: dataFim, pagina: page, limite: limit } = parsed.data
  const offset = (page - 1) * limit

  try {
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
  } catch (error) {
    log.error('Erro ao buscar logs de auditoria', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
