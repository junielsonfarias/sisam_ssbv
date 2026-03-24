import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { parseBoolParam, parseIntParam, parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, notificacaoMarcarLidaSchema, notificacaoGerarSchema } from '@/lib/schemas'
import { buscarNotificacoes, marcarComoLidas, gerarNotificacoesAutomaticas } from '@/lib/services/notificacoes.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const { tipo } = parseSearchParams(searchParams, ['tipo'])
    const apenasNaoLidas = parseBoolParam(searchParams, 'apenas_nao_lidas')
    const limite = parseIntParam(searchParams, 'limite', 50)

    const result = await buscarNotificacoes(usuario, { tipo, apenasNaoLidas, limite })

    return NextResponse.json(result)

  } catch (error: unknown) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Marcar como lida
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, notificacaoMarcarLidaSchema)
    if (!validacao.success) return validacao.response
    const { ids, marcar_todas } = validacao.data

    if (!marcar_todas && (!ids || ids.length === 0)) {
      return NextResponse.json({ mensagem: 'ids é obrigatório' }, { status: 400 })
    }

    const result = await marcarComoLidas(usuario, ids, marcar_todas)

    return NextResponse.json(result)

  } catch (error: unknown) {
    console.error('Erro ao marcar notificações:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Gerar notificações automáticas
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, notificacaoGerarSchema)
    if (!validacao.success) return validacao.response
    const { tipo_geracao, ano_letivo } = validacao.data
    const ano = ano_letivo || new Date().getFullYear().toString()

    const result = await gerarNotificacoesAutomaticas(tipo_geracao, ano)

    return NextResponse.json(result)

  } catch (error: unknown) {
    console.error('Erro ao gerar notificações:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
