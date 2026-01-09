import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

// Desabilitar cache para garantir dados sempre atualizados
export const dynamic = 'force-dynamic';
export const revalidate = 0;
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
    const id = searchParams.get('id')

    // Se usuário é polo ou escola, só pode ver seu próprio polo
    if (usuario.tipo_usuario === 'polo' || usuario.tipo_usuario === 'escola') {
      const poloIdPermitido = usuario.polo_id
      if (id && id !== poloIdPermitido) {
        return NextResponse.json(
          { mensagem: 'Não autorizado a acessar este polo' },
          { status: 403 }
        )
      }
      // Retornar apenas o polo do usuário
      const result = await pool.query(
        'SELECT * FROM polos WHERE id = $1',
        [poloIdPermitido]
      )
      return NextResponse.json(result.rows)
    }

    // Admin e tecnico podem ver todos os polos
    let query = 'SELECT * FROM polos'
    const params: (string | number | boolean | null | undefined)[] = []

    if (id) {
      query += ' WHERE id = $1'
      params.push(id)
    }

    query += ' ORDER BY nome'

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar polos:', error)
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

    const { nome, codigo, descricao } = await request.json()

    if (!nome) {
      return NextResponse.json(
        { mensagem: 'Campo obrigatório: nome' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO polos (nome, codigo, descricao)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nome, codigo || null, descricao || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar polo:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

