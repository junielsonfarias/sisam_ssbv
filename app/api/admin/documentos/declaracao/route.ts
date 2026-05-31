/**
 * POST /api/admin/documentos/declaracao
 *
 * Emite declaração formal (matrícula, frequência ou conclusão).
 *
 * Body: { tipo: 'matricula' | 'frequencia' | 'conclusao', alunoId, anoLetivo, serieConcluida? }
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  gerarDeclaracaoMatricula,
  gerarDeclaracaoFrequencia,
  gerarDeclaracaoConclusao,
} from '@/lib/services/declaracoes.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tipo: z.enum(['matricula', 'frequencia', 'conclusao']),
  alunoId: z.string().uuid(),
  anoLetivo: z.string().regex(/^\d{4}$/),
  serieConcluida: z.string().max(50).optional(),
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

  try {
    let resultado
    switch (parsed.data.tipo) {
      case 'matricula':
        resultado = await gerarDeclaracaoMatricula({
          alunoId: parsed.data.alunoId,
          anoLetivo: parsed.data.anoLetivo,
          emitidoPor: usuario.id,
        })
        break
      case 'frequencia':
        resultado = await gerarDeclaracaoFrequencia({
          alunoId: parsed.data.alunoId,
          anoLetivo: parsed.data.anoLetivo,
          emitidoPor: usuario.id,
        })
        break
      case 'conclusao':
        if (!parsed.data.serieConcluida) {
          return NextResponse.json(
            { mensagem: 'serieConcluida obrigatória para declaração de conclusão' },
            { status: 400 }
          )
        }
        resultado = await gerarDeclaracaoConclusao({
          alunoId: parsed.data.alunoId,
          anoLetivo: parsed.data.anoLetivo,
          serieConcluida: parsed.data.serieConcluida,
          emitidoPor: usuario.id,
        })
        break
    }

    return NextResponse.json({
      ...resultado,
      url_validacao: `/validar/${resultado!.codigo_validacao}`,
      mensagem: 'Declaração emitida.',
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ mensagem: (e as Error).message }, { status: 404 })
  }
})
