import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const result = await pool.query(
      `SELECT * FROM anos_letivos WHERE status = 'ativo' LIMIT 1`
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ ano_ativo: null, mensagem: 'Nenhum ano letivo ativo' })
    }

    return NextResponse.json({ ano_ativo: result.rows[0] })
  } catch (error: unknown) {
    console.error('Erro ao buscar ano letivo ativo:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
