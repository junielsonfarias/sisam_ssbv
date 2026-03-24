// SISAM - API de Histórico de Divergências
// GET: Lista histórico de correções

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { limparHistoricoAntigo } from '@/lib/divergencias/corretores'
import {
  parseSearchParams, parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  createWhereBuilder, addCondition, buildWhereString, buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/divergencias/historico
 * Lista histórico de correções de divergências
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Acesso não autorizado. Apenas administradores podem acessar o histórico.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const { tipo, nivel, dataInicio, dataFim } = parseSearchParams(
      searchParams, ['tipo', 'nivel', 'dataInicio', 'dataFim']
    )
    const paginacao = parsePaginacao(searchParams, { limitePadrao: 50, limiteMax: 100 })

    const where = createWhereBuilder()
    addCondition(where, 'tipo', tipo)
    addCondition(where, 'nivel', nivel)
    addCondition(where, 'created_at', dataInicio, '>=')
    addCondition(where, 'created_at', dataFim, '<=')

    const whereClause = buildWhereString(where)

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM divergencias_historico ${whereClause}`,
        where.params
      ),
      pool.query(
        `SELECT * FROM divergencias_historico ${whereClause}
         ORDER BY created_at DESC
         ${buildLimitOffset(paginacao)}`,
        where.params
      ),
    ])

    const count = parseInt(countResult.rows[0]?.total || '0')

    const historico = (dataResult.rows || []).map((item: any) => ({
      id: item.id,
      tipo: item.tipo,
      nivel: item.nivel,
      titulo: item.titulo,
      descricao: item.descricao,
      entidade: item.entidade,
      entidadeId: item.entidade_id,
      entidadeNome: item.entidade_nome,
      dadosAntes: item.dados_antes,
      dadosDepois: item.dados_depois,
      acaoRealizada: item.acao_realizada,
      correcaoAutomatica: item.correcao_automatica,
      usuarioId: item.usuario_id,
      usuarioNome: item.usuario_nome,
      createdAt: item.created_at
    }))

    return NextResponse.json({
      historico,
      paginacao: buildPaginacaoResponse(paginacao, count),
    })

  } catch (error: unknown) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar histórico', erro: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/divergencias/historico
 * Limpa histórico com mais de 30 dias
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Acesso não autorizado.' },
        { status: 403 }
      )
    }

    const resultado = await limparHistoricoAntigo()

    return NextResponse.json({
      mensagem: `${resultado.removidos} registro(s) antigo(s) removido(s)`,
      removidos: resultado.removidos
    })

  } catch (error: unknown) {
    console.error('Erro ao limpar histórico:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao limpar histórico', erro: (error as Error).message },
      { status: 500 }
    )
  }
}
