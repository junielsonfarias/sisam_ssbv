/**
 * /api/professor/avaliacoes-descritivas
 *
 * GET: lista avaliações descritivas por turma/aluno/período (com filtros)
 * POST: cria ou atualiza (upsert por aluno+periodo+disciplina+professor)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  criarOuAtualizar,
  listarPorAluno,
  listarPorTurma,
} from '@/lib/services/avaliacoes-descritivas.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  periodo_id: z.string().uuid().nullable().optional(),
  disciplina_id: z.string().uuid().nullable().optional(),
  texto_descritivo: z.string().min(20, 'Descrição muito curta (mínimo 20 caracteres)').max(5000),
  conceito: z.enum([
    'plenamente_satisfatorio', 'satisfatorio', 'em_desenvolvimento', 'insuficiente',
    'consolidado', 'em_processo', 'nao_observado'
  ]).nullable().optional(),
  habilidades_avaliadas: z.array(z.string()).max(30).optional(),
  status: z.enum(['rascunho', 'publicada']).optional(),
})

export const GET = withAuth(['professor', 'administrador', 'tecnico', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)
  const alunoId = searchParams.get('aluno')
  const turmaId = searchParams.get('turma')

  if (alunoId) {
    const status = searchParams.get('status') as 'rascunho' | 'publicada' | null
    const lista = await listarPorAluno(alunoId, status || undefined)
    return NextResponse.json({ avaliacoes: lista })
  }

  if (turmaId) {
    const lista = await listarPorTurma({
      turmaId,
      periodoId: searchParams.get('periodo') || undefined,
      disciplinaId: searchParams.get('disciplina') || undefined,
    })
    return NextResponse.json({ avaliacoes: lista })
  }

  return NextResponse.json({ mensagem: 'Informe ?aluno=... ou ?turma=...' }, { status: 400 })
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

  const id = await criarOuAtualizar({
    ...parsed.data,
    professor_id: usuario.id,
  })
  return NextResponse.json({ id, mensagem: 'Avaliação salva' }, { status: 201 })
})
