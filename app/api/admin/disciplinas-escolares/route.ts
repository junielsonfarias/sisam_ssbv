import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { disciplinaEscolarSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'
import { DatabaseError } from '@/lib/validation'
import { parseBoolParam, createWhereBuilder, addCondition, buildWhereString } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// Cache de disciplinas (mudam raramente — TTL 60s)
let disciplinasCache: { data: any; expiresAt: number; key: string } | null = null
function invalidarCache() { disciplinasCache = null }

const atualizarDisciplinaSchema = disciplinaEscolarSchema.extend({
  id: z.string().uuid('ID inválido'),
})

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  const searchParams = request.nextUrl.searchParams
  const apenasAtivas = searchParams.get('ativas') !== 'false'
  const cacheKey = `disc:${apenasAtivas}`

  // Cache hit
  if (disciplinasCache && disciplinasCache.key === cacheKey && Date.now() < disciplinasCache.expiresAt) {
    return NextResponse.json(disciplinasCache.data)
  }

  const where = createWhereBuilder()
  if (apenasAtivas) {
    addCondition(where, 'ativo', true)
  }

  const result = await pool.query(
    `SELECT * FROM disciplinas_escolares ${buildWhereString(where)} ORDER BY ordem, nome`,
    where.params
  )

  // Cache por 60s
  disciplinasCache = { data: result.rows, expiresAt: Date.now() + 60_000, key: cacheKey }
  return NextResponse.json(result.rows)
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

    invalidarCache()
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Código de disciplina já cadastrado' }, { status: 400 })
    }
    console.error('Erro ao criar disciplina:', error)
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

    invalidarCache()
    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Código de disciplina já cadastrado' }, { status: 400 })
    }
    console.error('Erro ao atualizar disciplina:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const validacaoId = validateId(searchParams.get('id'))
    if (!validacaoId.success) return validacaoId.response
    const id = validacaoId.data

    // Verificar se há notas lançadas para esta disciplina
    const notasVinculadas = await pool.query(
      'SELECT COUNT(*) as total FROM notas_escolares WHERE disciplina_id = $1',
      [id]
    )

    if (parseInt(notasVinculadas.rows[0].total) > 0) {
      return NextResponse.json(
        { mensagem: 'Não é possível excluir: existem notas lançadas para esta disciplina. Desative-a em vez de excluir.' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM disciplinas_escolares WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Disciplina não encontrada' }, { status: 404 })
    }

    invalidarCache()
    return NextResponse.json({ mensagem: 'Disciplina excluída com sucesso' })
  } catch (error: unknown) {
    console.error('Erro ao excluir disciplina:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
