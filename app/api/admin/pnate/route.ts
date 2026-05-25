/**
 * /api/admin/pnate
 *
 * GET ?recurso=veiculos|motoristas|rotas|alertas — lista o recurso
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  listarVeiculos,
  listarMotoristas,
  listarRotas,
  alertasVencimento,
} from '@/lib/services/pnate.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'rotas'

  switch (recurso) {
    case 'veiculos': {
      const dados = await listarVeiculos({
        vencidos: searchParams.get('vencidos') === 'true',
      })
      return NextResponse.json({ veiculos: dados })
    }
    case 'motoristas': {
      const dados = await listarMotoristas({
        vencidos: searchParams.get('vencidos') === 'true',
      })
      return NextResponse.json({ motoristas: dados })
    }
    case 'rotas': {
      const dados = await listarRotas({
        escolaId: searchParams.get('escola') || undefined,
      })
      return NextResponse.json({ rotas: dados })
    }
    case 'alertas': {
      const dados = await alertasVencimento()
      return NextResponse.json(dados)
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})
