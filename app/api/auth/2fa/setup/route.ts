/**
 * POST /api/auth/2fa/setup
 *
 * Gera novo segredo TOTP + QR code + códigos de backup para o usuário autenticado.
 * Retorna QR code para escanear no app autenticador (Google Authenticator, Authy).
 *
 * Os códigos de backup só são mostrados UMA vez nesta resposta.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { setup2FA } from '@/lib/services/dois-fatores.service'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (_request, usuario) => {
  const resultado = await setup2FA({
    usuarioId: usuario.id,
    email: usuario.email,
    appName: 'SISAM/Educatec',
  })

  return NextResponse.json({
    secret: resultado.secret,
    otpauthUrl: resultado.otpauthUrl,
    qrCodeDataUrl: resultado.qrCodeDataUrl,
    backupCodes: resultado.backupCodes,
    aviso: 'Guarde os códigos de backup em local seguro. Eles só serão mostrados uma vez e são úteis se você perder o acesso ao app.',
  })
})
