import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Obter dados do perfil do usuário logado
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Buscar dados completos do usuário incluindo polo e escola
    const result = await pool.query(
      `SELECT
        u.id,
        u.nome,
        u.email,
        u.tipo_usuario,
        u.polo_id,
        u.escola_id,
        u.foto_url,
        u.criado_em,
        p.nome as polo_nome,
        e.nome as escola_nome
      FROM usuarios u
      LEFT JOIN polos p ON u.polo_id = p.id
      LEFT JOIN escolas e ON u.escola_id = e.id
      WHERE u.id = $1`,
      [usuario.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const perfil = result.rows[0]

    return NextResponse.json({
      id: perfil.id,
      nome: perfil.nome,
      email: perfil.email,
      tipo_usuario: perfil.tipo_usuario,
      polo_id: perfil.polo_id,
      escola_id: perfil.escola_id,
      foto_url: perfil.foto_url,
      polo_nome: perfil.polo_nome,
      escola_nome: perfil.escola_nome,
      criado_em: perfil.criado_em
    })
  } catch (error: any) {
    console.error('Erro ao buscar perfil:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar nome do usuário
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { nome } = body

    if (!nome || nome.trim().length < 3) {
      return NextResponse.json(
        { mensagem: 'Nome deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    // Atualizar nome
    await pool.query(
      `UPDATE usuarios
       SET nome = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [nome.trim(), usuario.id]
    )

    return NextResponse.json({
      mensagem: 'Nome atualizado com sucesso',
      nome: nome.trim()
    })
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
