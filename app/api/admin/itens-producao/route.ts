import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('ItensProducao')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/itens-producao
 * Retorna os itens de produção textual
 */
export const GET = withAuth(async (request, usuario) => {
  try {
    const result = await pool.query(`
      SELECT id, codigo, nome, descricao, ordem, nota_maxima, serie_aplicavel, ativo
      FROM itens_producao
      WHERE ativo = true
      ORDER BY ordem
    `)

    return NextResponse.json({
      itens: result.rows,
      total: result.rows.length
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar itens de produção', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
