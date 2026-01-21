import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, hashPassword, comparePassword } from '@/lib/auth'
import pool from '@/database/connection'
import { validatePassword } from '@/lib/validation'
import { checkRateLimit, getClientIP, resetRateLimit } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

// Constantes de rate limiting para alteração de senha
const PASSWORD_CHANGE_MAX_ATTEMPTS = 5
const PASSWORD_CHANGE_WINDOW_MS = 60 * 60 * 1000 // 1 hora

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

    // Rate limiting: 5 tentativas por hora por usuário
    const rateLimitKey = `password-change:${usuario.id}`
    const rateLimit = checkRateLimit(rateLimitKey, PASSWORD_CHANGE_MAX_ATTEMPTS, PASSWORD_CHANGE_WINDOW_MS)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { mensagem: rateLimit.message || 'Muitas tentativas de alteração de senha. Tente novamente mais tarde.' },
        { status: 429 }
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

    // Validar força da senha (mínimo 12 caracteres, pelo menos letra e número)
    const senhaValidacao = validatePassword(novaSenha)
    if (!senhaValidacao.valid) {
      return NextResponse.json(
        { mensagem: senhaValidacao.message },
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

    // Reset do rate limit após sucesso
    resetRateLimit(rateLimitKey)

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
