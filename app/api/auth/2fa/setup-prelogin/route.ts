/**
 * POST /api/auth/2fa/setup-prelogin
 *
 * Variante de /api/auth/2fa/setup usada DURANTE o fluxo de login obrigatório
 * (tipo administrador/tecnico sem 2FA configurado). Em vez de exigir JWT
 * principal, usa o preAuthToken (10min) emitido pelo /api/auth/login.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPreAuthToken } from '@/lib/auth'
import { setup2FA } from '@/lib/services/dois-fatores.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  preAuthToken: z.string().min(10),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Token inválido' }, { status: 400 })
  }

  const preAuth = verifyPreAuthToken(parsed.data.preAuthToken)
  if (!preAuth) {
    return NextResponse.json({ mensagem: 'Sessão expirou. Faça login novamente.' }, { status: 401 })
  }

  const resultado = await setup2FA({
    usuarioId: preAuth.userId,
    email: preAuth.email,
    appName: 'SISAM/Educatec',
  })

  return NextResponse.json({
    secret: resultado.secret,
    qrCodeDataUrl: resultado.qrCodeDataUrl,
    backupCodes: resultado.backupCodes,
  })
}
