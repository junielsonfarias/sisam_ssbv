/**
 * /api/professor/ed-infantil/relatorio
 *
 * GET: busca relatorio de um aluno por ano/periodo
 * POST: cria ou atualiza relatorio (upsert)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  buscarRelatorio,
  salvarRelatorio,
} from '@/lib/services/ed-infantil.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  periodo: z.enum(['semestre_1', 'semestre_2', 'final']),
  eu_outro_nos: z.string().max(5000).nullable().optional(),
  corpo_gestos_movimentos: z.string().max(5000).nullable().optional(),
  tracos_sons_cores_formas: z.string().max(5000).nullable().optional(),
  escuta_fala_pensamento: z.string().max(5000).nullable().optional(),
  espacos_tempos_quantidades: z.string().max(5000).nullable().optional(),
  observacoes_gerais: z.string().max(5000).nullable().optional(),
  status: z.enum(['rascunho', 'publicado', 'entregue']).optional(),
})

export const GET = withAuth(['professor', 'administrador', 'tecnico', 'escola', 'responsavel'], async (request) => {
  const { searchParams } = new URL(request.url)
  const aluno = searchParams.get('aluno')
  const ano = searchParams.get('ano')
  const periodo = searchParams.get('periodo')

  if (!aluno || !ano || !periodo) {
    return NextResponse.json({ mensagem: 'Informe ?aluno=&ano=&periodo=' }, { status: 400 })
  }

  const rel = await buscarRelatorio({ alunoId: aluno, anoLetivo: ano, periodo })
  return NextResponse.json({ relatorio: rel })
})

export const POST = withAuth('professor', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const id = await salvarRelatorio({
    ...parsed.data,
    professor_id: usuario.id,
  })
  return NextResponse.json({ id, mensagem: 'Relatório salvo' }, { status: 201 })
})
