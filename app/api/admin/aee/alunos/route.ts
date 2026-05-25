/**
 * /api/admin/aee/alunos
 *
 * GET: lista alunos PNE (com filtros)
 * POST: cadastra/atualiza dados AEE de um aluno
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  cadastrarOuAtualizarAlunoAee,
  listarAlunosAee,
  buscarAlunoAee,
} from '@/lib/services/aee.service'

export const dynamic = 'force-dynamic'

const TIPOS = [
  'fisica', 'auditiva', 'visual', 'intelectual', 'multipla',
  'tea', 'altas_habilidades', 'surdocegueira',
  'transtorno_global_desenvolvimento',
] as const

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  tipos_deficiencia: z.array(z.enum(TIPOS)).min(1),
  cid_codigos: z.array(z.string().max(20)).max(10).optional(),
  laudo_medico: z.boolean().optional(),
  laudo_data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  laudo_arquivo_url: z.string().url().nullable().optional(),
  laudo_emitido_por: z.string().max(255).nullable().optional(),
  observacoes: z.string().max(5000).nullable().optional(),
  necessita_cuidador: z.boolean().optional(),
  necessita_interprete: z.boolean().optional(),
  recursos_especiais: z.array(z.string()).optional(),
  sala_recursos_id: z.string().uuid().nullable().optional(),
  frequencia_aee: z.string().max(50).nullable().optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request) => {
  const { searchParams } = new URL(request.url)
  const aluno = searchParams.get('aluno')
  if (aluno) {
    const dados = await buscarAlunoAee(aluno)
    return NextResponse.json({ aluno_aee: dados })
  }
  const lista = await listarAlunosAee({
    escolaId: searchParams.get('escola') || undefined,
    turmaId: searchParams.get('turma') || undefined,
  })
  return NextResponse.json({ alunos: lista })
})

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const id = await cadastrarOuAtualizarAlunoAee(parsed.data)
  return NextResponse.json({ id, mensagem: 'Cadastro AEE salvo' }, { status: 201 })
})
