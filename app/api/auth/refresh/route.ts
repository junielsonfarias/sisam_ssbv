import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { generateToken } from '@/lib/auth'
import { SESSAO } from '@/lib/constants'
import type { TipoUsuario } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/refresh
 *
 * Renova o token JWT do usuário autenticado.
 * O token atual é validado via withAuth e um novo token é emitido com 24h de validade.
 * Usado pelo frontend para manter a sessão ativa sem exigir novo login.
 */
export const POST = withAuth(async (_request, usuario) => {
  const novoToken = generateToken({
    userId: usuario.id,
    email: usuario.email,
    tipoUsuario: usuario.tipo_usuario as TipoUsuario,
    poloId: usuario.polo_id || null,
    escolaId: usuario.escola_id || null,
  })

  const isProd = process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https')

  const response = NextResponse.json({ mensagem: 'Token renovado' })
  response.cookies.set('token', novoToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSAO.COOKIE_MAX_AGE,
    path: '/',
  })

  return response
})
