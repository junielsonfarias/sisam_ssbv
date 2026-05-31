/**
 * /api/admin/ordens-servico
 *
 * GET ?recurso=lista|detalhe|estatisticas
 * POST ?acao=abrir|atualizar_status|comentar|avaliar
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  abrirOrdem,
  adicionarComentario,
  atualizarStatus,
  avaliarServico,
  buscarOrdem,
  estatisticas,
  listarOrdens,
} from '@/lib/services/ordens-servico.service'

export const dynamic = 'force-dynamic'

const TIPOS = ['predial', 'eletrica', 'hidraulica', 'mobiliario',
  'ti', 'rede_internet', 'limpeza', 'jardinagem',
  'pintura', 'estrutural', 'merenda_equip', 'outros'] as const

const STATUS = ['aberta', 'em_analise', 'aprovada', 'em_atendimento',
  'aguardando_material', 'aguardando_terceiros',
  'concluida', 'cancelada', 'reaberta'] as const

const abrirSchema = z.object({
  escola_id: z.string().uuid(),
  tipo: z.enum(TIPOS),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']).optional(),
  titulo: z.string().min(5).max(255),
  descricao: z.string().min(10).max(5000),
  local_escola: z.string().max(255).optional(),
  fotos_urls: z.array(z.string().url()).max(10).optional(),
})

const statusSchema = z.object({
  ordem_id: z.string().uuid(),
  novo_status: z.enum(STATUS),
  comentario: z.string().min(5).max(2000),
  responsavel_id: z.string().uuid().optional(),
  prevista_para: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  custo_estimado: z.number().nonnegative().optional(),
  custo_real: z.number().nonnegative().optional(),
})

const comentarioSchema = z.object({
  ordem_id: z.string().uuid(),
  texto: z.string().min(2).max(5000),
  anexos_urls: z.array(z.string().url()).max(5).optional(),
})

const avaliacaoSchema = z.object({
  ordem_id: z.string().uuid(),
  estrelas: z.number().int().min(1).max(5),
  comentario: z.string().max(2000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'lista'

  switch (recurso) {
    case 'lista': {
      const dados = await listarOrdens({
        escolaId: searchParams.get('escola') || undefined,
        status: searchParams.get('status') as any || undefined,
        tipo: searchParams.get('tipo') as any || undefined,
        prioridade: searchParams.get('prioridade') as any || undefined,
        apenasAbertas: searchParams.get('apenas_abertas') === 'true',
        limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
      })
      return NextResponse.json({ ordens: dados })
    }
    case 'detalhe': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })
      const dado = await buscarOrdem(id)
      if (!dado) return NextResponse.json({ mensagem: 'Não encontrada' }, { status: 404 })
      return NextResponse.json({ ordem: dado })
    }
    case 'estatisticas': {
      const dados = await estatisticas(searchParams.get('escola') || undefined)
      return NextResponse.json({ estatisticas: dados })
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})

export const POST = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'abrir': {
      const parsed = abrirSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const r = await abrirOrdem({ ...parsed.data, aberta_por: usuario.id })

      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'OS_ABRIR',
        entidade: 'ordens_servico',
        entidadeId: r.id,
        detalhes: {
          numero: r.numero,
          escola_id: parsed.data.escola_id,
          tipo: parsed.data.tipo,
          prioridade: parsed.data.prioridade ?? 'media',
          titulo: parsed.data.titulo,
        },
      })

      return NextResponse.json({ ...r, mensagem: 'Ordem aberta' }, { status: 201 })
    }
    case 'atualizar_status': {
      const parsed = statusSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })

      try {
        // Service retorna statusAnterior + numero (lidos dentro da transação com FOR UPDATE)
        const { statusAnterior, numero } = await atualizarStatus({ ...parsed.data, autor_id: usuario.id })

        // Auditoria — ação específica para mudanças críticas (concluida/cancelada/reaberta)
        let acao = 'OS_ATUALIZAR_STATUS'
        if (parsed.data.novo_status === 'concluida') acao = 'OS_CONCLUIR'
        else if (parsed.data.novo_status === 'cancelada') acao = 'OS_CANCELAR'
        else if (parsed.data.novo_status === 'reaberta') acao = 'OS_REABRIR'
        else if (parsed.data.novo_status === 'aprovada') acao = 'OS_APROVAR'

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao,
          entidade: 'ordens_servico',
          entidadeId: parsed.data.ordem_id,
          detalhes: {
            numero,
            de: statusAnterior,
            para: parsed.data.novo_status,
            custo_real: parsed.data.custo_real,
            responsavel_id: parsed.data.responsavel_id,
          },
        })

        return NextResponse.json({ mensagem: 'Status atualizado' })
      } catch (e) {
        const msg = (e as Error).message || ''
        if (msg.startsWith('Transição inválida') || msg === 'Ordem não encontrada') {
          return NextResponse.json({ mensagem: msg }, { status: 409 })
        }
        return NextResponse.json({ mensagem: 'Erro ao atualizar status' }, { status: 500 })
      }
    }
    case 'comentar': {
      const parsed = comentarioSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const id = await adicionarComentario({ ...parsed.data, autor_id: usuario.id })
      return NextResponse.json({ id, mensagem: 'Comentário adicionado' }, { status: 201 })
    }
    case 'avaliar': {
      const parsed = avaliacaoSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const ok = await avaliarServico(parsed.data)
        if (!ok) return NextResponse.json({ mensagem: 'Ordem não concluída ou não encontrada' }, { status: 404 })

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'OS_AVALIAR',
          entidade: 'ordens_servico',
          entidadeId: parsed.data.ordem_id,
          detalhes: {
            estrelas: parsed.data.estrelas,
            comentario: parsed.data.comentario,
          },
        })

        return NextResponse.json({ mensagem: 'Avaliação registrada' })
      } catch (e) {
        return NextResponse.json({ mensagem: (e as Error).message }, { status: 400 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
