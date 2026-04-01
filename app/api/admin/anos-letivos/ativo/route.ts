import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('AnoLetivoAtivo')

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  try {
    const result = await pool.query(
      `SELECT id, ano, status, data_inicio, data_fim, dias_letivos_total, observacao, criado_em, atualizado_em FROM anos_letivos WHERE status = 'ativo' LIMIT 1`
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ ano_ativo: null, mensagem: 'Nenhum ano letivo ativo' })
    }

    return NextResponse.json({ ano_ativo: result.rows[0] })
  } catch (error: unknown) {
    log.error('Erro ao buscar ano letivo ativo', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
