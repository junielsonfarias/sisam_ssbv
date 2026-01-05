import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, hashPassword, comparePassword } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// PUT - Alterar senha do usuário
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
    const { senhaAtual, novaSenha, confirmarSenha } = body

    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return NextResponse.json(
        { mensagem: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (novaSenha.length < 6) {
      return NextResponse.json(
        { mensagem: 'A nova senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    if (novaSenha !== confirmarSenha) {
      return NextResponse.json(
        { mensagem: 'A nova senha e a confirmação não coincidem' },
        { status: 400 }
      )
    }

    // Buscar senha atual do banco
    const result = await pool.query(
      'SELECT senha FROM usuarios WHERE id = $1',
      [usuario.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const senhaHash = result.rows[0].senha

    // Verificar senha atual
    const senhaValida = await comparePassword(senhaAtual, senhaHash)

    if (!senhaValida) {
      return NextResponse.json(
        { mensagem: 'Senha atual incorreta' },
        { status: 400 }
      )
    }

    // Hash da nova senha
    const novaSenhaHash = await hashPassword(novaSenha)

    // Atualizar senha
    await pool.query(
      `UPDATE usuarios
       SET senha = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [novaSenhaHash, usuario.id]
    )

    return NextResponse.json({
      mensagem: 'Senha alterada com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao alterar senha:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
