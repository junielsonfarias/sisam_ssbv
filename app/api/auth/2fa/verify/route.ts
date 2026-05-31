/**
 * POST /api/auth/2fa/verify
 *
 * Segundo passo do login para usuários com 2FA ativado.
 * Recebe: { preAuthToken, codigo }
 * Valida o token intermediário + código TOTP/backup.
 * Em caso de sucesso, gera JWT principal e seta cookie httpOnly.
 */

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { z } from 'zod'
import { generateToken, verifyPreAuthToken } from '@/lib/auth'
import { verificarCodigo2FA } from '@/lib/services/dois-fatores.service'
import { SESSAO } from '@/lib/constants'
import { createLogger } from '@/lib/logger'
import { getClientIP } from '@/lib/rate-limiter'
import { checkRateLimitAsync, resetRateLimitAsync, createRateLimitKeyPorUsuario } from '@/lib/rate-limiter-async'
import { cacheGet, cacheKey, cacheSet } from '@/lib/cache/redis'
import {
  criarRefreshToken,
  REFRESH_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_COOKIE_PATH,
} from '@/lib/services/refresh-token.service'

export const dynamic = 'force-dynamic'

const log = createLogger('Auth2FA')

const schema = z.object({
  preAuthToken: z.string().min(10),
  codigo: z.string().min(6).max(10),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    const { preAuthToken, codigo } = parsed.data

    // Verificar token intermediário (10min de validade)
    const preAuth = verifyPreAuthToken(preAuthToken)
    if (!preAuth) {
      return NextResponse.json(
        { mensagem: 'Sessão expirou. Faça login novamente.' },
        { status: 401 }
      )
    }

    // V9 (auditoria 31/05): anti-replay. Se o jti já foi marcado como usado,
    // rejeita. Marca após verify bem-sucedido (antes de gerar JWT principal).
    // Sem Redis configurado o cacheGet retorna null e o fluxo segue normal —
    // a proteção é "best-effort" mas crítica em produção (Vercel + Upstash).
    const jtiKey = cacheKey('2fa-used', preAuth.jti)
    const jaUsado = await cacheGet<boolean>(jtiKey)
    if (jaUsado) {
      log.warn(`Tentativa de replay 2FA | jti:${preAuth.jti.slice(0, 8)} | usuario:${preAuth.email}`)
      return NextResponse.json(
        { mensagem: 'Sessão já utilizada. Faça login novamente.' },
        { status: 401 }
      )
    }

    const clientIP = getClientIP(request)

    // Rate limit por usuário no passo 2FA (proteção contra brute-force do código)
    const rateKey = `2fa:${createRateLimitKeyPorUsuario(preAuth.email)}`
    const rate = await checkRateLimitAsync(rateKey, 5, 15 * 60 * 1000, 30 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json(
        { mensagem: 'Muitas tentativas. Tente novamente mais tarde.', bloqueado_ate: rate.blockedUntil },
        { status: 429 }
      )
    }

    // Validar código TOTP / backup
    const verif = await verificarCodigo2FA({
      usuarioId: preAuth.userId,
      codigo,
    })

    if (!verif.ok) {
      log.warn(`Código 2FA inválido | usuario:${preAuth.email}`)
      return NextResponse.json({ mensagem: 'Código inválido' }, { status: 401 })
    }

    // V9: marcar jti como usado ANTES de emitir o JWT principal.
    // TTL = 11min (cobre a janela de 10min do token + buffer de clock skew).
    // Se o cacheSet falhar silenciosamente (Redis off), o login continua —
    // proteção é "best-effort" mas é o padrão acordado.
    await cacheSet(jtiKey, true, 11 * 60)

    // Buscar dados completos do usuário para emitir JWT principal
    const result = await pool.query(
      `SELECT id, nome, email, tipo_usuario, polo_id, escola_id, ativo, acesso_sisam, acesso_gestor, acesso_semed, acesso_transparencia, acesso_admin
         FROM usuarios
        WHERE id = $1 AND ativo = true
        LIMIT 1`,
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

    // Resetar rate limit por usuário (login completo)
    await resetRateLimitAsync(rateKey)
    await resetRateLimitAsync(createRateLimitKeyPorUsuario(preAuth.email))

    log.info(`Login 2FA OK | usuario:${usuario.email} | backup=${verif.usouBackup} | IP:${maskIp(clientIP)}`)

    const response = NextResponse.json(
      {
        mensagem: 'Login realizado com sucesso',
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
        usouBackup: verif.usouBackup,
      },
      { status: 200 }
    )

    const isProd = process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https')
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: SESSAO.COOKIE_MAX_AGE,
      path: '/',
    })

    // V8 ideal: emite refresh-token rotativo
    const userAgent = request.headers.get('user-agent') || undefined
    const refresh = await criarRefreshToken({
      usuarioId: String(usuario.id),
      ipAddress: clientIP,
      userAgent,
    })
    response.cookies.set(REFRESH_TOKEN_COOKIE, refresh.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE,
      path: REFRESH_COOKIE_PATH,
    })

    return response
  } catch (error) {
    log.error('Erro inesperado em 2FA verify', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

function maskIp(ip: string): string {
  if (!ip) return 'unknown'
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/)
  return v4 ? `${v4[1]}.***` : ip.slice(0, 8) + '...'
}
