import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS, CACHE_TTL } from '@/lib/constants'
import { disciplinaEscolarSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'
import { DatabaseError } from '@/lib/validation'
import { parseBoolParam, createWhereBuilder, addCondition, buildWhereString } from '@/lib/api-helpers'
import { withRedisCache, cacheKey, cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminDisciplinasEscolares')

export const dynamic = 'force-dynamic'

const atualizarDisciplinaSchema = disciplinaEscolarSchema.extend({
  id: z.string().uuid('ID inválido'),
})

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const searchParams = request.nextUrl.searchParams
  const apenasAtivas = searchParams.get('ativas') !== 'false'

  const redisKey = cacheKey('disciplinas', apenasAtivas ? 'ativas' : 'todas')
  const data = await withRedisCache(redisKey, CACHE_TTL.REFERENCIA, async () => {
    const where = createWhereBuilder()
    if (apenasAtivas) {
      addCondition(where, 'ativo', true)
    }

    const result = await pool.query(
      `SELECT id, nome, codigo, abreviacao, ordem, ativo, criado_em, atualizado_em FROM disciplinas_escolares ${buildWhereString(where)} ORDER BY ordem, nome`,
      where.params
    )

    return result.rows
  })

  return NextResponse.json(data)
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, disciplinaEscolarSchema)
    if (!validacao.success) return validacao.response

    const { nome, codigo, abreviacao, ordem, ativo } = validacao.data

    const result = await pool.query(
      `INSERT INTO disciplinas_escolares (nome, codigo, abreviacao, ordem, ativo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, codigo || null, abreviacao || null, ordem, ativo]
    )

    await cacheDelPattern('disciplinas:*')
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Código de disciplina já cadastrado' }, { status: 400 })
    }
    log.error('Erro ao criar disciplina', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, atualizarDisciplinaSchema)
    if (!validacao.success) return validacao.response

    const { id, nome, codigo, abreviacao, ordem, ativo } = validacao.data

    const result = await pool.query(
      `UPDATE disciplinas_escolares
       SET nome = $1, codigo = $2, abreviacao = $3, ordem = $4, ativo = $5
       WHERE id = $6
       RETURNING *`,
      [nome, codigo || null, abreviacao || null, ordem, ativo, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Disciplina não encontrada' }, { status: 404 })
    }

    await cacheDelPattern('disciplinas:*')
    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Código de disciplina já cadastrado' }, { status: 400 })
    }
    log.error('Erro ao atualizar disciplina', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const validacaoId = validateId(searchParams.get('id'))
    if (!validacaoId.success) return validacaoId.response
    const id = validacaoId.data

    const result = await pool.query(
      'UPDATE disciplinas_escolares SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Disciplina não encontrada' }, { status: 404 })
    }

    await cacheDelPattern('disciplinas:*')
    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    log.error('Erro ao excluir disciplina', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
