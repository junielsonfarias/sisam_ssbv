import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'

const matriculaSeriePostSchema = z.object({
  serie: z.string().min(1, 'Série é obrigatória').max(50),
  nome_serie: z.string().min(1, 'Nome da série é obrigatório').max(255),
  avalia_lp: z.boolean().optional(),
  avalia_mat: z.boolean().optional(),
  avalia_ch: z.boolean().optional(),
  avalia_cn: z.boolean().optional(),
  tem_producao_textual: z.boolean().optional(),
})

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
  } catch (error: unknown) {
    console.error('Erro ao listar séries:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validationResult = await validateRequest(request, matriculaSeriePostSchema)
    if (!validationResult.success) return validationResult.response
    const { serie, nome_serie, avalia_lp, avalia_mat, avalia_ch, avalia_cn, tem_producao_textual } = validationResult.data

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

    try { await cacheDelPattern('config:*') } catch {}
    try { await cacheDelPattern('series:*') } catch {}

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if ((error as DatabaseError)?.code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'Série já cadastrada' }, { status: 400 })
    }
    console.error('Erro ao criar série:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
