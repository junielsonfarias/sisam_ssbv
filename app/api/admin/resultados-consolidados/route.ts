import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const poloId = searchParams.get('polo_id')
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const presenca = searchParams.get('presenca')
    const turmaId = searchParams.get('turma_id')

    let query = `
      SELECT 
        rc.*,
        rc.aluno_id,
        a.nome as aluno_nome,
        e.nome as escola_nome,
        t.codigo as turma_codigo
      FROM resultados_consolidados_unificada rc
      INNER JOIN alunos a ON rc.aluno_id = a.id
      INNER JOIN escolas e ON rc.escola_id = e.id
      LEFT JOIN turmas t ON rc.turma_id = t.id
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND rc.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndex})`
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND rc.escola_id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (escolaId) {
      query += ` AND rc.escola_id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    if (poloId) {
      query += ` AND rc.escola_id IN (SELECT id FROM escolas WHERE polo_id = $${paramIndex})`
      params.push(poloId)
      paramIndex++
    }

    if (anoLetivo) {
      query += ` AND rc.ano_letivo = $${paramIndex}`
      params.push(anoLetivo)
      paramIndex++
    }

    if (serie) {
      query += ` AND rc.serie = $${paramIndex}`
      params.push(serie)
      paramIndex++
    }

    if (presenca) {
      query += ` AND UPPER(rc.presenca) = UPPER($${paramIndex})`
      params.push(presenca)
      paramIndex++
    }

    if (turmaId) {
      query += ` AND rc.turma_id = $${paramIndex}`
      params.push(turmaId)
      paramIndex++
    }

    query += ' ORDER BY rc.media_aluno DESC NULLS LAST, a.nome'

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar resultados consolidados:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

