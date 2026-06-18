/**
 * POST /api/admin/infrequencia/notificar
 *
 * Dispara (ou simula, com dry_run) a notificação de infrequência aos
 * responsáveis para um período. (Fase 4.1 — ciclo pedagógico LDB.)
 *
 * Permissão: administrador / tecnico (qualquer escola) · escola (apenas a sua).
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { notificarInfrequencia } from '@/lib/services/infrequencia-notificacao.service'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  ano_letivo: z.string().regex(/^\d{4}$/),
  periodo_id: z.string().uuid(),
  escola_id: z.string().uuid().optional(),
  limiar: z.number().min(1).max(100).optional(),
  dry_run: z.boolean().optional().default(false),
})

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  // Usuário 'escola' só pode notificar a própria escola.
  let escolaId = parsed.data.escola_id
  if (usuario.tipo_usuario === 'escola') {
    if (!usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Usuário sem escola vinculada' }, { status: 403 })
    }
    escolaId = usuario.escola_id
  }

  const resultado = await notificarInfrequencia({
    anoLetivo: parsed.data.ano_letivo,
    periodoId: parsed.data.periodo_id,
    escolaId,
    limiarPadrao: parsed.data.limiar,
    dryRun: parsed.data.dry_run,
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
  })

  return NextResponse.json({ resultado })
})
