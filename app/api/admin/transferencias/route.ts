import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// GET - Listar transferências com filtros
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const escolaId = searchParams.get('escola_id')
    const poloId = searchParams.get('polo_id')
    const tipoMovimentacao = searchParams.get('tipo_movimentacao')
    const tipoTransferencia = searchParams.get('tipo_transferencia')
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const limite = parseInt(searchParams.get('limite') || '50')
    const offset = (pagina - 1) * limite

    const params: any[] = []
    const conditions: string[] = ['hs.tipo_movimentacao IS NOT NULL']
    let paramIdx = 1

    // Filtros dinâmicos
    if (dataInicio) {
      conditions.push(`hs.data >= $${paramIdx}`)
      params.push(dataInicio)
      paramIdx++
    }
    if (dataFim) {
      conditions.push(`hs.data <= $${paramIdx}`)
      params.push(dataFim)
      paramIdx++
    }
    if (escolaId) {
      conditions.push(`a.escola_id = $${paramIdx}`)
      params.push(escolaId)
      paramIdx++
    }
    if (poloId) {
      conditions.push(`e.polo_id = $${paramIdx}`)
      params.push(poloId)
      paramIdx++
    }
    if (tipoMovimentacao && ['saida', 'entrada'].includes(tipoMovimentacao)) {
      conditions.push(`hs.tipo_movimentacao = $${paramIdx}`)
      params.push(tipoMovimentacao)
      paramIdx++
    }
    if (tipoTransferencia && ['dentro_municipio', 'fora_municipio'].includes(tipoTransferencia)) {
      conditions.push(`hs.tipo_transferencia = $${paramIdx}`)
      params.push(tipoTransferencia)
      paramIdx++
    }

    // Restrições por permissão
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      conditions.push(`e.polo_id = $${paramIdx}`)
      params.push(usuario.polo_id)
      paramIdx++
    }
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      conditions.push(`a.escola_id = $${paramIdx}`)
      params.push(usuario.escola_id)
      paramIdx++
    }

    const whereClause = conditions.join(' AND ')

    const baseQuery = `
      FROM historico_situacao hs
      INNER JOIN alunos a ON hs.aluno_id = a.id
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN escolas ed ON hs.escola_destino_id = ed.id
      LEFT JOIN escolas eo ON hs.escola_origem_id = eo.id
      WHERE ${whereClause}
    `

    // Query principal com paginação
    const dataQuery = `
      SELECT hs.id, hs.data, hs.tipo_movimentacao, hs.tipo_transferencia,
             hs.observacao, hs.situacao, hs.situacao_anterior,
             hs.escola_destino_nome, hs.escola_origem_nome,
             a.id as aluno_id, a.nome as aluno_nome, a.serie, a.ano_letivo,
             e.nome as escola_nome, e.id as escola_id,
             p.nome as polo_nome, p.id as polo_id,
             ed.nome as escola_destino_ref_nome,
             eo.nome as escola_origem_ref_nome
      ${baseQuery}
      ORDER BY hs.data DESC, hs.criado_em DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `

    // Query de contagem
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`

    // Query de resumo
    const resumoQuery = `
      SELECT
        COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'saida') as total_saidas,
        COUNT(*) FILTER (WHERE hs.tipo_movimentacao = 'entrada') as total_entradas
      ${baseQuery}
    `

    const dataParams = [...params, limite, offset]

    const [dataResult, countResult, resumoResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, params),
      pool.query(resumoQuery, params),
    ])

    const total = parseInt(countResult.rows[0].total)
    const totalPaginas = Math.ceil(total / limite)
    const resumo = resumoResult.rows[0]

    return NextResponse.json({
      transferencias: dataResult.rows,
      resumo: {
        total_saidas: parseInt(resumo.total_saidas) || 0,
        total_entradas: parseInt(resumo.total_entradas) || 0,
        saldo: (parseInt(resumo.total_entradas) || 0) - (parseInt(resumo.total_saidas) || 0),
      },
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas,
        temProxima: pagina < totalPaginas,
        temAnterior: pagina > 1,
      },
    })
  } catch (error: any) {
    console.error('Erro ao buscar transferências:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
