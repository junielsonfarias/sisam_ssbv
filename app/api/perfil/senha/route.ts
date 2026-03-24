import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, hashPassword, comparePassword } from '@/lib/auth'
import pool from '@/database/connection'
import { validatePassword } from '@/lib/validation'
import { checkRateLimit, getClientIP, resetRateLimit } from '@/lib/rate-limiter'
import { validateRequest, perfilSenhaSchema } from '@/lib/schemas'

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

    const validacao = await validateRequest(request, perfilSenhaSchema)
    if (!validacao.success) return validacao.response
    const { senhaAtual, novaSenha } = validacao.data

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
  } catch (error: unknown) {
    console.error('Erro ao alterar senha:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
