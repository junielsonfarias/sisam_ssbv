import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import { createLogger } from '@/lib/logger'

const log = createLogger('AuthLogout')

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Logar quem está fazendo logout (melhor esforço — não bloqueia se não autenticado)
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (usuario) {
      log.info(`Logout | usuario:${usuario.email} (${usuario.tipo_usuario})`)
    }
  } catch {
    // Continuar mesmo sem auth — o objetivo é limpar o cookie
  }

  const response = NextResponse.json({ mensagem: 'Logout realizado com sucesso' })
  // Deletar cookie com mesmas flags IDÊNTICAS ao login para garantir matching
  const isSecure = process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https')
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0), // Fallback para navegadores antigos
  })
  return response
}
