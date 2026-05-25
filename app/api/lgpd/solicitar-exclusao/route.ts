/**
 * POST /api/lgpd/solicitar-exclusao
 *
 * LGPD Art. 18 VI: eliminação dos dados pessoais tratados com o consentimento
 * do titular, exceto nas hipóteses do art. 16.
 *
 * Agenda exclusão com 15 dias de carência (titular pode cancelar nesse período).
 * Envia e-mail de confirmação. Auditoria completa.
 *
 * Após a carência, um job (executarExclusoesPendentes) processa as exclusões.
 *
 * Body: { motivo?: string }
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { agendarExclusao, listarMinhasSolicitacoes, cancelarExclusao } from '@/lib/services/lgpd.service'
import { getClientIP } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  motivo: z.string().max(2000).optional(),
})

const deleteSchema = z.object({
  solicitacaoId: z.string().uuid(),
})

export const POST = withAuth(async (request, usuario) => {
  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || undefined

  const resultado = await agendarExclusao({
    usuarioId: usuario.id,
    motivo: parsed.data.motivo,
    ip,
    userAgent,
  })

  return NextResponse.json(
    {
      mensagem: 'Solicitação de exclusão registrada. Seus dados serão removidos em 15 dias. Você pode cancelar essa solicitação até lá.',
      solicitacaoId: resultado.id,
      previstaPara: resultado.prevista_para,
    },
    { status: 200 }
  )
})

// GET — lista as solicitações do titular
export const GET = withAuth(async (_request, usuario) => {
  const lista = await listarMinhasSolicitacoes(usuario.id)
  return NextResponse.json({ solicitacoes: lista })
})

// DELETE — cancela uma solicitação pendente
export const DELETE = withAuth(async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'ID inválido' }, { status: 400 })
  }

  const ok = await cancelarExclusao({
    usuarioId: usuario.id,
    solicitacaoId: parsed.data.solicitacaoId,
  })

  if (!ok) {
    return NextResponse.json(
      { mensagem: 'Solicitação não encontrada ou já processada' },
      { status: 404 }
    )
  }

  return NextResponse.json({ mensagem: 'Solicitação de exclusão cancelada.' })
})
