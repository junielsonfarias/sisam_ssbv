import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

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

    let query = `
      SELECT
        a.id,
        a.nome,
        a.codigo,
        a.escola_id,
        a.turma_id,
        e.nome as escola_nome,
        e.polo_id,
        t.codigo as turma_codigo
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND a.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    query += ' ORDER BY a.nome LIMIT 10000' // Limitar para não sobrecarregar

    const result = await pool.query(query, params)

    return NextResponse.json({
      dados: result.rows,
      total: result.rows.length,
      sincronizado_em: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erro ao buscar alunos para offline:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
