import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import {
  parseSearchParams, createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'
import { validateRequest, turmaPostSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const { escola_id, serie } = parseSearchParams(searchParams, ['escola_id', 'serie'])
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!escola_id) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const where = createWhereBuilder()
    addCondition(where, 't.escola_id', escola_id)
    addCondition(where, 't.ano_letivo', anoLetivo)
    addRawCondition(where, 't.ativo = true')

    if (serie) {
      const numSerie = serie.match(/(\d+)/)?.[1] || serie.trim()
      addRawCondition(where, `COALESCE(t.serie_numero, REGEXP_REPLACE(t.serie::text, '[^0-9]', '', 'g')) = $${where.paramIndex}`, [numSerie])
    }

    const result = await pool.query(
      `SELECT t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
              t.capacidade_maxima, t.multiserie, t.multietapa,
              COUNT(a.id) FILTER (WHERE a.ativo = true) as total_alunos
       FROM turmas t
       LEFT JOIN alunos a ON a.turma_id = t.id AND a.ativo = true
       WHERE ${buildConditionsString(where)}
       GROUP BY t.id, t.codigo, t.nome, t.serie, t.ano_letivo, t.escola_id,
                t.capacidade_maxima, t.multiserie, t.multietapa
       ORDER BY t.serie, t.codigo`,
      where.params
    )

    return NextResponse.json(result.rows.map(r => ({
      ...r,
      total_alunos: parseInt(r.total_alunos) || 0
    })))
  } catch (error: unknown) {
    console.error('Erro ao listar turmas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validationResult = await validateRequest(request, turmaPostSchema)
    if (!validationResult.success) return validationResult.response
    const { codigo, nome, escola_id, serie, ano_letivo } = validationResult.data

    // Escola só pode criar turma na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [codigo, nome || null, escola_id, serie || null, ano_letivo]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Turma com este código já existe para esta escola e ano letivo' }, { status: 400 })
    }
    console.error('Erro ao criar turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
