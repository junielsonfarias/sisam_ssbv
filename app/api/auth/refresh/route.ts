/**
 * POST /api/auth/refresh
 *
 * V8 ideal — Refresh-token rotativo (31/05/2026).
 *
 * Fluxo principal:
 *   1. Le cookie refresh_token (path=/api/auth, httpOnly).
 *   2. Valida + detecta reuso (refresh-token.service).
 *   3. Rotaciona: revoga antigo, emite novo refresh + novo access.
 *   4. Seta ambos os cookies; cliente nem percebe.
 *
 * Fallback de transicao (durante migracao para o novo modelo):
 *   - Se nao houver refresh_token mas houver access token (mesmo expirado
 *     ate 24h), aceita uma unica vez e emite o par. Apos esse refresh, o
 *     usuario passa a usar o novo modelo. Esse fallback sera removido em
 *     ~30 dias.
 */
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import pool from '@/database/connection'
import { generateToken, verifyToken } from '@/lib/auth'
import {
  criarRefreshToken,
  validarERotacionar,
  REFRESH_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  REFRESH_COOKIE_PATH,
} from '@/lib/services/refresh-token.service'
import { SESSAO } from '@/lib/constants'
import { getClientIP } from '@/lib/rate-limiter'
import { createLogger } from '@/lib/logger'
import type { TokenPayload } from '@/lib/auth'
import type { TipoUsuario } from '@/lib/types'

const log = createLogger('AuthRefresh')
const JWT_SECRET = process.env.JWT_SECRET || ''
const GRACE_PERIOD_LEGADO_SEGUNDOS = 24 * 60 * 60

export const dynamic = 'force-dynamic'

function setCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https')
  response.cookies.set('token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSAO.COOKIE_MAX_AGE,
    path: '/',
  })
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE,
    path: REFRESH_COOKIE_PATH,
  })
}

export async function POST(request: NextRequest) {
  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || undefined

  // ---- Caminho principal: refresh-token rotativo ----
  if (refreshCookie) {
    const rotacao = await validarERotacionar(refreshCookie, ipAddress, userAgent)
    if (!rotacao) {
      // Reuso detectado ou token invalido. Limpar ambos os cookies.
      const response = NextResponse.json({ mensagem: 'Sessao expirou. Faca login novamente.' }, { status: 401 })
      response.cookies.delete('token')
      response.cookies.set(REFRESH_TOKEN_COOKIE, '', { maxAge: 0, path: REFRESH_COOKIE_PATH })
      return response
    }

    // Buscar dados do usuario para emitir novo access JWT
    const result = await pool.query(
      `SELECT id, email, tipo_usuario, polo_id, escola_id
         FROM usuarios
        WHERE id = $1 AND ativo = true
        LIMIT 1`,
      [rotacao.antigo.usuarioId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Conta indisponivel' }, { status: 401 })
    }
    const u = result.rows[0]
    const accessToken = generateToken({
      userId: String(u.id),
      email: String(u.email),
      tipoUsuario: String(u.tipo_usuario).toLowerCase() as TipoUsuario,
      poloId: u.polo_id ? String(u.polo_id) : null,
      escolaId: u.escola_id ? String(u.escola_id) : null,
    })

    const response = NextResponse.json({ sucesso: true })
    setCookies(response, accessToken, rotacao.novo.token)
    return response
  }

  // ---- Fallback legado (~30 dias de transicao) ----
  const accessTokenCookie = request.cookies.get('token')?.value
  if (!accessTokenCookie) {
    return NextResponse.json({ mensagem: 'Sem credenciais' }, { status: 401 })
  }

  let payload = verifyToken(accessTokenCookie)
  if (!payload) {
    try {
      const decoded = jwt.verify(accessTokenCookie, JWT_SECRET, { ignoreExpiration: true }) as TokenPayload
      const agora = Math.floor(Date.now() / 1000)
      const tempoExpirado = agora - (decoded.exp || 0)
      if (tempoExpirado > GRACE_PERIOD_LEGADO_SEGUNDOS) {
        return NextResponse.json({ mensagem: 'Sessao expirada. Faca login novamente.' }, { status: 401 })
      }
      payload = decoded
    } catch {
      return NextResponse.json({ mensagem: 'Token invalido' }, { status: 401 })
    }
  }

  // Emite par novo (acess + refresh) — migracao implicita
  const accessToken = generateToken({
    userId: payload.userId,
    email: payload.email,
    tipoUsuario: payload.tipoUsuario as TipoUsuario,
    poloId: payload.poloId || null,
    escolaId: payload.escolaId || null,
  })
  const refresh = await criarRefreshToken({
    usuarioId: payload.userId,
    ipAddress,
    userAgent,
  })

  log.info(`Migracao implicita para refresh-token rotativo | usuario:${payload.email}`)

  const response = NextResponse.json({ sucesso: true, migrado: true })
  setCookies(response, accessToken, refresh.token)
  return response
}
