/**
 * GET /api/auth/2fa/status
 *
 * Retorna o estado do 2FA do usuário autenticado:
 *  - configurado: tem segredo registrado
 *  - ativado: configurado E confirmado pelo primeiro código
 *  - backupCodesRestantes: quantos códigos de uso único restam
 *  - obrigatorio: o tipo do usuário exige 2FA
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { status2FA, tipoExige2FA } from '@/lib/services/dois-fatores.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (_request, usuario) => {
  const s = await status2FA(usuario.id)
  return NextResponse.json({
    ...s,
    obrigatorio: tipoExige2FA(usuario.tipo_usuario || ''),
  })
})
