/**
 * /api/admin/pdde
 *
 * GET ?recurso=saldos|orcamentos|despesas|tipos_verba
 * POST ?acao=orcamento|despesa
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  consultarSaldos,
  listarDespesas,
  listarOrcamentosEscola,
  listarTiposVerba,
  registrarDespesa,
  registrarOrcamento,
} from '@/lib/services/pdde.service'

export const dynamic = 'force-dynamic'

const orcamentoSchema = z.object({
  escola_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  tipo_verba_id: z.string().max(30),
  valor_recebido: z.number().positive().max(99999999.99),
  data_credito: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conta_bancaria: z.string().max(50).optional(),
  observacoes: z.string().max(2000).optional(),
})

const despesaSchema = z.object({
  orcamento_id: z.string().uuid(),
  data_despesa: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricao: z.string().min(1).max(500),
  fornecedor: z.string().max(255).optional(),
  fornecedor_cnpj: z.string().max(20).optional(),
  valor: z.number().positive().max(9999999.99),
  categoria: z.string().max(50).optional(),
  numero_nota: z.string().max(50).optional(),
  data_nota: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nota_url: z.string().url().max(500).optional(),
  forma_pagamento: z.enum([
    'transferencia', 'cheque', 'cartao_debito', 'cartao_credito', 'pix', 'boleto',
  ]).optional(),
  status: z.enum(['registrada', 'paga', 'cancelada']).optional(),
  observacoes: z.string().max(2000).optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'saldos'

  switch (recurso) {
    case 'saldos': {
      const escola = searchParams.get('escola')
      const ano = searchParams.get('ano') || String(new Date().getFullYear())
      if (!escola) return NextResponse.json({ mensagem: 'Informe ?escola=' }, { status: 400 })
      const dados = await consultarSaldos(escola, ano)
      return NextResponse.json(dados)
    }
    case 'orcamentos': {
      const escola = searchParams.get('escola')
      if (!escola) return NextResponse.json({ mensagem: 'Informe ?escola=' }, { status: 400 })
      const dados = await listarOrcamentosEscola(escola, searchParams.get('ano') || undefined)
      return NextResponse.json({ orcamentos: dados })
    }
    case 'despesas': {
      const orcamento = searchParams.get('orcamento')
      if (!orcamento) return NextResponse.json({ mensagem: 'Informe ?orcamento=' }, { status: 400 })
      const dados = await listarDespesas(orcamento)
      return NextResponse.json({ despesas: dados })
    }
    case 'tipos_verba': {
      const dados = await listarTiposVerba()
      return NextResponse.json({ tipos: dados })
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'orcamento': {
      const parsed = orcamentoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      const id = await registrarOrcamento({ ...parsed.data, criado_por: usuario.id })
      return NextResponse.json({ id, mensagem: 'Orçamento registrado' }, { status: 201 })
    }
    case 'despesa': {
      const parsed = despesaSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      try {
        const id = await registrarDespesa({ ...parsed.data, criado_por: usuario.id })
        return NextResponse.json({ id, mensagem: 'Despesa registrada' }, { status: 201 })
      } catch (e) {
        return NextResponse.json({ mensagem: (e as Error).message }, { status: 409 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
