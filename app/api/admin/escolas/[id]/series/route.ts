import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/escolas/[id]/series
 * Retorna séries vinculadas a uma escola
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const escolaId = params.id
    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    const result = await pool.query(
      `SELECT se.*, cs.nome_serie, cs.tipo_ensino, cs.media_aprovacao, cs.max_dependencias
       FROM series_escola se
       LEFT JOIN configuracao_series cs ON cs.serie = se.serie
       WHERE se.escola_id = $1 AND se.ano_letivo = $2
       ORDER BY se.serie::int`,
      [escolaId, anoLetivo]
    )

    return NextResponse.json({
      series: result.rows,
      total: result.rows.length
    })
  } catch (error: any) {
    console.error('Erro ao buscar séries da escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/escolas/[id]/series
 * Vincula uma série a uma escola
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const escolaId = params.id
    const { serie, ano_letivo } = await request.json()

    if (!serie || !ano_letivo) {
      return NextResponse.json(
        { mensagem: 'Campos obrigatórios: serie, ano_letivo' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `INSERT INTO series_escola (escola_id, serie, ano_letivo)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [escolaId, serie, ano_letivo]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Série já vinculada a esta escola' },
        { status: 200 }
      )
    }

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Erro ao vincular série à escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/escolas/[id]/series
 * Remove uma série de uma escola
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const escolaId = params.id
    const { searchParams } = new URL(request.url)
    const serie = searchParams.get('serie')
    const anoLetivo = searchParams.get('ano_letivo')

    if (!serie || !anoLetivo) {
      return NextResponse.json(
        { mensagem: 'Parâmetros obrigatórios: serie, ano_letivo' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      `DELETE FROM series_escola
       WHERE escola_id = $1 AND serie = $2 AND ano_letivo = $3
       RETURNING *`,
      [escolaId, serie, anoLetivo]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Série não encontrada para esta escola' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      mensagem: 'Série removida com sucesso',
      serie: result.rows[0]
    })
  } catch (error: any) {
    console.error('Erro ao remover série da escola:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
