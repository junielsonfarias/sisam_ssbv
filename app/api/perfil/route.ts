import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { validateRequest, perfilUpdateSchema } from '@/lib/schemas'

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
        u.telefone,
        u.polo_id,
        u.escola_id,
        u.foto_url,
        u.criado_em,
        p.nome as polo_nome,
        e.nome as escola_nome,
        COALESCE(e.gestor_escolar_habilitado, false) as gestor_escolar_habilitado
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
      telefone: perfil.telefone,
      polo_id: perfil.polo_id,
      escola_id: perfil.escola_id,
      foto_url: perfil.foto_url,
      polo_nome: perfil.polo_nome,
      escola_nome: perfil.escola_nome,
      gestor_escolar_habilitado: perfil.gestor_escolar_habilitado,
      criado_em: perfil.criado_em
    })
  } catch (error: unknown) {
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

    const validacao = await validateRequest(request, perfilUpdateSchema)
    if (!validacao.success) return validacao.response
    const { nome, telefone } = validacao.data

    // nome é opcional no schema: garantir que veio como string não-vazia
    // antes de qualquer operação (.trim()), evitando TypeError → 500.
    if (typeof nome !== 'string' || nome.trim().length === 0) {
      return NextResponse.json(
        { mensagem: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (nome.trim().length < 3) {
      return NextResponse.json(
        { mensagem: 'Nome deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    // Atualizar nome e telefone. COALESCE preserva o telefone atual quando o
    // campo não é enviado (undefined → null), evitando sobrescrita acidental.
    const telefoneParam =
      telefone === undefined ? null : (telefone?.trim() || null)

    const result = await pool.query(
      `UPDATE usuarios
       SET nome = $1,
           telefone = COALESCE($2, telefone),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING nome, telefone`,
      [nome.trim(), telefoneParam, usuario.id]
    )

    const atualizado = result.rows[0]

    return NextResponse.json({
      mensagem: 'Perfil atualizado com sucesso',
      nome: atualizado?.nome ?? nome.trim(),
      telefone: atualizado?.telefone ?? null
    })
  } catch (error: unknown) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
