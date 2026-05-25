/**
 * GET /api/admin/bncc/habilidades
 *
 * Lista habilidades BNCC com filtros opcionais por query string:
 *  - etapa: EI, EF_AI, EF_AF, EM
 *  - ano: 1-9
 *  - componenteId: ex. LP_AI, MA_AI
 *  - busca: texto livre na descrição ou código
 *  - limite: padrão 100, máx 500
 *  - offset: paginação
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { listarHabilidades } from '@/lib/services/bncc.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request) => {
  const { searchParams } = new URL(request.url)
  const habilidades = await listarHabilidades({
    etapa: searchParams.get('etapa'),
    ano: searchParams.get('ano') ? parseInt(searchParams.get('ano')!, 10) : null,
    componenteId: searchParams.get('componenteId'),
    busca: searchParams.get('busca'),
    campoExperiencia: searchParams.get('campoExperiencia'),
    faixaEtaria: searchParams.get('faixaEtaria'),
    limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined,
  })
  return NextResponse.json({ habilidades, total: habilidades.length })
})
