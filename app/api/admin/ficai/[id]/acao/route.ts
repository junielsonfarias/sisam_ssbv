/**
 * POST /api/admin/ficai/[id]/acao
 *
 * Registra nova ação na timeline do caso FICAI.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAcao } from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tipo: z.enum([
    'contato_telefone', 'contato_visita', 'contato_email', 'contato_whatsapp',
    'reuniao_responsavel', 'aluno_retornou',
    'encaminhamento_conselho_tutelar', 'encaminhamento_ministerio_publico',
    'oficio_emitido', 'observacao',
  ]),
  descricao: z.string().min(5).max(5000),
  anexo_url: z.string().url().nullable().optional(),
})

export const POST = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const id = request.nextUrl.pathname.split('/').slice(-2, -1)[0]
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  const acaoId = await registrarAcao({
    caso_id: id,
    tipo: parsed.data.tipo,
    descricao: parsed.data.descricao,
    anexo_url: parsed.data.anexo_url || undefined,
    realizado_por: usuario.id,
  })

  return NextResponse.json({ id: acaoId, mensagem: 'Ação registrada' }, { status: 201 })
})
