import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { generateToken, verifyToken } from '@/lib/auth'
import { SESSAO } from '@/lib/constants'
import type { TokenPayload } from '@/lib/auth'
import type { TipoUsuario } from '@/lib/types'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || ''

/** Limite máximo para aceitar tokens expirados (24 horas em segundos) */
const MAX_EXPIRACAO_ACEITA = 24 * 60 * 60

/**
 * POST /api/auth/refresh
 *
 * Renova o token JWT do usuário.
 * - Se o token é válido: emite novo token com 24h de validade.
 * - Se o token expirou há menos de 24h: emite novo token (grace period).
 * - Se o token expirou há mais de 24h ou é inválido: retorna 401.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.json({ mensagem: 'Token não encontrado' }, { status: 401 })
  }

  // Tentar verificar token normalmente (ainda válido)
  let payload = verifyToken(token)

  // Se falhou, tentar decodificar ignorando expiração
  if (!payload) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as TokenPayload

      // Verificar se expirou há menos de 24h (grace period)
      const agora = Math.floor(Date.now() / 1000)
      const expirouEm = decoded.exp || 0
      const tempoExpirado = agora - expirouEm

      if (tempoExpirado > MAX_EXPIRACAO_ACEITA) {
        return NextResponse.json(
          { mensagem: 'Sessão expirada. Faça login novamente.' },
          { status: 401 }
        )
      }

      // Token expirado recentemente — aceitar para renovação
      payload = decoded
    } catch {
      return NextResponse.json(
        { mensagem: 'Token inválido' },
        { status: 401 }
      )
    }
  }

  // Gerar novo token com validade estendida
  const novoToken = generateToken({
    userId: payload.userId,
    email: payload.email,
    tipoUsuario: payload.tipoUsuario as TipoUsuario,
    poloId: payload.poloId || null,
    escolaId: payload.escolaId || null,
  })

  const isProd = process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https')

  const response = NextResponse.json({ sucesso: true, mensagem: 'Token renovado' })
  response.cookies.set('token', novoToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSAO.COOKIE_MAX_AGE,
    path: '/',
  })

  return response
}
