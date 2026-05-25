/**
 * POST /api/auth/2fa/desativar
 *
 * Desativa o 2FA. Bloqueado para tipos obrigatórios (administrador, tecnico).
 * Exige código TOTP válido como confirmação adicional.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { desativar2FA, verificarCodigo2FA } from '@/lib/services/dois-fatores.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  codigo: z.string().min(6, 'Informe o código atual do app').max(10),
})

export const POST = withAuth(async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Informe o código atual para confirmar a desativação' },
      { status: 400 }
    )
  }

  // Confirmar com código atual antes de desativar
  const verif = await verificarCodigo2FA({ usuarioId: usuario.id, codigo: parsed.data.codigo })
  if (!verif.ok) {
    return NextResponse.json(
      { mensagem: 'Código inválido. Não foi possível confirmar a desativação.' },
      { status: 401 }
    )
  }

  const resultado = await desativar2FA({
    usuarioId: usuario.id,
    tipoUsuario: usuario.tipo_usuario || '',
  })

  if (!resultado.ok) {
    return NextResponse.json(
      { mensagem: resultado.mensagem || 'Não foi possível desativar' },
      { status: 403 }
    )
  }

  return NextResponse.json({ mensagem: '2FA desativado.' })
})
