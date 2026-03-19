import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/regras-avaliacao
 * Lista todas as regras de avaliacao com o nome do tipo.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const todos = searchParams.get('todos') === 'true'
    const tipoAvaliacaoId = searchParams.get('tipo_avaliacao_id')

    let query = `
      SELECT ra.*,
        ta.nome as tipo_avaliacao_nome,
        ta.codigo as tipo_avaliacao_codigo,
        ta.tipo_resultado,
        (SELECT COUNT(*) FROM series_escolares se WHERE se.regra_avaliacao_id = ra.id) as total_series
      FROM regras_avaliacao ra
      JOIN tipos_avaliacao ta ON ta.id = ra.tipo_avaliacao_id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (!todos) {
      query += ` AND ra.ativo = true`
    }

    if (tipoAvaliacaoId) {
      query += ` AND ra.tipo_avaliacao_id = $${paramIndex}`
      params.push(tipoAvaliacaoId)
      paramIndex++
    }

    query += ` ORDER BY ra.nome ASC`

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error: any) {
    if (error?.code === '42P01') {
      return NextResponse.json([])
    }
    console.error('Erro ao listar regras de avaliacao:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/regras-avaliacao
 * Cria uma nova regra de avaliacao. Admin e tecnico.
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nome, descricao, tipo_avaliacao_id, tipo_periodo, qtd_periodos,
      media_aprovacao, media_recuperacao, nota_maxima, permite_recuperacao,
      recuperacao_por_periodo, max_dependencias, formula_media,
      pesos_periodos, arredondamento, casas_decimais, aprovacao_automatica
    } = body

    if (!nome || !tipo_avaliacao_id) {
      return NextResponse.json({ mensagem: 'Campos obrigatorios: nome, tipo_avaliacao_id' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO regras_avaliacao (
        nome, descricao, tipo_avaliacao_id, tipo_periodo, qtd_periodos,
        media_aprovacao, media_recuperacao, nota_maxima, permite_recuperacao,
        recuperacao_por_periodo, max_dependencias, formula_media,
        pesos_periodos, arredondamento, casas_decimais, aprovacao_automatica
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        nome, descricao || null, tipo_avaliacao_id,
        tipo_periodo || 'bimestral', qtd_periodos ?? 4,
        media_aprovacao ?? 6.00, media_recuperacao ?? 5.00, nota_maxima ?? 10.00,
        permite_recuperacao ?? true, recuperacao_por_periodo ?? false,
        max_dependencias ?? 0, formula_media || 'media_aritmetica',
        pesos_periodos ? JSON.stringify(pesos_periodos) : null,
        arredondamento || 'normal', casas_decimais ?? 1,
        aprovacao_automatica ?? false
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar regra de avaliacao:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/regras-avaliacao
 * Atualiza uma regra de avaliacao. Admin e tecnico.
 */
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...campos } = body

    if (!id) {
      return NextResponse.json({ mensagem: 'ID e obrigatorio' }, { status: 400 })
    }

    const camposPermitidos = [
      'nome', 'descricao', 'tipo_avaliacao_id', 'tipo_periodo', 'qtd_periodos',
      'media_aprovacao', 'media_recuperacao', 'nota_maxima', 'permite_recuperacao',
      'recuperacao_por_periodo', 'max_dependencias', 'formula_media',
      'pesos_periodos', 'arredondamento', 'casas_decimais', 'aprovacao_automatica', 'ativo'
    ]

    const sets: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const campo of camposPermitidos) {
      if (campos[campo] !== undefined) {
        if (campo === 'pesos_periodos') {
          sets.push(`${campo} = $${paramIndex}`)
          values.push(campos[campo] ? JSON.stringify(campos[campo]) : null)
        } else {
          sets.push(`${campo} = $${paramIndex}`)
          values.push(campos[campo])
        }
        paramIndex++
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    sets.push(`atualizado_em = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await pool.query(
      `UPDATE regras_avaliacao SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Regra de avaliacao nao encontrada' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar regra de avaliacao:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/regras-avaliacao?id=...
 * Soft delete de regra de avaliacao. Apenas admin.
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado - apenas administradores' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'ID e obrigatorio' }, { status: 400 })
    }

    // Verificar se a regra esta em uso por alguma serie
    const uso = await pool.query(
      `SELECT COUNT(*) as total FROM series_escolares WHERE regra_avaliacao_id = $1`,
      [id]
    )

    if (parseInt(uso.rows[0].total) > 0) {
      return NextResponse.json({
        mensagem: `Esta regra esta vinculada a ${uso.rows[0].total} serie(s). Desvincule antes de desativar.`
      }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE regras_avaliacao SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Regra de avaliacao nao encontrada' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Regra desativada com sucesso' })
  } catch (error) {
    console.error('Erro ao desativar regra de avaliacao:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
