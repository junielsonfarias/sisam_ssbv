/**
 * /api/professor/diario-classe/[id]
 *
 * GET: detalhe de um registro
 * PUT: atualiza (apenas o dono, e somente se status = rascunho)
 * DELETE: remove (apenas o dono, e somente se status = rascunho)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  atualizarRegistroDiario,
  buscarRegistroPorId,
  deletarRegistro,
} from '@/lib/services/diario-classe.service'

export const dynamic = 'force-dynamic'

const putSchema = z.object({
  conteudo: z.string().min(1).max(10000).optional(),
  metodologia: z.string().max(5000).nullable().optional(),
  recursos_didaticos: z.string().max(5000).nullable().optional(),
  observacoes: z.string().max(5000).nullable().optional(),
  atividades: z.array(z.object({
    tipo: z.string().min(1).max(100),
    descricao: z.string().min(1).max(2000),
    duracao_min: z.number().int().positive().max(600).optional(),
  })).max(20).optional(),
  observacoes_individuais: z.record(z.string().max(1000)).optional(),
  quantidade_aulas: z.number().int().min(1).max(8).optional(),
  status: z.enum(['rascunho', 'publicado']).optional(),
  habilidades_bncc: z.array(z.string()).max(30).optional(),
})

export const GET = withAuth(async (request, usuario) => {
  const id = request.nextUrl.pathname.split('/').pop()!
  const reg = await buscarRegistroPorId(id)
  if (!reg) return NextResponse.json({ mensagem: 'Não encontrado' }, { status: 404 })

  // Professor só vê o próprio registro; outros perfis dependem da autorização da rota
  if (usuario.tipo_usuario === 'professor' && reg.professor_id !== usuario.id) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }

  return NextResponse.json(reg)
})

export const PUT = withAuth('professor', async (request, usuario) => {
  const id = request.nextUrl.pathname.split('/').pop()!
  const reg = await buscarRegistroPorId(id)
  if (!reg) return NextResponse.json({ mensagem: 'Não encontrado' }, { status: 404 })
  if (reg.professor_id !== usuario.id) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }
  if (reg.status === 'assinado') {
    return NextResponse.json(
      { mensagem: 'Registro assinado não pode ser editado' },
      { status: 409 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }

  await atualizarRegistroDiario(id, parsed.data)
  return NextResponse.json({ mensagem: 'Atualizado' })
})

export const DELETE = withAuth('professor', async (request, usuario) => {
  const id = request.nextUrl.pathname.split('/').pop()!
  const removido = await deletarRegistro(id, usuario.id)
  if (!removido) {
    return NextResponse.json(
      { mensagem: 'Não foi possível remover (não é seu, não existe ou já foi publicado)' },
      { status: 403 }
    )
  }
  return NextResponse.json({ mensagem: 'Removido' })
})
