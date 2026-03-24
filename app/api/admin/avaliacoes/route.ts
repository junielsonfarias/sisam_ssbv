import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { avaliacaoSchema, validateRequest, uuidSchema } from '@/lib/schemas'
import { z } from 'zod'
import { getErrorMessage, DatabaseError } from '@/lib/validation'
import { createWhereBuilder, addRawCondition, addCondition, buildConditionsString } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/avaliacoes
 *
 * Lista avaliações, com filtro opcional por ano_letivo.
 */
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const anoLetivo = request.nextUrl.searchParams.get('ano_letivo')

    const where = createWhereBuilder()
    addRawCondition(where, 'ativo = true')
    addCondition(where, 'ano_letivo', anoLetivo)

    const result = await pool.query(
      `SELECT id, nome, descricao, ano_letivo, tipo, ordem, data_inicio, data_fim, ativo, criado_em
       FROM avaliacoes
       WHERE ${buildConditionsString(where)}
       ORDER BY ano_letivo DESC, ordem`,
      where.params
    )
    return NextResponse.json(result.rows)
  } catch (error: unknown) {
    // Se a tabela não existe ainda (migração não executada), retornar array vazio
    if ((error as DatabaseError)?.code === PG_ERRORS.UNDEFINED_TABLE) {
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
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
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
/** Schema para atualizar avaliação: id obrigatório, demais campos opcionais */
const atualizarAvaliacaoSchema = z.object({
  id: uuidSchema,
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255).optional(),
  descricao: z.string().max(1000).optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
})

export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, atualizarAvaliacaoSchema)
    if (!validacao.success) return validacao.response

    const { id, nome, descricao, data_inicio, data_fim, ativo } = validacao.data

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

/**
 * DELETE /api/admin/avaliacoes?id=...
 *
 * Soft-delete: desativa a avaliação. Verifica se há resultados vinculados.
 */
export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
    }

    // Verificar se há resultados vinculados
    const vinculados = await pool.query(
      'SELECT COUNT(*) as total FROM resultados_consolidados WHERE avaliacao_id = $1',
      [id]
    )

    if (parseInt(vinculados.rows[0].total) > 0) {
      return NextResponse.json(
        { mensagem: `Não é possível excluir: existem ${vinculados.rows[0].total} resultado(s) vinculado(s) a esta avaliação. Desative-a em vez de excluir.` },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'UPDATE avaliacoes SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, nome',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Avaliação não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Avaliação desativada com sucesso' })
  } catch (error: unknown) {
    console.error('Erro ao desativar avaliação:', getErrorMessage(error))
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
