/**
 * POST /api/admin/ficai/detectar
 *
 * Roda a detecção automática de infrequência e abre casos.
 * Pode ser chamado manualmente (admin) ou por cron job.
 *
 * Body: { anoLetivo: '2026' }
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { detectarInfrequencia } from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  anoLetivo: z.string().regex(/^\d{4}$/),
})

export const POST = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Informe anoLetivo' }, { status: 400 })
  }

  const resultado = await detectarInfrequencia(parsed.data.anoLetivo)
  return NextResponse.json({
    ...resultado,
    mensagem: `Detecção concluída. ${resultado.total_casos_abertos} novos casos abertos.`,
  })
})
