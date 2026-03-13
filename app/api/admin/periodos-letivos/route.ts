import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { periodoLetivoSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const atualizarPeriodoSchema = periodoLetivoSchema.extend({
  id: z.string().uuid('ID inválido'),
})

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo')
    const tipo = searchParams.get('tipo')

    const whereConditions: string[] = []
    const params: string[] = []
    let paramIndex = 1

    if (anoLetivo) {
      whereConditions.push(`ano_letivo = $${paramIndex}`)
      params.push(anoLetivo)
      paramIndex++
    }

    if (tipo) {
      whereConditions.push(`tipo = $${paramIndex}`)
      params.push(tipo)
      paramIndex++
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT * FROM periodos_letivos ${whereClause} ORDER BY ano_letivo DESC, numero`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar períodos letivos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, periodoLetivoSchema)
    if (!validacao.success) return validacao.response

    const { nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo } = validacao.data

    const result = await pool.query(
      `INSERT INTO periodos_letivos (nome, tipo, numero, ano_letivo, data_inicio, data_fim, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nome, tipo, numero, ano_letivo, data_inicio || null, data_fim || null, ativo]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe um período deste tipo e número para este ano letivo' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar período letivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, atualizarPeriodoSchema)
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

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json(
        { mensagem: 'Já existe um período deste tipo e número para este ano letivo' },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar período letivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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

    return NextResponse.json({ mensagem: 'Período excluído com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir período letivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
