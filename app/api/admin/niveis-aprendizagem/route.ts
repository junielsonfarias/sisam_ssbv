import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/niveis-aprendizagem
 * Retorna os níveis de aprendizagem
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

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
  } catch (error: any) {
    console.error('Erro ao buscar níveis de aprendizagem:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
