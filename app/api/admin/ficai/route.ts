/**
 * /api/admin/ficai
 *
 * GET: lista casos com filtros
 * POST: abre caso manualmente (escola ou admin)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { abrirCaso, listarCasos, obterEstatisticas } from '@/lib/services/ficai.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  escola_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  motivo: z.enum(['infrequencia_50', 'ausencia_consecutiva', 'abandono_suspeito', 'evasao_confirmada', 'outro']),
  detalhes_motivo: z.string().max(2000).optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('estatisticas') === 'true') {
    const ano = searchParams.get('ano') || String(new Date().getFullYear())
    const stats = await obterEstatisticas(ano)
    return NextResponse.json({ estatisticas: stats })
  }

  const casos = await listarCasos({
    escolaId: searchParams.get('escola') || undefined,
    status: searchParams.get('status') as any || undefined,
    anoLetivo: searchParams.get('ano') || undefined,
    apenasAbertos: searchParams.get('apenasAbertos') === 'true',
    limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
  })

  return NextResponse.json({ casos })
})

export const POST = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const origem = usuario.tipo_usuario === 'escola' ? 'manual_escola'
    : usuario.tipo_usuario === 'polo' ? 'manual_polo'
    : 'manual_admin'

  const aberto = await abrirCaso({
    ...parsed.data,
    origem,
    responsavel_caso_id: usuario.id,
  })

  if (!aberto) {
    return NextResponse.json(
      { mensagem: 'Já existe um caso FICAI aberto para este aluno no ano letivo' },
      { status: 409 }
    )
  }

  return NextResponse.json({ mensagem: 'Caso FICAI aberto' }, { status: 201 })
})
