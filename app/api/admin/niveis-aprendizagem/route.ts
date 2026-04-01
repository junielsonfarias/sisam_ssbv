import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('NiveisAprendizagem')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/niveis-aprendizagem
 * Retorna os níveis de aprendizagem
 */
export const GET = withAuth(async (request, usuario) => {
  try {
    const result = await pool.query(`
      SELECT id, codigo, nome, descricao, cor, nota_minima, nota_maxima, ordem, serie_aplicavel, ativo
      FROM niveis_aprendizagem
      WHERE ativo = true
      ORDER BY ordem
    `)

    return NextResponse.json({
      niveis: result.rows,
      total: result.rows.length
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar níveis de aprendizagem', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
