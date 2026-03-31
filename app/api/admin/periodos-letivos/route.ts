import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS, CACHE_TTL } from '@/lib/constants'
import { periodoLetivoSchema, periodoLetivoUpdateSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'
import { DatabaseError } from '@/lib/validation'
import { parseSearchParams, createWhereBuilder, addCondition, buildWhereString } from '@/lib/api-helpers'
import { withRedisCache, cacheKey, cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminPeriodosLetivos')

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const searchParams = request.nextUrl.searchParams
  const { ano_letivo, tipo } = parseSearchParams(searchParams, ['ano_letivo', 'tipo'])

  const redisKey = cacheKey('periodos', ano_letivo || 'all', tipo || 'all')
  const data = await withRedisCache(redisKey, CACHE_TTL.REFERENCIA, async () => {
    const where = createWhereBuilder()
    addCondition(where, 'ano_letivo', ano_letivo)
    addCondition(where, 'tipo', tipo)

    const whereClause = buildWhereString(where)

    const result = await pool.query(
      `SELECT id, nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo, dias_letivos, criado_em, atualizado_em FROM periodos_letivos ${whereClause} ORDER BY ano_letivo DESC, numero`,
      where.params
    )

    return result.rows
  })

  return NextResponse.json(data)
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, periodoLetivoSchema)
    if (!validacao.success) return validacao.response

    const { nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo } = validacao.data

    const result = await pool.query(
      `INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nome, tipo, numero, ano_letivo, data_inicio || null, data_fim || null, ativo]
    )

    await cacheDelPattern('periodos:*')
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json(
        { mensagem: 'Já existe um período deste tipo e número para este ano letivo' },
        { status: 400 }
      )
    }
    log.error('Erro ao criar período letivo', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, periodoLetivoUpdateSchema)
    if (!validacao.success) return validacao.response

    const { id, nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo } = validacao.data

    const result = await pool.query(
      `UPDATE periodos_letivos
       SET nome = $1, tipo = $2, numero = $3, ano_letivo = $4, data_inicio = $5, data_fim = $6, ativo = $7
       WHERE id = $8
       RETURNING *`,
      [nome, tipo, numero, ano_letivo, data_inicio || null, data_fim || null, ativo, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Período não encontrado' }, { status: 404 })
    }

    await cacheDelPattern('periodos:*')
    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json(
        { mensagem: 'Já existe um período deste tipo e número para este ano letivo' },
        { status: 400 }
      )
    }
    log.error('Erro ao atualizar período letivo', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const validacaoId = validateId(searchParams.get('id'))
    if (!validacaoId.success) return validacaoId.response
    const id = validacaoId.data

    // Verificar se há notas lançadas neste período
    const notasVinculadas = await pool.query(
      'SELECT COUNT(*) as total FROM notas_escolares WHERE periodo_id = $1',
      [id]
    )

    if (parseInt(notasVinculadas.rows[0].total) > 0) {
      return NextResponse.json(
        { mensagem: 'Não é possível excluir: existem notas lançadas neste período' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM periodos_letivos WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Período não encontrado' }, { status: 404 })
    }

    await cacheDelPattern('periodos:*')
    return NextResponse.json({ mensagem: 'Período excluído com sucesso' })
  } catch (error: unknown) {
    log.error('Erro ao excluir período letivo', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
