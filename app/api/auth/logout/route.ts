import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import { createLogger } from '@/lib/logger'
import {
  revogarRefreshToken,
  REFRESH_TOKEN_COOKIE,
  REFRESH_COOKIE_PATH,
} from '@/lib/services/refresh-token.service'

const log = createLogger('AuthLogout')

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (usuario) {
      log.info(`Logout | usuario:${usuario.email} (${usuario.tipo_usuario})`)
    }
  } catch {
    // Continuar mesmo sem auth — o objetivo é limpar os cookies
  }

  // Revogar refresh-token no banco se presente
  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value
  if (refreshCookie) {
    try {
      await revogarRefreshToken(refreshCookie, 'logout')
    } catch (err) {
      log.error('Falha ao revogar refresh-token no logout', err)
    }
  }

  const response = NextResponse.json({ mensagem: 'Logout realizado com sucesso' })
  const isSecure = process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https')

  response.cookies.set('token', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 0,
    expires: new Date(0),
  })

  return response
}
