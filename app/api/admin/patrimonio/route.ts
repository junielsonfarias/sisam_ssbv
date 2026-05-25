/**
 * /api/admin/patrimonio
 *
 * GET ?recurso=bens|bem|historico|inventario
 * POST ?acao=bem|movimentacao
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  buscarBemPorTombo,
  cadastrarBem,
  historicoBem,
  inventarioEscola,
  listarBens,
  registrarMovimentacao,
} from '@/lib/services/patrimonio.service'

export const dynamic = 'force-dynamic'

const CATEGORIAS = ['mobiliario', 'eletronico', 'didatico', 'esportivo',
  'veiculo', 'imovel', 'equipamento_cozinha', 'eletrodomestico',
  'instrumento_musical', 'biblioteca', 'outro'] as const

const ESTADOS = ['novo', 'bom', 'regular', 'ruim', 'inservivel'] as const

const bemSchema = z.object({
  tombo: z.string().min(1).max(30),
  descricao: z.string().min(2).max(500),
  categoria: z.enum(CATEGORIAS),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  numero_serie: z.string().max(100).optional(),
  valor_aquisicao: z.number().nonnegative().optional(),
  data_aquisicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  origem: z.enum(['compra', 'doacao', 'transferencia', 'cessao', 'outro']).optional(),
  documento_origem: z.string().max(255).optional(),
  escola_id: z.string().uuid().nullable().optional(),
  sala_localizacao: z.string().max(255).optional(),
  estado_conservacao: z.enum(ESTADOS).optional(),
  observacoes: z.string().max(2000).optional(),
  foto_url: z.string().url().optional(),
})

const movSchema = z.object({
  bem_id: z.string().uuid(),
  tipo: z.enum(['transferencia', 'manutencao_envio', 'manutencao_retorno',
    'baixa', 'reativacao', 'mudanca_estado_conservacao']),
  escola_origem_id: z.string().uuid().nullable().optional(),
  escola_destino_id: z.string().uuid().nullable().optional(),
  sala_origem: z.string().max(255).optional(),
  sala_destino: z.string().max(255).optional(),
  estado_anterior: z.enum(ESTADOS).optional(),
  estado_novo: z.enum(ESTADOS).optional(),
  motivo: z.string().min(5).max(2000),
  documento_url: z.string().url().optional(),
  realizado_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'bens'

  switch (recurso) {
    case 'bens': {
      const dados = await listarBens({
        escolaId: searchParams.get('escola') || undefined,
        categoria: searchParams.get('categoria') as any || undefined,
        status: searchParams.get('status') as any || undefined,
        busca: searchParams.get('busca') || undefined,
        limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
      })
      return NextResponse.json({ bens: dados })
    }
    case 'bem': {
      const tombo = searchParams.get('tombo')
      if (!tombo) return NextResponse.json({ mensagem: 'Informe ?tombo=' }, { status: 400 })
      const dado = await buscarBemPorTombo(tombo)
      if (!dado) return NextResponse.json({ mensagem: 'Não encontrado' }, { status: 404 })
      return NextResponse.json({ bem: dado })
    }
    case 'historico': {
      const bem = searchParams.get('bem')
      if (!bem) return NextResponse.json({ mensagem: 'Informe ?bem=' }, { status: 400 })
      const dados = await historicoBem(bem)
      return NextResponse.json({ movimentacoes: dados })
    }
    case 'inventario': {
      const escola = searchParams.get('escola')
      if (!escola) return NextResponse.json({ mensagem: 'Informe ?escola=' }, { status: 400 })
      const dados = await inventarioEscola(escola)
      return NextResponse.json({ inventario: dados })
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
    case 'bem': {
      const parsed = bemSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await cadastrarBem(parsed.data)

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: 'PATRIMONIO_CADASTRAR_BEM',
          entidade: 'patrimonio_bens',
          entidadeId: id,
          detalhes: {
            tombo: parsed.data.tombo,
            descricao: parsed.data.descricao,
            categoria: parsed.data.categoria,
            valor_aquisicao: parsed.data.valor_aquisicao,
            escola_id: parsed.data.escola_id,
            origem: parsed.data.origem,
          },
        })

        return NextResponse.json({ id, mensagem: 'Bem cadastrado' }, { status: 201 })
      } catch (e) {
        if ((e as { code?: string }).code === '23505') {
          return NextResponse.json({ mensagem: 'Já existe bem com este tombo' }, { status: 409 })
        }
        throw e
      }
    }
    case 'movimentacao': {
      const parsed = movSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      try {
        const id = await registrarMovimentacao({ ...parsed.data, registrado_por: usuario.id })

        // Ação específica por tipo (baixa e transferência têm peso patrimonial maior)
        const acaoPorTipo: Record<string, string> = {
          transferencia: 'PATRIMONIO_TRANSFERIR',
          manutencao_envio: 'PATRIMONIO_ENVIAR_MANUTENCAO',
          manutencao_retorno: 'PATRIMONIO_RETORNAR_MANUTENCAO',
          baixa: 'PATRIMONIO_BAIXAR',
          reativacao: 'PATRIMONIO_REATIVAR',
          mudanca_estado_conservacao: 'PATRIMONIO_MUDAR_ESTADO',
        }
        const acao = acaoPorTipo[parsed.data.tipo] || 'PATRIMONIO_MOVIMENTAR'

        await registrarAuditoria({
          usuarioId: usuario.id,
          acao,
          entidade: 'patrimonio_bens',
          entidadeId: parsed.data.bem_id,
          detalhes: {
            tipo: parsed.data.tipo,
            escola_origem_id: parsed.data.escola_origem_id,
            escola_destino_id: parsed.data.escola_destino_id,
            sala_origem: parsed.data.sala_origem,
            sala_destino: parsed.data.sala_destino,
            estado_anterior: parsed.data.estado_anterior,
            estado_novo: parsed.data.estado_novo,
            motivo: parsed.data.motivo,
            movimentacao_id: id,
          },
        })

        return NextResponse.json({ id, mensagem: 'Movimentação registrada' }, { status: 201 })
      } catch (e) {
        const msg = (e as Error).message || ''
        // Erros conhecidos do service (validações de negócio)
        if (msg.startsWith('Bem ') || msg.startsWith('Escola ')) {
          return NextResponse.json({ mensagem: msg }, { status: 409 })
        }
        return NextResponse.json({ mensagem: 'Erro ao registrar movimentação' }, { status: 500 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
