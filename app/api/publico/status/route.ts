/**
 * GET /api/publico/status
 *
 * Endpoint público — status atual dos serviços + incidentes ativos.
 * Sem autenticação.
 */

import { NextResponse } from 'next/server'
import { obterStatusGeral } from '@/lib/services/status-page.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status = await obterStatusGeral()

  // HTTP status code reflete a saúde geral (útil para uptime monitors)
  const httpStatus =
    status.status_global === 'operacional' ? 200
      : status.status_global === 'degradado' ? 200
      : status.status_global === 'manutencao' ? 200
      : status.status_global === 'parcialmente_indisponivel' ? 503
      : 503

  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=30',
    },
  })
}
