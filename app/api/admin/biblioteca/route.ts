/**
 * /api/admin/biblioteca
 *
 * GET ?recurso=acervo|emprestimos
 * POST ?acao=acervo|emprestimo|devolucao|renovar|reservar
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
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

// CHECK constraint do DB exige um destes valores (add-biblioteca.sql)
const CATEGORIAS_BIBLIOTECA = [
  'literatura_infantil', 'literatura_juvenil', 'literatura_adulta',
  'didatico', 'paradidatico', 'tecnico', 'referencia',
  'dicionario', 'enciclopedia', 'periodico', 'outro',
] as const

const itemSchema = z.object({
  isbn: z.string().max(20).optional(),
  titulo: z.string().min(1).max(500),
  autor: z.string().max(255).optional(),
  editora: z.string().max(255).optional(),
  edicao: z.string().max(20).optional(),
  ano_publicacao: z.number().int().min(1000).max(2100).optional(),
  classificacao: z.string().max(50).optional(),
  categoria: z.enum(CATEGORIAS_BIBLIOTECA).optional(),
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

/** Mensagens conhecidas lançadas pelos services — seguras para expor ao cliente */
const ERROS_NEGOCIO = [
  'Informe exatamente um: aluno_id OU servidor_id',
  'Item indisponível para empréstimo',
  'Empréstimo não encontrado',
  'Empréstimo já finalizado',
  'Aluno não encontrado',
  'Item não encontrado',
  'Já existe reserva ativa',
]

function tratarErroBiblioteca(e: unknown) {
  const msg = (e as Error).message || ''
  if (ERROS_NEGOCIO.some((m) => msg.startsWith(m))) {
    return NextResponse.json({ mensagem: msg }, { status: 409 })
  }
  // Erros não esperados (DB, FK, deadlock) — não vazar
  return NextResponse.json({ mensagem: 'Erro ao processar operação' }, { status: 500 })
}

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo', 'professor', 'responsavel'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'acervo'

  // Escopo: escola/professor só a própria escola; polo valida a informada
  let escolaId = searchParams.get('escola') || undefined
  if (usuario.tipo_usuario === 'escola' || usuario.tipo_usuario === 'professor') {
    escolaId = usuario.escola_id || '00000000-0000-0000-0000-000000000000'
  } else if (usuario.tipo_usuario === 'polo' && escolaId && !(await podeAcessarEscola(usuario, escolaId))) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }

  switch (recurso) {
    case 'acervo': {
      const dados = await buscarAcervo({
        escolaId,
        busca: searchParams.get('busca') || undefined,
        categoria: searchParams.get('categoria') || undefined,
        apenasDisponiveis: searchParams.get('disponivel') === 'true',
        limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
      })
      return NextResponse.json({ acervo: dados })
    }
    case 'emprestimos': {
      const dados = await listarEmprestimosAtivos({
        escolaId,
        atrasados: searchParams.get('atrasados') === 'true',
        pessoa_id: searchParams.get('pessoa') || undefined,
      })
      return NextResponse.json({ emprestimos: dados })
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola', 'professor'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'acervo': {
      const parsed = itemSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const id = await cadastrarItem(parsed.data)

      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'BIBLIOTECA_CADASTRAR_ITEM',
        entidade: 'biblioteca_acervo',
        entidadeId: id,
        detalhes: {
          titulo: parsed.data.titulo,
          isbn: parsed.data.isbn,
          categoria: parsed.data.categoria,
          escola_id: parsed.data.escola_id,
          qtd_total: parsed.data.qtd_total,
        },
      })

      return NextResponse.json({ id, mensagem: 'Item cadastrado' }, { status: 201 })
    }
    case 'emprestimo': {
      const parsed = emprestimoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await registrarEmprestimo({ ...parsed.data, registrado_por: usuario.id })

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'BIBLIOTECA_EMPRESTAR',
          entidade: 'biblioteca_emprestimos',
          entidadeId: id,
          detalhes: {
            acervo_id: parsed.data.acervo_id,
            aluno_id: parsed.data.aluno_id,
            servidor_id: parsed.data.servidor_id,
            dias_emprestimo: parsed.data.dias_emprestimo,
          },
        })

        return NextResponse.json({ id, mensagem: 'Empréstimo registrado' }, { status: 201 })
      } catch (e) {
        return tratarErroBiblioteca(e)
      }
    }
    case 'devolucao': {
      const parsed = devolucaoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        await registrarDevolucao(parsed.data)

        // Ação específica — extraviado/danificado tem peso patrimonial
        const acao = parsed.data.status === 'extraviado' ? 'BIBLIOTECA_EXTRAVIADO'
          : parsed.data.status === 'danificado' ? 'BIBLIOTECA_DANIFICADO'
          : 'BIBLIOTECA_DEVOLVER'

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao,
          entidade: 'biblioteca_emprestimos',
          entidadeId: parsed.data.emprestimo_id,
          detalhes: {
            status_final: parsed.data.status,
            observacoes: parsed.data.observacoes,
          },
        })

        return NextResponse.json({ mensagem: 'Devolução registrada' })
      } catch (e) {
        return tratarErroBiblioteca(e)
      }
    }
    case 'renovar': {
      const id = body?.emprestimo_id
      if (!id) return NextResponse.json({ mensagem: 'Informe emprestimo_id' }, { status: 400 })
      const ok = await renovarEmprestimo(id)
      if (!ok) return NextResponse.json({ mensagem: 'Não foi possível renovar (limite atingido ou empréstimo finalizado)' }, { status: 409 })

      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'BIBLIOTECA_RENOVAR',
        entidade: 'biblioteca_emprestimos',
        entidadeId: id,
      })

      return NextResponse.json({ mensagem: 'Renovado por mais 7 dias' })
    }
    case 'reservar': {
      const parsed = reservaSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await reservarItem(parsed.data)

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'BIBLIOTECA_RESERVAR',
          entidade: 'biblioteca_reservas',
          entidadeId: id,
          detalhes: {
            acervo_id: parsed.data.acervo_id,
            aluno_id: parsed.data.aluno_id,
            servidor_id: parsed.data.servidor_id,
          },
        })

        return NextResponse.json({ id, mensagem: 'Reserva criada' }, { status: 201 })
      } catch (e) {
        return tratarErroBiblioteca(e)
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
