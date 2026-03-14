import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const result = await pool.query(
      `SELECT id, serie, nome_serie, ativo,
              avalia_lp, avalia_mat, avalia_ch, avalia_cn,
              tem_producao_textual
       FROM configuracao_series
       WHERE ativo = true
       ORDER BY CASE WHEN serie ~ '^\d+$' THEN serie::integer ELSE 999 END, serie`
    )

    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error('Erro ao listar séries:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { serie, nome_serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual } = body

    if (!serie || !nome_serie) {
      return NextResponse.json({ mensagem: 'Série e nome são obrigatórios' }, { status: 400 })
    }

    const result = await pool.query(
      `INSERT INTO configuracao_series (serie, nome_serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        serie,
        nome_serie,
        avalia_lp ?? true,
        avalia_mat ?? true,
        avalia_ch ?? false,
        avalia_cn ?? false,
        tem_producao_textual ?? false,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ mensagem: 'Série já cadastrada' }, { status: 400 })
    }
    console.error('Erro ao criar série:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
