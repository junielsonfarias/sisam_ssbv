/**
 * /api/professor/ed-infantil/portfolio
 *
 * GET: lista registros do portfolio de um aluno
 * POST: adiciona novo registro (foto, video, observacao etc.)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  adicionarRegistroPortfolio,
  listarPortfolioAluno,
} from '@/lib/services/ed-infantil.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  aluno_id: z.string().uuid(),
  data_registro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(['foto', 'video', 'audio', 'atividade', 'observacao']),
  titulo: z.string().max(255).nullable().optional(),
  descricao: z.string().max(2000).nullable().optional(),
  arquivo_url: z.string().url().nullable().optional(),
  arquivo_tamanho_bytes: z.number().int().nullable().optional(),
  campo_experiencia: z.enum(['EOEU', 'CG', 'TS', 'EF', 'ET']).nullable().optional(),
  habilidades_bncc: z.array(z.string()).max(20).optional(),
  visivel_responsavel: z.boolean().optional(),
})

export const GET = withAuth(['professor', 'administrador', 'tecnico', 'escola', 'responsavel'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const alunoId = searchParams.get('aluno')
  if (!alunoId) {
    return NextResponse.json({ mensagem: 'Informe ?aluno=...' }, { status: 400 })
  }

  // Responsavel só vê registros visíveis para ele
  const apenasVisiveisResponsavel = usuario.tipo_usuario === 'responsavel'

  const registros = await listarPortfolioAluno({
    alunoId,
    campoExperiencia: searchParams.get('campo') as any || undefined,
    dataInicio: searchParams.get('inicio') || undefined,
    dataFim: searchParams.get('fim') || undefined,
    apenasVisiveisResponsavel,
  })

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

  const id = await adicionarRegistroPortfolio({
    ...parsed.data,
    professor_id: usuario.id,
  })
  return NextResponse.json({ id, mensagem: 'Registro adicionado' }, { status: 201 })
})
