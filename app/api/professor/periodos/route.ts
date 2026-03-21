import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/periodos?ano_letivo=2026
 * Lista períodos letivos ativos
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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
  } catch (error: any) {
    console.error('Erro ao listar períodos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
