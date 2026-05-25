/**
 * /api/admin/pnld
 *
 * GET ?recurso=titulos|estoque|distribuicoes — lista o recurso
 * POST ?acao=titulo|entrega|devolucao|estoque — cria/atualiza
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  buscarTitulos,
  cadastrarTitulo,
  listarEstoqueEscola,
  listarDistribuicoesAluno,
  atualizarEstoque,
  registrarEntrega,
  registrarDevolucao,
} from '@/lib/services/pnld.service'

export const dynamic = 'force-dynamic'

const tituloSchema = z.object({
  isbn: z.string().max(20).optional(),
  codigo_pnld: z.string().max(20).optional(),
  titulo: z.string().min(1).max(500),
  autor: z.string().max(255).optional(),
  editora: z.string().max(255).optional(),
  edicao: z.string().max(20).optional(),
  ano_pnld: z.number().int().min(2000).max(2100),
  componente_id: z.string().max(30).optional(),
  ano_escolar: z.number().int().min(1).max(9).optional(),
  tipo_obra: z.enum(['livro_aluno', 'manual_professor', 'caderno_atividades',
    'literatura', 'dicionario', 'paradidatico', 'outro']),
  observacoes: z.string().max(2000).optional(),
})

const estoqueSchema = z.object({
  escola_id: z.string().uuid(),
  titulo_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  qtd_total: z.number().int().min(0).max(100000),
  qtd_disponivel: z.number().int().min(0).optional(),
  qtd_danificada: z.number().int().min(0).optional(),
  qtd_extraviada: z.number().int().min(0).optional(),
})

const entregaSchema = z.object({
  aluno_id: z.string().uuid(),
  titulo_id: z.string().uuid(),
  ano_letivo: z.string().regex(/^\d{4}$/),
  numero_tombamento: z.string().max(50).optional(),
  data_devolucao_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const devolucaoSchema = z.object({
  distribuicao_id: z.string().uuid(),
  status: z.enum(['devolvido', 'extraviado', 'danificado']),
  observacoes: z.string().max(2000).optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'titulos'

  switch (recurso) {
    case 'titulos': {
      const dados = await buscarTitulos({
        busca: searchParams.get('busca') || undefined,
        componenteId: searchParams.get('componente') || undefined,
        anoEscolar: searchParams.get('ano') ? parseInt(searchParams.get('ano')!, 10) : undefined,
        anoPnld: searchParams.get('ano_pnld') ? parseInt(searchParams.get('ano_pnld')!, 10) : undefined,
      })
      return NextResponse.json({ titulos: dados })
    }
    case 'estoque': {
      const escola = searchParams.get('escola')
      const ano = searchParams.get('ano_letivo')
      if (!escola || !ano) {
        return NextResponse.json({ mensagem: 'Informe ?escola=&ano_letivo=' }, { status: 400 })
      }
      const dados = await listarEstoqueEscola(escola, ano)
      return NextResponse.json({ estoque: dados })
    }
    case 'distribuicoes': {
      const aluno = searchParams.get('aluno')
      if (!aluno) return NextResponse.json({ mensagem: 'Informe ?aluno=' }, { status: 400 })
      const dados = await listarDistribuicoesAluno(aluno, searchParams.get('ano_letivo') || undefined)
      return NextResponse.json({ distribuicoes: dados })
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
    case 'titulo': {
      const parsed = tituloSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const id = await cadastrarTitulo(parsed.data)

      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'PNLD_CADASTRAR_TITULO',
        entidade: 'pnld_titulos',
        entidadeId: id,
        detalhes: {
          titulo: parsed.data.titulo,
          codigo_pnld: parsed.data.codigo_pnld,
          ano_pnld: parsed.data.ano_pnld,
          tipo_obra: parsed.data.tipo_obra,
          ano_escolar: parsed.data.ano_escolar,
        },
      })

      return NextResponse.json({ id, mensagem: 'Título cadastrado' }, { status: 201 })
    }
    case 'estoque': {
      const parsed = estoqueSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        await atualizarEstoque(parsed.data)

        // TCE — alterações de inventário público têm peso patrimonial
        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PNLD_ATUALIZAR_ESTOQUE',
          entidade: 'pnld_estoque_escola',
          entidadeId: parsed.data.titulo_id,
          detalhes: {
            escola_id: parsed.data.escola_id,
            titulo_id: parsed.data.titulo_id,
            ano_letivo: parsed.data.ano_letivo,
            qtd_total: parsed.data.qtd_total,
            qtd_danificada: parsed.data.qtd_danificada,
            qtd_extraviada: parsed.data.qtd_extraviada,
          },
        })

        return NextResponse.json({ mensagem: 'Estoque atualizado' })
      } catch (e) {
        const msg = (e as Error).message || ''
        if (msg.startsWith('Quantidade total')) {
          return NextResponse.json({ mensagem: msg }, { status: 409 })
        }
        return NextResponse.json({ mensagem: 'Erro ao atualizar estoque' }, { status: 500 })
      }
    }
    case 'entrega': {
      const parsed = entregaSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await registrarEntrega({ ...parsed.data, entregue_por: usuario.id })

        // LGPD — vínculo bem público a menor (livro didático ao aluno)
        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PNLD_ENTREGAR_LIVRO',
          entidade: 'pnld_distribuicao_aluno',
          entidadeId: id,
          detalhes: {
            aluno_id: parsed.data.aluno_id,
            titulo_id: parsed.data.titulo_id,
            ano_letivo: parsed.data.ano_letivo,
            numero_tombamento: parsed.data.numero_tombamento,
          },
        })

        return NextResponse.json({ id, mensagem: 'Entrega registrada' }, { status: 201 })
      } catch (e) {
        const msg = (e as Error).message || ''
        if (msg.startsWith('Livro indisponível') || msg.startsWith('Aluno não encontrado')) {
          return NextResponse.json({ mensagem: msg }, { status: 409 })
        }
        return NextResponse.json({ mensagem: 'Erro ao registrar entrega' }, { status: 500 })
      }
    }
    case 'devolucao': {
      const parsed = devolucaoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        await registrarDevolucao({ ...parsed.data, recebido_por: usuario.id })

        // Ação específica para extravio/dano — peso patrimonial e responsabilização
        const acao = parsed.data.status === 'extraviado' ? 'PNLD_EXTRAVIADO'
          : parsed.data.status === 'danificado' ? 'PNLD_DANIFICADO'
          : 'PNLD_DEVOLVER_LIVRO'

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao,
          entidade: 'pnld_distribuicao_aluno',
          entidadeId: parsed.data.distribuicao_id,
          detalhes: {
            status_final: parsed.data.status,
            observacoes: parsed.data.observacoes,
          },
        })

        return NextResponse.json({ mensagem: 'Devolução registrada' })
      } catch (e) {
        const msg = (e as Error).message || ''
        if (msg.startsWith('Distribuição ')) {
          return NextResponse.json({ mensagem: msg }, { status: 409 })
        }
        return NextResponse.json({ mensagem: 'Erro ao registrar devolução' }, { status: 500 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
