import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['escola']) || !usuario.escola_id) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const [resultados, acertos] = await Promise.all([
      pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1',
        [usuario.escola_id]
      ),
      pool.query(
        'SELECT COUNT(*) as total FROM resultados_provas WHERE escola_id = $1 AND acertou = true',
        [usuario.escola_id]
      ),
    ])

    const totalResultados = parseInt(resultados.rows[0].total)
    const totalAcertos = parseInt(acertos.rows[0].total)
    const taxaAcertos = totalResultados > 0 ? (totalAcertos / totalResultados) * 100 : 0

    return NextResponse.json({
      totalResultados,
      taxaAcertos,
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

