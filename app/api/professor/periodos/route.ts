import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/periodos?ano_letivo=2026
 * Lista períodos letivos ativos
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    const result = await pool.query(
      `SELECT id, nome, tipo, numero, ano_letivo, data_inicio, data_fim
       FROM periodos_letivos
       WHERE ano_letivo = $1 AND ativo = true
       ORDER BY numero`,
      [anoLetivo]
    )

    return NextResponse.json({ periodos: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao listar períodos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
