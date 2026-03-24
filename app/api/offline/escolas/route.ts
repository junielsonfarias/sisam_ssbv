import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createWhereBuilder, addRawCondition, addAccessControl, buildConditionsString } from '@/lib/api-helpers'

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

    const where = createWhereBuilder()
    addRawCondition(where, 'e.ativo = true')
    addAccessControl(where, usuario, { escolaIdField: 'e.id', poloIdField: 'e.polo_id' })

    const result = await pool.query(
      `SELECT e.id, e.nome, e.codigo, e.polo_id, p.nome as polo_nome
       FROM escolas e
       LEFT JOIN polos p ON e.polo_id = p.id
       WHERE ${buildConditionsString(where)}
       ORDER BY e.nome`,
      where.params
    )

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar escolas para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
