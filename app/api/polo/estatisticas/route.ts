import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['polo']) || !usuario.polo_id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const [escolas, resultados] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total FROM escolas WHERE polo_id = $1 AND ativo = true',
        [usuario.polo_id]
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM resultados_provas 
         WHERE escola_id IN (SELECT id FROM escolas WHERE polo_id = $1)`,
        [usuario.polo_id]
      ),
    ])

    return NextResponse.json({
      totalEscolas: parseInt(escolas.rows[0].total),
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

