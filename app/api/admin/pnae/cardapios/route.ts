/**
 * /api/admin/pnae/cardapios
 *
 * GET: busca cardápio vigente para escola+data+faixa
 * POST: cria novo cardápio com refeições
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { buscarCardapioSemana, criarCardapio, publicarCardapio } from '@/lib/services/pnae.service'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const FAIXAS = ['creche', 'pre_escola', 'fundamental', 'eja', 'integral'] as const
const TIPOS = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'] as const

const postSchema = z.object({
  escola_id: z.string().uuid().nullable(),
  semana_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  semana_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  faixa_etaria: z.enum(FAIXAS),
  nutricionista_id: z.string().uuid().optional(),
  observacoes: z.string().max(2000).optional(),
  refeicoes: z.array(z.object({
    dia_semana: z.number().int().min(1).max(7),
    tipo: z.enum(TIPOS),
    descricao: z.string().min(1).max(2000),
    detalhes: z.record(z.unknown()).optional(),
    kcal: z.number().nonnegative().optional(),
    proteinas_g: z.number().nonnegative().optional(),
    carboidratos_g: z.number().nonnegative().optional(),
    gorduras_g: z.number().nonnegative().optional(),
    contem_alergenicos: z.array(z.string()).optional(),
  })).min(1).max(50),
  publicar: z.boolean().optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'responsavel'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  let escola_id = searchParams.get('escola')
  const data = searchParams.get('data') || new Date().toISOString().slice(0, 10)
  const faixa_etaria = searchParams.get('faixa') as any

  // Escola só consulta o próprio cardápio
  if (usuario.tipo_usuario === 'escola') escola_id = usuario.escola_id || escola_id

  if (!escola_id || !faixa_etaria) {
    return NextResponse.json({ mensagem: 'Informe ?escola=&faixa=' }, { status: 400 })
  }

  const cardapio = await buscarCardapioSemana({
    escola_id, data_referencia: data, faixa_etaria,
  })
  return NextResponse.json({ cardapio })
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

  const id = await criarCardapio(parsed.data)
  if (parsed.data.publicar) await publicarCardapio(id)

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'PNAE_CRIAR_CARDAPIO',
    entidade: 'pnae_cardapios',
    entidadeId: id,
    detalhes: {
      escola_id: parsed.data.escola_id,
      semana_inicio: parsed.data.semana_inicio,
      semana_fim: parsed.data.semana_fim,
      faixa_etaria: parsed.data.faixa_etaria,
      qtd_refeicoes: parsed.data.refeicoes.length,
      publicado: !!parsed.data.publicar,
    },
  })

  return NextResponse.json({ id, mensagem: 'Cardápio criado' }, { status: 201 })
})
