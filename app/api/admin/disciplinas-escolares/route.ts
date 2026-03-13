import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { disciplinaEscolarSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const atualizarDisciplinaSchema = disciplinaEscolarSchema.extend({
  id: z.string().uuid('ID inválido'),
})

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const apenasAtivas = searchParams.get('ativas') !== 'false'

    let query = 'SELECT * FROM disciplinas_escolares'
    const params: string[] = []

    if (apenasAtivas) {
      query += ' WHERE ativo = true'
    }

    query += ' ORDER BY ordem, nome'

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao buscar disciplinas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, disciplinaEscolarSchema)
    if (!validacao.success) return validacao.response

    const { nome, codigo, abreviacao, ordem, ativo } = validacao.data

    const result = await pool.query(
      `INSERT INTO disciplinas_escolares (nome, codigo, abreviacao, ordem, ativo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, codigo || null, abreviacao || null, ordem, ativo]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ mensagem: 'Código de disciplina já cadastrado' }, { status: 400 })
    }
    console.error('Erro ao criar disciplina:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ mensagem: 'Código de disciplina já cadastrado' }, { status: 400 })
    }
    console.error('Erro ao atualizar disciplina:', error)
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

    return NextResponse.json({ mensagem: 'Disciplina excluída com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir disciplina:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
