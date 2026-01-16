import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao, hashPassword } from '@/lib/auth'
import pool from '@/database/connection'
import { usuarioSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'

// Schema para criação de usuário (senha obrigatória)
const criarUsuarioSchema = usuarioSchema.extend({
  senha: z.string().min(12, 'Senha deve ter pelo menos 12 caracteres'),
})

// Schema para atualização de usuário (senha opcional)
const atualizarUsuarioSchema = usuarioSchema.extend({
  id: z.string().uuid('ID do usuário inválido'),
  senha: z.string().min(12, 'Senha deve ter pelo menos 12 caracteres').optional().nullable(),
})

export const dynamic = 'force-dynamic';

// GET - Listar usuários
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
      `SELECT id, nome, email, tipo_usuario, polo_id, escola_id, ativo, criado_em
       FROM usuarios
       ORDER BY nome`
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
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

    // Validar dados de entrada com Zod
    const validacao = await validateRequest(request, criarUsuarioSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { nome, email, senha, tipo_usuario, polo_id, escola_id } = validacao.data

    const senhaHash = await hashPassword(senha)

    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario, polo_id, escola_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, tipo_usuario, ativo, criado_em`,
      [nome, email, senhaHash, tipo_usuario, polo_id || null, escola_id || null]
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

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Validar dados de entrada com Zod
    const validacao = await validateRequest(request, atualizarUsuarioSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { id, nome, email, senha, tipo_usuario, polo_id, escola_id, ativo } = validacao.data

    // Verificar se o usuário existe
    const usuarioExistente = await pool.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    )

    if (usuarioExistente.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Se senha foi fornecida, atualizar com hash
    if (senha && senha.trim() !== '') {
      const senhaHash = await hashPassword(senha)
      await pool.query(
        `UPDATE usuarios
         SET nome = $1, email = $2, senha = $3, tipo_usuario = $4, polo_id = $5, escola_id = $6, ativo = $7, atualizado_em = NOW()
         WHERE id = $8`,
        [nome, email, senhaHash, tipo_usuario, polo_id || null, escola_id || null, ativo !== false, id]
      )
    } else {
      // Atualizar sem mudar a senha
      await pool.query(
        `UPDATE usuarios
         SET nome = $1, email = $2, tipo_usuario = $3, polo_id = $4, escola_id = $5, ativo = $6, atualizado_em = NOW()
         WHERE id = $7`,
        [nome, email, tipo_usuario, polo_id || null, escola_id || null, ativo !== false, id]
      )
    }

    // Retornar usuário atualizado
    const result = await pool.query(
      `SELECT id, nome, email, tipo_usuario, polo_id, escola_id, ativo, criado_em
       FROM usuarios WHERE id = $1`,
      [id]
    )

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Email já cadastrado para outro usuário' },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir ou desativar usuário
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')
    const hardDelete = searchParams.get('hard') === 'true'

    // Validar ID com schema Zod
    const validacaoId = validateId(idParam)
    if (!validacaoId.success) {
      return validacaoId.response
    }
    const id = validacaoId.data

    // Verificar se o usuário existe
    const usuarioExistente = await pool.query(
      'SELECT id, email FROM usuarios WHERE id = $1',
      [id]
    )

    if (usuarioExistente.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Não permitir excluir o próprio usuário
    if (usuarioExistente.rows[0].id === usuario.id) {
      return NextResponse.json(
        { mensagem: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      )
    }

    if (hardDelete) {
      // Exclusão permanente
      await pool.query('DELETE FROM usuarios WHERE id = $1', [id])
      return NextResponse.json({ mensagem: 'Usuário excluído permanentemente' })
    } else {
      // Apenas desativar (soft delete)
      await pool.query(
        'UPDATE usuarios SET ativo = false, atualizado_em = NOW() WHERE id = $1',
        [id]
      )
      return NextResponse.json({ mensagem: 'Usuário desativado com sucesso' })
    }
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

