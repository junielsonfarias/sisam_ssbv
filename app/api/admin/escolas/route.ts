import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('id')

    let query = `
      SELECT e.*, p.nome as polo_nome 
      FROM escolas e 
      LEFT JOIN polos p ON e.polo_id = p.id 
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
      query += ` AND e.id = $${paramIndex}`
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (poloId) {
      query += ` AND e.polo_id = $${paramIndex}`
      params.push(poloId)
      paramIndex++
    }

    if (escolaId) {
      query += ` AND e.id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    query += ' ORDER BY e.nome'

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar escolas:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { nome, codigo, polo_id, endereco, telefone, email } = await request.json()

    if (!nome || !polo_id) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatórios: nome, polo_id' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO escolas (nome, codigo, polo_id, endereco, telefone, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nome, codigo || null, polo_id, endereco || null, telefone || null, email || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

