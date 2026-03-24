import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createWhereBuilder, addRawCondition, addCondition, buildConditionsString } from '@/lib/api-helpers'

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

    const where = createWhereBuilder()
    addRawCondition(where, 'ativo = true')

    // Polo e escola veem apenas seu polo
    if ((usuario.tipo_usuario === 'polo' || usuario.tipo_usuario === 'escola') && usuario.polo_id) {
      addCondition(where, 'id', usuario.polo_id)
    }

    const result = await pool.query(
      `SELECT id, nome, codigo FROM polos
       WHERE ${buildConditionsString(where)}
       ORDER BY nome`,
      where.params
    )

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar polos para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
