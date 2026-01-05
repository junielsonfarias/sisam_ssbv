import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Obter polos para sincronização offline
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    let query = 'SELECT id, nome, codigo FROM polos WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.polo_id) {
      query += ` AND id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    }

    query += ' ORDER BY nome'

    const result = await pool.query(query, params)

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar polos para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
