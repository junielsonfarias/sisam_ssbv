/**
 * /api/admin/ficai/[id]
 *
 * GET: detalhe do caso + timeline de ações
 * PATCH: atualiza status
 * POST: registra nova ação na timeline (/api/admin/ficai/[id]/acao)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  atualizarStatus,
  buscarCaso,
  STATUS_LABEL,
} from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  status: z.enum(Object.keys(STATUS_LABEL) as [string, ...string[]]),
  observacao: z.string().max(2000).optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request) => {
  const id = request.nextUrl.pathname.split('/').pop()!
  const caso = await buscarCaso(id)
  if (!caso) return NextResponse.json({ mensagem: 'Não encontrado' }, { status: 404 })
  return NextResponse.json({ caso })
})

export const PATCH = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const id = request.nextUrl.pathname.split('/').pop()!
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  const ok = await atualizarStatus({
    casoId: id,
    novoStatus: parsed.data.status as any,
    usuarioId: usuario.id,
    observacao: parsed.data.observacao,
  })

  if (!ok) {
    return NextResponse.json({ mensagem: 'Não foi possível atualizar' }, { status: 404 })
  }
  return NextResponse.json({ mensagem: 'Status atualizado' })
})
