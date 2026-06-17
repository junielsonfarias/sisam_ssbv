/**
 * POST /api/auth/2fa/ativar-prelogin
 *
 * Confirma o primeiro código TOTP do setup obrigatório e, em caso de sucesso,
 * marca o 2FA como ativado E emite o JWT principal (login completo).
 */

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { z } from 'zod'
import { generateToken, verifyPreAuthToken } from '@/lib/auth'
import { ativar2FA } from '@/lib/services/dois-fatores.service'
import { SESSAO } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { checkRateLimitAsync, resetRateLimitAsync, createRateLimitKeyPorUsuario } from '@/lib/rate-limiter-async'

export const dynamic = 'force-dynamic'

const log = createLogger('Auth2FASetupPreLogin')

const schema = z.object({
  preAuthToken: z.string().min(10),
  codigo: z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    const preAuth = verifyPreAuthToken(parsed.data.preAuthToken)
    if (!preAuth) {
      return NextResponse.json({ mensagem: 'Sessão expirou. Faça login novamente.' }, { status: 401 })
    }

    // Rate limit POR USUÁRIO: protege o setup obrigatório pré-login contra
    // brute-force do código TOTP de 6 dígitos (mesmo padrão de /2fa/verify).
    // 5 tentativas em 15min → 30min de bloqueio.
    const rateKey = `2fa-setup:${createRateLimitKeyPorUsuario(preAuth.email)}`
    const rate = await checkRateLimitAsync(rateKey, 5, 15 * 60 * 1000, 30 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { mensagem: 'Muitas tentativas. Tente novamente mais tarde.', bloqueado_ate: rate.blockedUntil },
        { status: 429 }
      )
    }

    // Ativa 2FA validando o código
    const ativacao = await ativar2FA({ usuarioId: preAuth.userId, codigo: parsed.data.codigo })
    if (!ativacao.ok) {
      return NextResponse.json({ mensagem: ativacao.mensagem || 'Código inválido' }, { status: 400 })
    }

    // Código correto — zera o contador de tentativas.
    await resetRateLimitAsync(rateKey)

    // Busca dados do usuário para emitir JWT principal
    const result = await pool.query(
      `SELECT id, nome, email, tipo_usuario, polo_id, escola_id, acesso_sisam, acesso_gestor, acesso_semed, acesso_transparencia, acesso_admin
         FROM usuarios WHERE id = $1 AND ativo = true LIMIT 1`,
      [preAuth.userId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Conta indisponível' }, { status: 401 })
    }
    const usuario = result.rows[0]

    const token = generateToken({
      userId: String(usuario.id),
      email: String(usuario.email),
      tipoUsuario: String(usuario.tipo_usuario).toLowerCase() as any,
      poloId: usuario.polo_id ? String(usuario.polo_id) : null,
      escolaId: usuario.escola_id ? String(usuario.escola_id) : null,
    })

    log.info(`2FA ativado e login completo | usuario:${usuario.email}`)

    const response = NextResponse.json(
      {
        mensagem: '2FA ativado e login realizado',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
          polo_id: usuario.polo_id,
          escola_id: usuario.escola_id,
          acesso_sisam: usuario.acesso_sisam !== false,
          acesso_gestor: usuario.acesso_gestor === true,
          acesso_semed: usuario.acesso_semed === true,
          acesso_transparencia: usuario.acesso_transparencia === true,
          acesso_admin: usuario.acesso_admin === true,
        },
      },
      { status: 200 }
    )

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https'),
      sameSite: 'lax',
      maxAge: SESSAO.COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    log.error('Erro inesperado', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
