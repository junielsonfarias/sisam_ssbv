// SISAM - API de Histórico de Divergências
// GET: Lista histórico de correções

import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { limparHistoricoAntigo } from '@/lib/divergencias/corretores'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/divergencias/historico
 * Lista histórico de correções de divergências
 *
 * Query params:
 *   - pagina: número da página (default: 1)
 *   - limite: itens por página (default: 50)
 *   - tipo: filtrar por tipo de divergência
 *   - nivel: filtrar por nível
 *   - dataInicio: data inicial (ISO string)
 *   - dataFim: data final (ISO string)
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

    const { searchParams } = new URL(request.url)
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const limite = Math.min(parseInt(searchParams.get('limite') || '50'), 100)
    const tipo = searchParams.get('tipo')
    const nivel = searchParams.get('nivel')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    // Construir query com filtros
    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (tipo) {
      whereConditions.push(`tipo = $${paramIndex++}`)
      params.push(tipo)
    }

    if (nivel) {
      whereConditions.push(`nivel = $${paramIndex++}`)
      params.push(nivel)
    }

    if (dataInicio) {
      whereConditions.push(`created_at >= $${paramIndex++}`)
      params.push(dataInicio)
    }

    if (dataFim) {
      whereConditions.push(`created_at <= $${paramIndex++}`)
      params.push(dataFim)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Paginação
    const offset = (pagina - 1) * limite

    // Buscar total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM divergencias_historico ${whereClause}`,
      params
    )
    const count = parseInt(countResult.rows[0]?.total || '0')

    // Buscar dados
    const dataResult = await pool.query(
      `SELECT * FROM divergencias_historico ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limite, offset]
    )

    // Formatar dados para retorno
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

    const totalPaginas = Math.ceil(count / limite)

    return NextResponse.json({
      historico,
      paginacao: {
        pagina,
        limite,
        total: count,
        totalPaginas,
        temProxima: pagina < totalPaginas,
        temAnterior: pagina > 1
      }
    })

  } catch (error: any) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar histórico', erro: error.message },
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

  } catch (error: any) {
    console.error('Erro ao limpar histórico:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao limpar histórico', erro: error.message },
      { status: 500 }
    )
  }
}
