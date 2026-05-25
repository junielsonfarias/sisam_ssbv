/**
 * GET /api/admin/kpis-semed
 *
 * Retorna painel completo de KPIs municipais.
 * Query params:
 *  - ano: ano letivo (default: ano atual)
 *  - comparativo: 'true' para incluir comparativo por escola
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { obterKpisCompletos } from '@/lib/services/kpis-semed.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo'], async (request) => {
  const { searchParams } = new URL(request.url)
  const ano = searchParams.get('ano') || String(new Date().getFullYear())
  const incluirComparativo = searchParams.get('comparativo') === 'true'

  const kpis = await obterKpisCompletos(ano, incluirComparativo)
  return NextResponse.json(kpis)
})
