/**
 * /api/admin/patrimonio
 *
 * GET ?recurso=bens|bem|historico|inventario
 * POST ?acao=bem|movimentacao
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
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
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      const id = await cadastrarBem(parsed.data)
      return NextResponse.json({ id, mensagem: 'Bem cadastrado' }, { status: 201 })
    }
    case 'movimentacao': {
      const parsed = movSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      try {
        const id = await registrarMovimentacao({ ...parsed.data, registrado_por: usuario.id })
        return NextResponse.json({ id, mensagem: 'Movimentação registrada' }, { status: 201 })
      } catch (e) {
        return NextResponse.json({ mensagem: (e as Error).message }, { status: 409 })
      }
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
