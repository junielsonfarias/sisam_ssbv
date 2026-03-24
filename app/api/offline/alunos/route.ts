import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { createWhereBuilder, addRawCondition, addAccessControl, buildConditionsString } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET - Obter alunos para sincronização offline
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
    addRawCondition(where, 'a.ativo = true AND e.ativo = true')
    addAccessControl(where, usuario, { escolaIdField: 'a.escola_id', poloIdField: 'e.polo_id' })

    const result = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.escola_id, a.turma_id,
              e.nome as escola_nome, e.polo_id, t.codigo as turma_codigo
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE ${buildConditionsString(where)}
       ORDER BY a.nome LIMIT 10000`,
      where.params
    )

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar alunos para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
