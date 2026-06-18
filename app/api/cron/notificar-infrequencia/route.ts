/**
 * GET /api/cron/notificar-infrequencia
 *
 * Job agendado (Vercel Cron ou externo) que detecta alunos infrequentes no
 * período letivo ATIVO do ano corrente e notifica os responsáveis.
 * (Fase 4.1 — ciclo pedagógico LDB.)
 *
 * Protegido por CRON_SECRET no header Authorization (mesmo padrão de
 * /api/cron/health-check). Roda para TODAS as escolas (escopo global).
 */

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { notificarInfrequencia } from '@/lib/services/infrequencia-notificacao.service'

const log = createLogger('CronInfrequencia')

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    log.warn('CRON_SECRET não configurado')
    return NextResponse.json({ mensagem: 'CRON_SECRET não configurado' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
  }

  try {
    const anoLetivo = String(new Date().getFullYear())

    // Período letivo ativo do ano (o mais recente marcado como ativo).
    const periodoRes = await pool.query(
      `SELECT id FROM periodos_letivos
        WHERE ano_letivo = $1 AND ativo = true
        ORDER BY numero DESC NULLS LAST
        LIMIT 1`,
      [anoLetivo]
    )
    if (periodoRes.rows.length === 0) {
      log.info('Nenhum período ativo — nada a notificar', { data: { anoLetivo } })
      return NextResponse.json({ mensagem: 'Nenhum período letivo ativo', ano_letivo: anoLetivo, resultado: null })
    }

    const resultado = await notificarInfrequencia({
      anoLetivo,
      periodoId: periodoRes.rows[0].id,
    })

    return NextResponse.json({ ano_letivo: anoLetivo, periodo_id: periodoRes.rows[0].id, resultado })
  } catch (error) {
    log.error('Erro no cron de infrequência', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
