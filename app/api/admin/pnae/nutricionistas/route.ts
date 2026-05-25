/**
 * /api/admin/pnae/nutricionistas
 *
 * GET: lista nutricionistas (?inativos=true para incluir desativados)
 * POST: cadastra novo nutricionista
 * PATCH ?id=: atualiza dados do nutricionista (também usado para inativar)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  atualizarNutricionista,
  cadastrarNutricionista,
  listarNutricionistas,
} from '@/lib/services/pnae.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  nome: z.string().min(2).max(255),
  crn: z.string().min(3).max(20),
  telefone: z.string().max(20).optional(),
  email: z.string().email().max(254).optional(),
  responsavel_tecnico: z.boolean().optional(),
})

const patchSchema = z.object({
  nome: z.string().min(2).max(255).optional(),
  telefone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(254).nullable().optional(),
  responsavel_tecnico: z.boolean().optional(),
  ativa: z.boolean().optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: 'Informe ao menos 1 campo para atualizar' }
)

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)
  const incluirInativos = searchParams.get('inativos') === 'true'
  const dados = await listarNutricionistas(incluirInativos)
  return NextResponse.json({ nutricionistas: dados })
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }
  try {
    const id = await cadastrarNutricionista(parsed.data)

    // Auditoria — CRN tem implicação legal (Resolução FNDE 06/2020)
    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: 'PNAE_CADASTRAR_NUTRICIONISTA',
      entidade: 'pnae_nutricionistas',
      entidadeId: id,
      detalhes: {
        nome: parsed.data.nome,
        crn: parsed.data.crn,
        responsavel_tecnico: parsed.data.responsavel_tecnico ?? false,
      },
    })

    return NextResponse.json({ id, mensagem: 'Nutricionista cadastrada' }, { status: 201 })
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      return NextResponse.json({ mensagem: 'Já existe nutricionista com este CRN' }, { status: 409 })
    }
    throw e
  }
})

export const PATCH = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  // Captura estado anterior para registrar diff na auditoria
  const antesR = await pool.query(
    `SELECT nome, crn, responsavel_tecnico, ativa FROM pnae_nutricionistas WHERE id = $1`,
    [id]
  )
  if (!antesR.rows[0]) return NextResponse.json({ mensagem: 'Não encontrada' }, { status: 404 })
  const antes = antesR.rows[0]

  const ok = await atualizarNutricionista(id, parsed.data)
  if (!ok) return NextResponse.json({ mensagem: 'Sem alterações' }, { status: 404 })

  // Auditoria — registra somente campos alterados (diff)
  const alterados: Record<string, { de: unknown; para: unknown }> = {}
  for (const [campo, valorNovo] of Object.entries(parsed.data)) {
    if (valorNovo !== undefined && antes[campo] !== valorNovo) {
      alterados[campo] = { de: antes[campo], para: valorNovo }
    }
  }
  // Ações específicas para mudanças relevantes (RT, ativação/desativação)
  let acao = 'PNAE_ATUALIZAR_NUTRICIONISTA'
  if ('ativa' in alterados) {
    acao = alterados.ativa.para ? 'PNAE_REATIVAR_NUTRICIONISTA' : 'PNAE_INATIVAR_NUTRICIONISTA'
  } else if ('responsavel_tecnico' in alterados) {
    acao = alterados.responsavel_tecnico.para
      ? 'PNAE_DESIGNAR_RT_FNDE'
      : 'PNAE_REMOVER_RT_FNDE'
  }

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao,
    entidade: 'pnae_nutricionistas',
    entidadeId: id,
    detalhes: {
      nome: antes.nome,
      crn: antes.crn,
      alterados,
    },
  })

  return NextResponse.json({ mensagem: 'Nutricionista atualizada' })
})
