/**
 * POST /api/responsavel/declaracao
 *
 * Responsável solicita declaração para seu filho (matrícula ou frequência).
 * Validação: o aluno deve estar vinculado ao responsável autenticado.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import {
  gerarDeclaracaoMatricula,
  gerarDeclaracaoFrequencia,
} from '@/lib/services/declaracoes.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  tipo: z.enum(['matricula', 'frequencia']),
  alunoId: z.string().uuid(),
  anoLetivo: z.string().regex(/^\d{4}$/),
})

export const POST = withAuth('responsavel', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  // Valida vínculo responsável-aluno
  const vinculo = await pool.query(
    `SELECT 1 FROM responsaveis_alunos
      WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true AND status = 'aprovado' LIMIT 1`,
    [usuario.id, parsed.data.alunoId]
  ).catch(() => ({ rowCount: 0 }))

  if ((vinculo.rowCount ?? 0) === 0) {
    return NextResponse.json(
      { mensagem: 'Você não tem permissão para solicitar declarações deste aluno.' },
      { status: 403 }
    )
  }

  try {
    let resultado
    if (parsed.data.tipo === 'matricula') {
      resultado = await gerarDeclaracaoMatricula({
        alunoId: parsed.data.alunoId,
        anoLetivo: parsed.data.anoLetivo,
        emitidoPor: usuario.id,
      })
    } else {
      resultado = await gerarDeclaracaoFrequencia({
        alunoId: parsed.data.alunoId,
        anoLetivo: parsed.data.anoLetivo,
        emitidoPor: usuario.id,
      })
    }

    return NextResponse.json({
      ...resultado,
      url_validacao: `/validar/${resultado.codigo_validacao}`,
      mensagem: 'Declaração emitida. Você pode imprimir ou compartilhar o código.',
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ mensagem: (e as Error).message }, { status: 404 })
  }
})
