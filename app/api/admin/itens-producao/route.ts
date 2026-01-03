import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/itens-producao
 * Retorna os itens de produção textual
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
      SELECT id, codigo, nome, descricao, ordem, nota_maxima, serie_aplicavel, ativo
      FROM itens_producao
      WHERE ativo = true
      ORDER BY ordem
    `)

    return NextResponse.json({
      itens: result.rows,
      total: result.rows.length
    })
  } catch (error: any) {
    console.error('Erro ao buscar itens de produção:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
