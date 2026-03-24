import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createWhereBuilder, addRawCondition, addAccessControl, buildConditionsString } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET - Obter turmas para sincronização offline
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
    addRawCondition(where, 't.ativo = true AND e.ativo = true')
    addAccessControl(where, usuario, { escolaIdField: 't.escola_id', poloIdField: 'e.polo_id' })

    const result = await pool.query(
      `SELECT t.id, t.codigo, t.escola_id, t.serie, t.ano_letivo,
              e.nome as escola_nome, e.polo_id
       FROM turmas t
       INNER JOIN escolas e ON t.escola_id = e.id
       WHERE ${buildConditionsString(where)}
       ORDER BY t.codigo`,
      where.params
    )

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar turmas para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
