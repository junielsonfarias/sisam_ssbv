/**
 * /api/admin/pdde
 *
 * GET ?recurso=saldos|orcamentos|despesas|tipos_verba
 * POST ?acao=orcamento|despesa
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
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

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request) => {
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

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'orcamento': {
      const parsed = orcamentoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const id = await registrarOrcamento({ ...parsed.data, criado_por: usuario.id })

      // TCE — recebimento de verba pública tem peso de prestação de contas
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'PDDE_REGISTRAR_ORCAMENTO',
        entidade: 'pdde_orcamentos',
        entidadeId: id,
        detalhes: {
          escola_id: parsed.data.escola_id,
          ano_letivo: parsed.data.ano_letivo,
          tipo_verba_id: parsed.data.tipo_verba_id,
          valor_recebido: parsed.data.valor_recebido,
          data_credito: parsed.data.data_credito,
          conta_bancaria: parsed.data.conta_bancaria,
        },
      })

      return NextResponse.json({ id, mensagem: 'Orçamento registrado' }, { status: 201 })
    }
    case 'despesa': {
      const parsed = despesaSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      }
      try {
        const id = await registrarDespesa({ ...parsed.data, criado_por: usuario.id })

        // TCE — cada despesa de verba pública precisa rastreabilidade
        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PDDE_REGISTRAR_DESPESA',
          entidade: 'pdde_despesas',
          entidadeId: id,
          detalhes: {
            orcamento_id: parsed.data.orcamento_id,
            data_despesa: parsed.data.data_despesa,
            valor: parsed.data.valor,
            fornecedor: parsed.data.fornecedor,
            fornecedor_cnpj: parsed.data.fornecedor_cnpj,
            numero_nota: parsed.data.numero_nota,
            forma_pagamento: parsed.data.forma_pagamento,
            status: parsed.data.status ?? 'registrada',
          },
        })

        return NextResponse.json({ id, mensagem: 'Despesa registrada' }, { status: 201 })
      } catch (e) {
        const msg = (e as Error).message || ''
        // Erros esperados (validados) viram 409 com a mensagem segura
        if (msg.startsWith('Saldo insuficiente') || msg.startsWith('Orçamento não encontrado')) {
          return NextResponse.json({ mensagem: msg }, { status: 409 })
        }
        // Erros não esperados (DB, FK violation) viram 500 sem expor detalhes
        return NextResponse.json({ mensagem: 'Erro ao registrar despesa' }, { status: 500 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})

/**
 * PATCH /api/admin/pdde?despesa=<uuid>
 *
 * Cancela uma despesa (status='cancelada'). A despesa permanece para
 * auditoria mas deixa de ser contabilizada no executado / saldo.
 */
const cancelarSchema = z.object({
  motivo: z.string().min(5).max(2000),
})

export const PATCH = withAuthModulo(['administrador', 'tecnico', 'escola'], 'semed', async (request, usuario) => {
  const id = new URL(request.url).searchParams.get('despesa')
  if (!id) return NextResponse.json({ mensagem: 'Informe ?despesa=' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = cancelarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  // Verifica status atual
  const r = await pool.query(
    `SELECT status, valor FROM pdde_despesas WHERE id = $1`,
    [id]
  )
  if (!r.rows[0]) return NextResponse.json({ mensagem: 'Despesa não encontrada' }, { status: 404 })
  if (r.rows[0].status === 'cancelada') {
    return NextResponse.json({ mensagem: 'Despesa já está cancelada' }, { status: 409 })
  }

  await pool.query(
    `UPDATE pdde_despesas
       SET status = 'cancelada',
           observacoes = COALESCE(observacoes, '') || $2
     WHERE id = $1`,
    [id, `\n[cancelada por admin] ${parsed.data.motivo}`]
  )

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: 'PDDE_CANCELAR_DESPESA',
    entidade: 'pdde_despesas',
    entidadeId: id,
    detalhes: { motivo: parsed.data.motivo, valor: r.rows[0].valor },
  })

  return NextResponse.json({ mensagem: 'Despesa cancelada — saldo recalculado' })
})
