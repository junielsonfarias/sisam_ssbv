/**
 * POST /api/auth/2fa/ativar
 *
 * Ativa o 2FA após o usuário verificar o primeiro código TOTP.
 * Body: { codigo: "123456" }
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { ativar2FA } from '@/lib/services/dois-fatores.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  codigo: z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos'),
})

export const POST = withAuth(async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Código inválido. Informe os 6 dígitos do app.' },
      { status: 400 }
    )
  }

  const resultado = await ativar2FA({
    usuarioId: usuario.id,
    codigo: parsed.data.codigo,
  })

  if (!resultado.ok) {
    return NextResponse.json(
      { mensagem: resultado.mensagem || 'Código inválido' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    mensagem: '2FA ativado com sucesso. A partir do próximo login, você precisará informar o código.',
  })
})
