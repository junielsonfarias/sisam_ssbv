import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { parseBoolParam, createWhereBuilder, addCondition, buildWhereString } from '@/lib/api-helpers'
import { validateRequest, tipoAvaliacaoPostSchema } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminTiposAvaliacao')

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/tipos-avaliacao
 * Lista todos os tipos de avaliacao ativos.
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const todos = parseBoolParam(searchParams, 'todos', false)

    const where = createWhereBuilder()
    if (!todos) {
      addCondition(where, 'ativo', true)
    }

    const result = await pool.query(
      `SELECT id, codigo, nome, descricao, tipo_resultado, escala_conceitos, nota_minima, nota_maxima, permite_decimal, ativo, criado_em, atualizado_em FROM tipos_avaliacao ${buildWhereString(where)} ORDER BY codigo ASC`,
      where.params
    )
    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNDEFINED_TABLE) {
      return NextResponse.json([])
    }
    log.error('Erro ao listar tipos de avaliacao', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/admin/tipos-avaliacao
 * Cria um novo tipo de avaliacao. Apenas admin.
 */
export const POST = withAuth(['administrador'], async (request, usuario) => {
  try {
    const validation = await validateRequest(request, tipoAvaliacaoPostSchema)
    if (!validation.success) return validation.response
    const { codigo, nome, descricao, tipo_resultado, escala_conceitos, nota_minima, nota_maxima, permite_decimal } = validation.data

    const result = await pool.query(
      `INSERT INTO tipos_avaliacao (codigo, nome, descricao, tipo_resultado, escala_conceitos, nota_minima, nota_maxima, permite_decimal)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        codigo, nome, descricao || null, tipo_resultado,
        escala_conceitos ? JSON.stringify(escala_conceitos) : null,
        nota_minima ?? 0, nota_maxima ?? 10, permite_decimal ?? true
      ]
    )

    try { await cacheDelPattern('tipos-avaliacao:*') } catch {}

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    log.error('Erro ao criar tipo de avaliacao', error)
    if ((error as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Ja existe um tipo com este codigo' }, { status: 409 })
    }
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * PUT /api/admin/tipos-avaliacao
 * Atualiza um tipo de avaliacao. Apenas admin.
 */
export const PUT = withAuth(['administrador'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { id, ...campos } = body

    if (!id) {
      return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
    }

    // Impedir desativação se há regras de avaliação vinculadas
    if (campos.ativo === false) {
      const uso = await pool.query(
        'SELECT COUNT(*) as total FROM regras_avaliacao WHERE tipo_avaliacao_id = $1 AND ativo = true',
        [id]
      )
      if (parseInt(uso.rows[0].total) > 0) {
        return NextResponse.json({
          mensagem: `Não é possível desativar: ${uso.rows[0].total} regra(s) de avaliação vinculada(s). Desvincule-as primeiro.`
        }, { status: 400 })
      }
    }

    const camposPermitidos = ['nome', 'descricao', 'tipo_resultado', 'escala_conceitos', 'nota_minima', 'nota_maxima', 'permite_decimal', 'ativo']
    const sets: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const campo of camposPermitidos) {
      if (campos[campo] !== undefined) {
        if (campo === 'escala_conceitos') {
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
      `UPDATE tipos_avaliacao SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Tipo de avaliacao não encontrado' }, { status: 404 })
    }

    try { await cacheDelPattern('tipos-avaliacao:*') } catch {}

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    log.error('Erro ao atualizar tipo de avaliacao', error)
    if ((error as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Ja existe um tipo com este codigo' }, { status: 409 })
    }
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
