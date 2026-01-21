import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, comparePassword } from '@/lib/auth'
import pool from '@/database/connection'
import { isValidEmail } from '@/lib/validation'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

// Constantes de rate limiting para alteração de email
const EMAIL_CHANGE_MAX_ATTEMPTS = 3
const EMAIL_CHANGE_WINDOW_MS = 60 * 60 * 1000 // 1 hora

// PUT - Alterar email do usuário
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Rate limiting: 3 tentativas por hora por usuário
    const rateLimitKey = `email-change:${usuario.id}`
    const rateLimit = checkRateLimit(rateLimitKey, EMAIL_CHANGE_MAX_ATTEMPTS, EMAIL_CHANGE_WINDOW_MS)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { mensagem: rateLimit.message || 'Muitas tentativas de alteração de email. Tente novamente mais tarde.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { novoEmail, senhaAtual } = body

    // Validações
    if (!novoEmail || !senhaAtual) {
      return NextResponse.json(
        { mensagem: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato do email usando validação RFC 5322
    if (!isValidEmail(novoEmail.trim())) {
      return NextResponse.json(
        { mensagem: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Buscar senha atual do banco
    const result = await pool.query(
      'SELECT senha, email FROM usuarios WHERE id = $1',
      [usuario.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    const senhaHash = result.rows[0].senha
    const emailAtual = result.rows[0].email

    // Verificar se o novo email é igual ao atual
    if (novoEmail.trim().toLowerCase() === emailAtual.toLowerCase()) {
      return NextResponse.json(
        { mensagem: 'O novo email deve ser diferente do atual' },
        { status: 400 }
      )
    }

    // Verificar senha atual
    const senhaValida = await comparePassword(senhaAtual, senhaHash)

    if (!senhaValida) {
      return NextResponse.json(
        { mensagem: 'Senha incorreta' },
        { status: 400 }
      )
    }

    // Verificar se o novo email já está em uso por outro usuário
    const emailExistente = await pool.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1) AND id != $2',
      [novoEmail.trim(), usuario.id]
    )

    if (emailExistente.rows.length > 0) {
      return NextResponse.json(
        { mensagem: 'Este email já está em uso por outro usuário' },
        { status: 400 }
      )
    }

    // Atualizar email
    await pool.query(
      `UPDATE usuarios
       SET email = $1, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [novoEmail.trim(), usuario.id]
    )

    // Reset do rate limit após sucesso
    resetRateLimit(rateLimitKey)

    return NextResponse.json({
      mensagem: 'Email alterado com sucesso',
      email: novoEmail.trim()
    })
  } catch (error: any) {
    console.error('Erro ao alterar email:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
