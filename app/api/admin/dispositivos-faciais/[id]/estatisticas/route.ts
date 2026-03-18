import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dispositivos-faciais/[id]/estatisticas
 * Estatísticas de um dispositivo: scans por hora, taxa de reconhecimento, total hoje
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id } = params
    const hoje = new Date().toISOString().split('T')[0]

    // Total de presenças registradas hoje por este dispositivo
    const hojeResult = await pool.query(
      `SELECT COUNT(*) AS total_hoje
       FROM frequencia_diaria
       WHERE dispositivo_id = $1 AND data = $2`,
      [id, hoje]
    )

    // Presenças por hora hoje
    const porHoraResult = await pool.query(
      `SELECT
        EXTRACT(HOUR FROM hora_entrada) AS hora,
        COUNT(*) AS total
       FROM frequencia_diaria
       WHERE dispositivo_id = $1 AND data = $2 AND hora_entrada IS NOT NULL
       GROUP BY EXTRACT(HOUR FROM hora_entrada)
       ORDER BY hora`,
      [id, hoje]
    )

    // Total últimos 7 dias
    const semanaResult = await pool.query(
      `SELECT data, COUNT(*) AS total
       FROM frequencia_diaria
       WHERE dispositivo_id = $1 AND data >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY data
       ORDER BY data`,
      [id]
    )

    // Logs recentes (últimos 20 eventos)
    const logsResult = await pool.query(
      `SELECT evento, detalhes, criado_em
       FROM logs_dispositivos
       WHERE dispositivo_id = $1
       ORDER BY criado_em DESC
       LIMIT 20`,
      [id]
    )

    // Taxa de reconhecimento (scans com sucesso vs total de eventos de presença)
    const taxaResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE evento = 'presenca') AS total_presencas,
        COUNT(*) FILTER (WHERE evento = 'presenca_lote') AS total_lotes,
        COUNT(*) FILTER (WHERE evento = 'erro') AS total_erros
       FROM logs_dispositivos
       WHERE dispositivo_id = $1 AND criado_em >= CURRENT_DATE - INTERVAL '7 days'`,
      [id]
    )

    const taxa = taxaResult.rows[0] || { total_presencas: '0', total_lotes: '0', total_erros: '0' }
    const totalScans = parseInt(taxa.total_presencas || '0') + parseInt(taxa.total_lotes || '0')
    const totalErros = parseInt(taxa.total_erros || '0')
    const taxaSucesso = totalScans + totalErros > 0
      ? Math.round((totalScans / (totalScans + totalErros)) * 100)
      : 100

    // Montar array de 24 horas
    const scansPorHora = Array.from({ length: 24 }, (_, i) => {
      const found = porHoraResult.rows.find((r: any) => parseInt(r.hora) === i)
      return { hora: i, total: found ? parseInt(found.total) : 0 }
    })

    return NextResponse.json({
      total_hoje: parseInt(hojeResult.rows[0]?.total_hoje || '0'),
      scans_por_hora: scansPorHora,
      ultimos_7_dias: semanaResult.rows.map((r: any) => ({
        data: r.data,
        total: parseInt(r.total),
      })),
      taxa_sucesso: taxaSucesso,
      total_erros_semana: totalErros,
      logs_recentes: logsResult.rows,
    })
  } catch (error: any) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
