import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const [escolas, polos, resultados] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM escolas WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM polos WHERE ativo = true'),
      pool.query('SELECT COUNT(*) as total FROM resultados_provas'),
    ])

    return NextResponse.json({
      totalEscolas: parseInt(escolas.rows[0].total),
      totalPolos: parseInt(polos.rows[0].total),
      totalResultados: parseInt(resultados.rows[0].total),
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

