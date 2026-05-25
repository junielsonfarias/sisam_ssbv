/**
 * /api/admin/aee/planos
 *
 * GET: busca plano AEE de um aluno por ano
 * POST: cria ou atualiza plano (upsert por aluno+ano)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { buscarPlano, salvarPlano } from '@/lib/services/aee.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  objetivos: z.string().min(10).max(10000),
  estrategias: z.string().min(10).max(10000),
  recursos_necessarios: z.string().max(5000).nullable().optional(),
  areas_foco: z.array(z.string().max(100)).max(20).optional(),
  periodicidade_horas_semanais: z.number().int().min(1).max(40).nullable().optional(),
  avaliacao_progresso: z.string().max(10000).nullable().optional(),
  status: z.enum(['rascunho', 'ativo', 'concluido', 'cancelado']).optional(),
  professor_aee_id: z.string().uuid().nullable().optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_revisao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'professor'], async (request) => {
  const { searchParams } = new URL(request.url)
  const aluno = searchParams.get('aluno')
  const ano = searchParams.get('ano')
  if (!aluno || !ano) {
    return NextResponse.json({ mensagem: 'Informe ?aluno=&ano=' }, { status: 400 })
  }
  const plano = await buscarPlano(aluno, ano)
  return NextResponse.json({ plano })
})

export const POST = withAuth(['administrador', 'tecnico', 'escola', 'professor'], async (request) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const id = await salvarPlano(parsed.data)
  return NextResponse.json({ id, mensagem: 'Plano AEE salvo' }, { status: 201 })
})
