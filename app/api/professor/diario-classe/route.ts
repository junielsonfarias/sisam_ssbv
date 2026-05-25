/**
 * /api/professor/diario-classe
 *
 * GET: lista registros do diário do professor autenticado (com filtros)
 * POST: cria novo registro
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  criarRegistroDiario,
  listarRegistros,
} from '@/lib/services/diario-classe.service'

export const dynamic = 'force-dynamic'

const atividadeSchema = z.object({
  tipo: z.string().min(1).max(100),
  descricao: z.string().min(1).max(2000),
  duracao_min: z.number().int().positive().max(600).optional(),
})

const postSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid().nullable().optional(),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conteudo: z.string().min(1).max(10000),
  metodologia: z.string().max(5000).nullable().optional(),
  recursos_didaticos: z.string().max(5000).nullable().optional(),
  observacoes: z.string().max(5000).nullable().optional(),
  atividades: z.array(atividadeSchema).max(20).optional(),
  observacoes_individuais: z.record(z.string().max(1000)).optional(),
  quantidade_aulas: z.number().int().min(1).max(8).optional(),
  status: z.enum(['rascunho', 'publicado']).optional(),
  habilidades_bncc: z.array(z.string().regex(/^E[FI]\d+[A-Z]+\d+$/)).max(30).optional(),
})

export const GET = withAuth(['professor', 'administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const filtros = {
    turmaId: searchParams.get('turma') || undefined,
    disciplinaId: searchParams.get('disciplina') || undefined,
    dataInicio: searchParams.get('inicio') || undefined,
    dataFim: searchParams.get('fim') || undefined,
    status: searchParams.get('status') || undefined,
    // Professor só vê os próprios registros, admin/tecnico veem todos
    professorId: usuario.tipo_usuario === 'professor' ? usuario.id : (searchParams.get('professor') || undefined),
    limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
  }
  const registros = await listarRegistros(filtros)
  return NextResponse.json({ registros })
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

  const id = await criarRegistroDiario({
    ...parsed.data,
    professor_id: usuario.id,
  })

  return NextResponse.json({ id, mensagem: 'Registro criado' }, { status: 201 })
})
