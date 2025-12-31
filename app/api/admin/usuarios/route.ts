import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao, hashPassword } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const result = await pool.query(
      'SELECT id, nome, email, tipo_usuario, ativo, criado_em FROM usuarios ORDER BY nome'
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { nome, email, senha, tipo_usuario, polo_id, escola_id } = await request.json()

    if (!nome || !email || !senha || !tipo_usuario) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatórios: nome, email, senha, tipo_usuario' },
        { status: 400 }
      )
    }

    const senhaHash = await hashPassword(senha)

    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario, polo_id, escola_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, tipo_usuario, ativo, criado_em`,
      [nome, email.toLowerCase(), senhaHash, tipo_usuario, polo_id || null, escola_id || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Email já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

