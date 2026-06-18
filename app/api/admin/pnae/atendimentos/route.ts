/**
 * /api/admin/pnae/atendimentos
 *
 * GET: resumo mensal de atendimentos (para prestação FNDE)
 * POST: registra atendimento diário (escola informa quantos comeram)
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import { z } from 'zod'
import {
  registrarAtendimentoDiario,
  resumoMensalAtendimentos,
} from '@/lib/services/pnae.service'

export const dynamic = 'force-dynamic'

const FAIXAS = ['creche', 'pre_escola', 'fundamental', 'eja', 'integral'] as const
const TIPOS = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'] as const

const postSchema = z.object({
  escola_id: z.string().uuid(),
  data_atendimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  faixa_etaria: z.enum(FAIXAS),
  tipo_refeicao: z.enum(TIPOS),
  qtd_alunos: z.number().int().min(0).max(10000),
  qtd_extra: z.number().int().min(0).max(1000).optional(),
  observacoes: z.string().max(1000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const ano = parseInt(searchParams.get('ano') || String(new Date().getFullYear()), 10)
  const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1), 10)
  let escola_id = searchParams.get('escola') || undefined

  if (mes < 1 || mes > 12) {
    return NextResponse.json({ mensagem: 'Mês inválido (1-12)' }, { status: 400 })
  }
  if (usuario.tipo_usuario === 'escola') {
    escola_id = usuario.escola_id || '00000000-0000-0000-0000-000000000000'
  } else if (usuario.tipo_usuario === 'polo' && escola_id && !(await podeAcessarEscola(usuario, escola_id))) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }

  const resumo = await resumoMensalAtendimentos({ ano, mes, escola_id })
  return NextResponse.json({ ano, mes, resumo })
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados inválidos', erros: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const id = await registrarAtendimentoDiario({
    ...parsed.data,
    registrado_por: usuario.id,
  })
  return NextResponse.json({ id, mensagem: 'Atendimento registrado' }, { status: 201 })
})
