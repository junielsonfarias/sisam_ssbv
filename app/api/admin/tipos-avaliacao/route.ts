import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/tipos-avaliacao
 * Lista todos os tipos de avaliacao ativos.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const todos = searchParams.get('todos') === 'true'

    let query = `SELECT * FROM tipos_avaliacao`
    if (!todos) {
      query += ` WHERE ativo = true`
    }
    query += ` ORDER BY codigo ASC`

    const result = await pool.query(query)
    return NextResponse.json(result.rows)
  } catch (error: any) {
    if (error?.code === '42P01') {
      return NextResponse.json([])
    }
    console.error('Erro ao listar tipos de avaliacao:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/tipos-avaliacao
 * Cria um novo tipo de avaliacao. Apenas admin.
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado - apenas administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { codigo, nome, descricao, tipo_resultado, escala_conceitos, nota_minima, nota_maxima, permite_decimal } = body

    if (!codigo || !nome || !tipo_resultado) {
      return NextResponse.json({ mensagem: 'Campos obrigatorios: codigo, nome, tipo_resultado' }, { status: 400 })
    }

    const validos = ['parecer', 'conceito', 'numerico', 'misto']
    if (!validos.includes(tipo_resultado)) {
      return NextResponse.json({ mensagem: `tipo_resultado deve ser um de: ${validos.join(', ')}` }, { status: 400 })
    }

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

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar tipo de avaliacao:', error)
    if (error.code === '23505') {
      return NextResponse.json({ mensagem: 'Ja existe um tipo com este codigo' }, { status: 409 })
    }
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/tipos-avaliacao
 * Atualiza um tipo de avaliacao. Apenas admin.
 */
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Nao autorizado - apenas administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...campos } = body

    if (!id) {
      return NextResponse.json({ mensagem: 'ID e obrigatorio' }, { status: 400 })
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
      return NextResponse.json({ mensagem: 'Tipo de avaliacao nao encontrado' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    console.error('Erro ao atualizar tipo de avaliacao:', error)
    if (error.code === '23505') {
      return NextResponse.json({ mensagem: 'Ja existe um tipo com este codigo' }, { status: 409 })
    }
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
