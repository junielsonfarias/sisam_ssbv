/**
 * /api/professor/avaliacoes-descritivas
 *
 * GET: lista avaliações descritivas por turma/aluno/período (com filtros)
 * POST: cria ou atualiza (upsert por aluno+periodo+disciplina+professor)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import pool from '@/database/connection'
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

export const GET = withAuth(['professor', 'administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const alunoId = searchParams.get('aluno')
  const turmaId = searchParams.get('turma')

  if (!alunoId && !turmaId) {
    return NextResponse.json({ mensagem: 'Informe ?aluno=... ou ?turma=...' }, { status: 400 })
  }

  // Resolve a turma e a escola alvo para checar escopo (professor: vínculo
  // com a turma; escola/polo: pertencimento da escola). Evita IDOR: o service
  // filtra só por aluno/turma do query param, sem validar acesso.
  let turmaAlvo: string | null = turmaId
  let escolaAlvo: string | null = null
  if (alunoId) {
    const a = await pool.query('SELECT turma_id, escola_id FROM alunos WHERE id = $1', [alunoId])
    if (a.rows.length === 0) return NextResponse.json({ avaliacoes: [] })
    turmaAlvo = a.rows[0].turma_id
    escolaAlvo = a.rows[0].escola_id
  } else if (turmaId) {
    const t = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turmaId])
    escolaAlvo = t.rows[0]?.escola_id || null
  }

  if (usuario.tipo_usuario === 'professor') {
    if (!turmaAlvo || !(await verificarVinculoProfessor(usuario.id, turmaAlvo))) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }
  } else if (usuario.tipo_usuario === 'escola' || usuario.tipo_usuario === 'polo') {
    if (!escolaAlvo || !(await podeAcessarEscola(usuario, escolaAlvo))) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }
  }

  if (alunoId) {
    const status = searchParams.get('status') as 'rascunho' | 'publicada' | null
    const lista = await listarPorAluno(alunoId, status || undefined)
    return NextResponse.json({ avaliacoes: lista })
  }

  const lista = await listarPorTurma({
    turmaId: turmaId!,
    periodoId: searchParams.get('periodo') || undefined,
    disciplinaId: searchParams.get('disciplina') || undefined,
  })
  return NextResponse.json({ avaliacoes: lista })
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

  // Professor só grava avaliação para aluno de turma à qual está vinculado
  const a = await pool.query('SELECT turma_id FROM alunos WHERE id = $1', [parsed.data.aluno_id])
  const turmaId = a.rows[0]?.turma_id
  if (!turmaId || !(await verificarVinculoProfessor(usuario.id, turmaId))) {
    return NextResponse.json({ mensagem: 'Sem vínculo com a turma deste aluno' }, { status: 403 })
  }

  const id = await criarOuAtualizar({
    ...parsed.data,
    professor_id: usuario.id,
  })
  return NextResponse.json({ id, mensagem: 'Avaliação salva' }, { status: 201 })
})
