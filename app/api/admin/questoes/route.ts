import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic';

export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const result = await pool.query(
    `SELECT
      id, codigo, descricao, disciplina, area_conhecimento,
      dificuldade, gabarito, criado_em,
      serie_aplicavel, tipo_questao, numero_questao
     FROM questoes
     ORDER BY criado_em DESC`
  )

  return NextResponse.json(result.rows)
})

export const POST = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { codigo, descricao, disciplina, area_conhecimento, dificuldade, gabarito, serie_aplicavel, tipo_questao } = await request.json()

    // Normalizar valores vazios para null
    const normalizeValue = (value: any) => {
      if (value === '' || value === undefined) return null
      return value
    }

    const result = await pool.query(
      `INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento, dificuldade, gabarito, serie_aplicavel, tipo_questao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        normalizeValue(codigo),
        normalizeValue(descricao),
        normalizeValue(disciplina),
        normalizeValue(area_conhecimento),
        normalizeValue(dificuldade),
        normalizeValue(gabarito),
        normalizeValue(serie_aplicavel),
        normalizeValue(tipo_questao) || 'objetiva',
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as any).code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar questão:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(['administrador'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { id, codigo, descricao, disciplina, area_conhecimento, dificuldade, gabarito, serie_aplicavel, tipo_questao } = body

    if (!id) {
      return NextResponse.json(
        { mensagem: 'ID da questão é obrigatório' },
        { status: 400 }
      )
    }

    // Normalizar valores vazios para null
    const normalizeValue = (value: any) => {
      if (value === '' || value === undefined) return null
      return value
    }

    const result = await pool.query(
      `UPDATE questoes
       SET codigo = $1, descricao = $2, disciplina = $3, area_conhecimento = $4,
           dificuldade = $5, gabarito = $6, serie_aplicavel = $7, tipo_questao = $8
       WHERE id = $9
       RETURNING *`,
      [
        normalizeValue(codigo),
        normalizeValue(descricao),
        normalizeValue(disciplina),
        normalizeValue(area_conhecimento),
        normalizeValue(dificuldade),
        normalizeValue(gabarito),
        normalizeValue(serie_aplicavel),
        normalizeValue(tipo_questao) || 'objetiva',
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Questão não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    console.error('Erro completo ao atualizar questão:', {
      message: (error as Error).message,
      code: (error as any).code,
      detail: (error as any).detail,
      stack: (error as any).stack,
    })

    if ((error as any).code === '23505') {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }

    if ((error as any).code === '22P02') {
      return NextResponse.json(
        { mensagem: 'ID inválido. Verifique se o ID está correto.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        mensagem: (error as Error).message || 'Erro interno do servidor',
        detalhes: (error as any).code,
        stack: process.env.NODE_ENV === 'development' ? (error as any).stack : undefined
      },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { mensagem: 'ID da questão é obrigatório' },
        { status: 400 }
      )
    }

    const result = await pool.query(
      'DELETE FROM questoes WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Questão não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mensagem: 'Questão excluída com sucesso' })
  } catch (error: unknown) {
    console.error('Erro ao excluir questão:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
