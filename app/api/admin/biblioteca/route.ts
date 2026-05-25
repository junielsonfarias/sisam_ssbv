/**
 * /api/admin/biblioteca
 *
 * GET ?recurso=acervo|emprestimos
 * POST ?acao=acervo|emprestimo|devolucao|renovar|reservar
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  buscarAcervo,
  cadastrarItem,
  listarEmprestimosAtivos,
  registrarDevolucao,
  registrarEmprestimo,
  renovarEmprestimo,
  reservarItem,
} from '@/lib/services/biblioteca.service'

export const dynamic = 'force-dynamic'

const itemSchema = z.object({
  isbn: z.string().max(20).optional(),
  titulo: z.string().min(1).max(500),
  autor: z.string().max(255).optional(),
  editora: z.string().max(255).optional(),
  edicao: z.string().max(20).optional(),
  ano_publicacao: z.number().int().min(1000).max(2100).optional(),
  classificacao: z.string().max(50).optional(),
  categoria: z.string().max(50).optional(),
  genero: z.string().max(50).optional(),
  escola_id: z.string().uuid().optional(),
  qtd_total: z.number().int().min(1).max(10000).optional(),
  qtd_disponivel: z.number().int().min(0).optional(),
  estante: z.string().max(50).optional(),
  prateleira: z.string().max(50).optional(),
  observacoes: z.string().max(2000).optional(),
})

const emprestimoSchema = z.object({
  acervo_id: z.string().uuid(),
  aluno_id: z.string().uuid().optional(),
  servidor_id: z.string().uuid().optional(),
  dias_emprestimo: z.number().int().min(1).max(60).optional(),
})

const devolucaoSchema = z.object({
  emprestimo_id: z.string().uuid(),
  status: z.enum(['devolvido', 'extraviado', 'danificado']).optional(),
  observacoes: z.string().max(2000).optional(),
})

const reservaSchema = z.object({
  acervo_id: z.string().uuid(),
  aluno_id: z.string().uuid().optional(),
  servidor_id: z.string().uuid().optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo', 'professor', 'responsavel'], async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'acervo'

  switch (recurso) {
    case 'acervo': {
      const dados = await buscarAcervo({
        escolaId: searchParams.get('escola') || undefined,
        busca: searchParams.get('busca') || undefined,
        categoria: searchParams.get('categoria') || undefined,
        apenasDisponiveis: searchParams.get('disponivel') === 'true',
        limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
      })
      return NextResponse.json({ acervo: dados })
    }
    case 'emprestimos': {
      const dados = await listarEmprestimosAtivos({
        escolaId: searchParams.get('escola') || undefined,
        atrasados: searchParams.get('atrasados') === 'true',
        pessoa_id: searchParams.get('pessoa') || undefined,
      })
      return NextResponse.json({ emprestimos: dados })
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})

export const POST = withAuth(['administrador', 'tecnico', 'escola', 'professor'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'acervo': {
      const parsed = itemSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      const id = await cadastrarItem(parsed.data)
      return NextResponse.json({ id, mensagem: 'Item cadastrado' }, { status: 201 })
    }
    case 'emprestimo': {
      const parsed = emprestimoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      try {
        const id = await registrarEmprestimo({ ...parsed.data, registrado_por: usuario.id })
        return NextResponse.json({ id, mensagem: 'Empréstimo registrado' }, { status: 201 })
      } catch (e) {
        return NextResponse.json({ mensagem: (e as Error).message }, { status: 409 })
      }
    }
    case 'devolucao': {
      const parsed = devolucaoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      try {
        await registrarDevolucao(parsed.data)
        return NextResponse.json({ mensagem: 'Devolução registrada' })
      } catch (e) {
        return NextResponse.json({ mensagem: (e as Error).message }, { status: 409 })
      }
    }
    case 'renovar': {
      const id = body?.emprestimo_id
      if (!id) return NextResponse.json({ mensagem: 'Informe emprestimo_id' }, { status: 400 })
      const ok = await renovarEmprestimo(id)
      if (!ok) return NextResponse.json({ mensagem: 'Não foi possível renovar (limite atingido ou empréstimo finalizado)' }, { status: 409 })
      return NextResponse.json({ mensagem: 'Renovado por mais 7 dias' })
    }
    case 'reservar': {
      const parsed = reservaSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      try {
        const id = await reservarItem(parsed.data)
        return NextResponse.json({ id, mensagem: 'Reserva criada' }, { status: 201 })
      } catch (e) {
        return NextResponse.json({ mensagem: (e as Error).message }, { status: 400 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
