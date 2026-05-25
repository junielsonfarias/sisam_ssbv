/**
 * GET /api/admin/bncc/estrutura
 *
 * Retorna a estrutura curricular completa da BNCC: etapas, componentes,
 * competências gerais. Útil para popular selects/filtros no frontend.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { listarEtapas, listarComponentes, listarCompetenciasGerais } from '@/lib/services/bncc.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async () => {
  const [etapas, componentes, competencias] = await Promise.all([
    listarEtapas(),
    listarComponentes(),
    listarCompetenciasGerais(),
  ])

  return NextResponse.json({ etapas, componentes, competencias })
})
