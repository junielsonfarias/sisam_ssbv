import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest, serieEscolaPostSchema } from '@/lib/schemas'
import pool from '@/database/connection'
import { cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('EscolaSeries')

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

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
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
  } catch (error: unknown) {
    log.error('Erro ao buscar séries da escola', error)
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

    const validacao = await validateRequest(request, serieEscolaPostSchema)
    if (!validacao.success) return validacao.response
    const { serie, ano_letivo } = validacao.data

    // Verificar se escola existe
    const escolaCheck = await pool.query('SELECT id FROM escolas WHERE id = $1 AND ativo = true', [escolaId])
    if (escolaCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Escola não encontrada' }, { status: 404 })
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

    try { await cacheDelPattern('escolas:*') } catch {}
    try { await cacheDelPattern('series:*') } catch {}

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    log.error('Erro ao vincular série à escola', error)
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

    try { await cacheDelPattern('escolas:*') } catch {}
    try { await cacheDelPattern('series:*') } catch {}

    return NextResponse.json({
      mensagem: 'Série removida com sucesso',
      serie: result.rows[0]
    })
  } catch (error: unknown) {
    log.error('Erro ao remover série da escola', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
