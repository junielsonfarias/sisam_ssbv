import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { parseBoolParam, parseIntParam, parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, notificacaoMarcarLidaSchema, notificacaoGerarSchema } from '@/lib/schemas'
import { buscarNotificacoes, marcarComoLidas, gerarNotificacoesAutomaticas } from '@/lib/services/notificacoes.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminNotificacoes')

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { tipo } = parseSearchParams(searchParams, ['tipo'])
    const apenasNaoLidas = parseBoolParam(searchParams, 'apenas_nao_lidas')
    const limite = parseIntParam(searchParams, 'limite', 50)

    const result = await buscarNotificacoes(usuario, { tipo, apenasNaoLidas, limite })

    return NextResponse.json(result)

  } catch (error: unknown) {
    log.error('Erro ao buscar notificações', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

// Marcar como lida
export const PUT = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, notificacaoMarcarLidaSchema)
    if (!validacao.success) return validacao.response
    const { ids, marcar_todas } = validacao.data

    if (!marcar_todas && (!ids || ids.length === 0)) {
      return NextResponse.json({ mensagem: 'ids é obrigatório' }, { status: 400 })
    }

    const result = await marcarComoLidas(usuario, ids, marcar_todas)

    return NextResponse.json(result)

  } catch (error: unknown) {
    log.error('Erro ao marcar notificações', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

// Gerar notificações automáticas
export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, notificacaoGerarSchema)
    if (!validacao.success) return validacao.response
    const { tipo_geracao, ano_letivo } = validacao.data
    const ano = ano_letivo || new Date().getFullYear().toString()

    const result = await gerarNotificacoesAutomaticas(tipo_geracao, ano)

    return NextResponse.json(result)

  } catch (error: unknown) {
    log.error('Erro ao gerar notificações', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
