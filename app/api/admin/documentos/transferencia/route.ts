/**
 * POST /api/admin/documentos/transferencia
 *
 * Emite guia ou declaração de transferência.
 *
 * Body:
 *  - alunoId: uuid
 *  - anoLetivo: '2026'
 *  - motivo?: string
 *  - escolaDestino?: { nome, cidade? }
 *  - tipo?: 'guia_transferencia' | 'declaracao_transferencia' (default: guia)
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarAluno } from '@/lib/auth'
import { z } from 'zod'
import { emitirGuiaTransferencia } from '@/lib/services/transferencia-documento.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  alunoId: z.string().uuid(),
  anoLetivo: z.string().regex(/^\d{4}$/),
  motivo: z.string().max(2000).optional(),
  escolaDestino: z.object({
    nome: z.string().min(1).max(255),
    cidade: z.string().max(100).optional(),
  }).optional(),
  tipo: z.enum(['guia_transferencia', 'declaracao_transferencia']).optional(),
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // IDOR: escola só emite guia/declaração de transferência de aluno da própria escola.
  if (!(await podeAcessarAluno(usuario, parsed.data.alunoId))) {
    return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
  }

  try {
    const resultado = await emitirGuiaTransferencia({
      ...parsed.data,
      emitidoPor: usuario.id,
    })
    return NextResponse.json({
      ...resultado,
      url_validacao: `/validar/${resultado.codigo_validacao}`,
      mensagem: 'Documento de transferência emitido.',
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ mensagem: (e as Error).message }, { status: 404 })
  }
})
