import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const etapa = searchParams.get('etapa')

    let query = `
      SELECT se.*,
        (SELECT COUNT(*) FROM series_disciplinas sd WHERE sd.serie_id = se.id AND sd.ativo = true) as total_disciplinas
      FROM series_escolares se
      WHERE 1=1
    `
    const params: string[] = []
    let paramIndex = 1

    if (etapa) {
      query += ` AND se.etapa = $${paramIndex}`
      params.push(etapa)
      paramIndex++
    }

    query += ' ORDER BY se.ordem ASC'

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar séries escolares:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const {
      codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao,
      nota_maxima, max_dependencias, formula_nota_final, permite_recuperacao,
      idade_minima, idade_maxima
    } = body

    if (!codigo || !nome || !etapa || ordem === undefined) {
      return NextResponse.json({ mensagem: 'Campos obrigatórios: codigo, nome, etapa, ordem' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO series_escolares (codigo, nome, etapa, ordem, media_aprovacao, media_recuperacao, nota_maxima, max_dependencias, formula_nota_final, permite_recuperacao, idade_minima, idade_maxima)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [codigo, nome, etapa, ordem, media_aprovacao ?? 6.0, media_recuperacao ?? 5.0, nota_maxima ?? 10.0, max_dependencias ?? 0, formula_nota_final ?? 'media_aritmetica', permite_recuperacao ?? true, idade_minima, idade_maxima]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar série escolar:', error)
    if ((error as any).code === '23505') {
      return NextResponse.json({ mensagem: 'Já existe uma série com este código' }, { status: 409 })
    }
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { id, ...campos } = body

    if (!id) {
      return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
    }

    const camposPermitidos = [
      'nome', 'etapa', 'ordem', 'media_aprovacao', 'media_recuperacao',
      'nota_maxima', 'max_dependencias', 'formula_nota_final', 'permite_recuperacao',
      'idade_minima', 'idade_maxima', 'ativo', 'tipo_avaliacao_id', 'regra_avaliacao_id'
    ]

    const sets: string[] = []
    const values: any[] = []
    let paramIndex = 1

    for (const campo of camposPermitidos) {
      if (campos[campo] !== undefined) {
        sets.push(`${campo} = $${paramIndex}`)
        values.push(campos[campo])
        paramIndex++
      }
    }

    if (sets.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    sets.push(`atualizado_em = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await pool.query(
      `UPDATE series_escolares SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Série não encontrada' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar série escolar:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE series_escolares SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Série não encontrada' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Série desativada com sucesso' })
  } catch (error) {
    console.error('Erro ao desativar série escolar:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
