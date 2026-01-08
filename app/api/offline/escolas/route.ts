import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Obter escolas para sincronização offline
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    let query = `
      SELECT
        e.id,
        e.nome,
        e.codigo,
        e.polo_id,
        p.nome as polo_nome
      FROM escolas e
      LEFT JOIN polos p ON e.polo_id = p.id
      WHERE e.ativo = true
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND e.id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    query += ' ORDER BY e.nome'

    const result = await pool.query(query, params)

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar escolas para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
