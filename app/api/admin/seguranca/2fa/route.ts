/**
 * GET/PUT /api/admin/seguranca/2fa
 *
 * Le e atualiza a flag global `dois_fatores_habilitado`.
 * Apenas administrador pode alterar.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/with-auth'
import { getConfigDetalhe, setConfig } from '@/lib/services/configuracoes-sistema.service'
import { createLogger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const log = createLogger('AdminSeguranca2FA')

const putSchema = z.object({
  habilitado: z.boolean(),
})

export const GET = withAuth(['administrador'], async () => {
  const detalhe = await getConfigDetalhe('dois_fatores_habilitado')
  return NextResponse.json({
    habilitado: detalhe?.valor === true,
    atualizadoEm: detalhe?.atualizadoEm ?? null,
    atualizadoPor: detalhe?.atualizadoPor ?? null,
  })
})

export const PUT = withAuth(['administrador'], async (request, usuario) => {
  const body = await request.json().catch(() => ({}))
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
  }

  await setConfig({
    chave: 'dois_fatores_habilitado',
    valor: parsed.data.habilitado,
    usuarioId: usuario.id,
  })

  log.info(`2FA global ${parsed.data.habilitado ? 'habilitado' : 'desabilitado'}`, {
    userId: usuario.id,
  })

  return NextResponse.json({
    habilitado: parsed.data.habilitado,
    mensagem: parsed.data.habilitado
      ? '2FA habilitado globalmente'
      : '2FA desabilitado globalmente',
  })
})
