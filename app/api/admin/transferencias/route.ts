import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import {
  parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  parseSearchParams, createWhereBuilder, addCondition, addRawCondition,
  addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// GET - Listar transferências com filtros
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { data_inicio, data_fim, escola_id, polo_id, tipo_movimentacao, tipo_transferencia } = parseSearchParams(
      searchParams, ['data_inicio', 'data_fim', 'escola_id', 'polo_id', 'tipo_movimentacao', 'tipo_transferencia']
    )
    const paginacao = parsePaginacao(searchParams, { limitePadrao: 50 })

    const where = createWhereBuilder()
    addRawCondition(where, 'hs.tipo_movimentacao IS NOT NULL')
    addCondition(where, 'hs.data', data_inicio, '>=')
    addCondition(where, 'hs.data', data_fim, '<=')
    addCondition(where, 'a.escola_id', escola_id)
    addCondition(where, 'e.polo_id', polo_id)

    if (tipo_movimentacao && ['saida', 'entrada'].includes(tipo_movimentacao)) {
      addCondition(where, 'hs.tipo_movimentacao', tipo_movimentacao)
    }
    if (tipo_transferencia && ['dentro_municipio', 'fora_municipio'].includes(tipo_transferencia)) {
      addCondition(where, 'hs.tipo_transferencia', tipo_transferencia)
    }

    addAccessControl(where, usuario, { escolaIdField: 'a.escola_id', poloIdField: 'e.polo_id' })

    const whereClause = `WHERE ${buildConditionsString(where)}`

    const baseQuery = `
      FROM historico_situacao hs
      INNER JOIN alunos a ON hs.aluno_id = a.id
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN escolas ed ON hs.escola_destino_id = ed.id
      LEFT JOIN escolas eo ON hs.escola_origem_id = eo.id
      ${whereClause}
    `

    const [dataResult, countResult, resumoResult] = await Promise.all([
      pool.query(
        `SELECT hs.id, hs.data, hs.tipo_movimentacao, hs.tipo_transferencia,
               hs.observacao, hs.situacao, hs.situacao_anterior,
               hs.escola_destino_nome, hs.escola_origem_nome,
               a.id as aluno_id, a.nome as aluno_nome, a.serie, a.ano_letivo,
               e.nome as escola_nome, e.id as escola_id,
               p.nome as polo_nome, p.id as polo_id,
               ed.nome as escola_destino_ref_nome,
               eo.nome as escola_origem_ref_nome
        ${baseQuery}
        ORDER BY hs.data DESC, hs.criado_em DESC
        ${buildLimitOffset(paginacao)}`,
        where.params
      ),
      pool.query(`SELECT COUNT(*) as total ${baseQuery}`, where.params),
      pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'saida') as total_saidas,
          COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'entrada') as total_entradas
        ${baseQuery}`,
        where.params
      ),
    ])

    const total = parseInt(countResult.rows[0].total)
    const resumo = resumoResult.rows[0]

    return NextResponse.json({
      transferencias: dataResult.rows,
      resumo: {
        total_saidas: parseInt(resumo.total_saidas) || 0,
        total_entradas: parseInt(resumo.total_entradas) || 0,
        saldo: (parseInt(resumo.total_entradas) || 0) - (parseInt(resumo.total_saidas) || 0),
      },
      paginacao: buildPaginacaoResponse(paginacao, total),
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar transferências:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
