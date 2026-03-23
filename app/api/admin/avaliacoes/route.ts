import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { avaliacaoSchema, validateRequest } from '@/lib/schemas'
import { getErrorMessage } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/avaliacoes
 *
 * Lista avaliações, com filtro opcional por ano_letivo.
 */
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo')

    let query = `
      SELECT id, nome, descricao, ano_letivo, tipo, ordem, data_inicio, data_fim, ativo, criado_em
      FROM avaliacoes
      WHERE ativo = true
    `
    const params: string[] = []

    if (anoLetivo) {
      query += ` AND ano_letivo = $1`
      params.push(anoLetivo)
    }

    query += ` ORDER BY ano_letivo DESC, ordem`

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    // Se a tabela não existe ainda (migração não executada), retornar array vazio
    if ((error as any)?.code === '42P01') {
      return NextResponse.json([])
    }
    console.error('Erro ao listar avaliações:', getErrorMessage(error))
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/admin/avaliacoes
 *
 * Cria uma nova avaliação.
 */
export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, avaliacaoSchema)
    if (!validacao.success) return validacao.response

    const { nome, descricao, ano_letivo, tipo, ordem, data_inicio, data_fim, ativo } = validacao.data

    const result = await pool.query(
      `INSERT INTO avaliacoes (nome, descricao, ano_letivo, tipo, ordem, data_inicio, data_fim, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nome, descricao || null, ano_letivo, tipo, ordem, data_inicio || null, data_fim || null, ativo]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as any)?.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe uma avaliação deste tipo para este ano letivo' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar avaliação:', getErrorMessage(error))
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * PUT /api/admin/avaliacoes
 *
 * Atualiza uma avaliação existente.
 */
export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { id, nome, descricao, data_inicio, data_fim, ativo } = body

    if (!id) {
      return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE avaliacoes
       SET nome = COALESCE($1, nome),
           descricao = COALESCE($2, descricao),
           data_inicio = $3,
           data_fim = $4,
           ativo = COALESCE($5, ativo),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [nome, descricao, data_inicio || null, data_fim || null, ativo, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Avaliação não encontrada' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Erro ao atualizar avaliação:', getErrorMessage(error))
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
