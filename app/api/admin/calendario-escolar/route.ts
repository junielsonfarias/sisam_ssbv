import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/calendario-escolar?ano_letivo=2026
 * Retorna períodos letivos + eventos + feriados para montar o calendário escolar
 */
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)
  const anoLetivo = searchParams.get('ano_letivo') || String(new Date().getFullYear())

  // Buscar períodos letivos
  const periodos = await pool.query(
    `SELECT * FROM periodos_letivos WHERE ano_letivo = $1 ORDER BY numero`,
    [anoLetivo]
  )

  // Buscar eventos do ano (todos, incluindo privados, para admin)
  const eventos = await pool.query(
    `SELECT id, titulo, descricao, tipo, data_inicio, data_fim, local, publico
     FROM eventos
     WHERE EXTRACT(YEAR FROM data_inicio) = $1
     ORDER BY data_inicio`,
    [parseInt(anoLetivo)]
  )

  // Calcular resumo por bimestre
  const resumo = periodos.rows.map((p: any) => {
    if (p.data_inicio && p.data_fim) {
      const inicio = new Date(p.data_inicio)
      const fim = new Date(p.data_fim)
      let diasLetivos = 0
      const current = new Date(inicio)
      while (current <= fim) {
        const dow = current.getDay()
        if (dow !== 0 && dow !== 6) diasLetivos++
        current.setDate(current.getDate() + 1)
      }
      return { ...p, dias_letivos_estimados: diasLetivos }
    }
    return { ...p, dias_letivos_estimados: 0 }
  })

  return NextResponse.json({
    periodos: resumo,
    eventos: eventos.rows,
    ano_letivo: anoLetivo,
  })
})
