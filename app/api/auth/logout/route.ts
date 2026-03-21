import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Logar quem está fazendo logout (melhor esforço — não bloqueia se não autenticado)
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (usuario) {
      console.log(`Logout: ${usuario.email} (${usuario.tipo_usuario})`)
    }
  } catch {
    // Continuar mesmo sem auth — o objetivo é limpar o cookie
  }

  const response = NextResponse.json({ mensagem: 'Logout realizado com sucesso' })
  response.cookies.delete('token')
  return response
}
