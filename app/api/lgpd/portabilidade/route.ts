/**
 * POST /api/lgpd/portabilidade
 *
 * LGPD Art. 18 V: direito à portabilidade dos dados a outro fornecedor de serviço
 * ou produto, mediante requisição expressa.
 *
 * Gera JSON em formato interoperável (sem IDs internos) que pode ser
 * importado em outro sistema educacional municipal.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { coletarDadosTitular, registrarSolicitacaoExportacao } from '@/lib/services/lgpd.service'
import { getClientIP } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (request, usuario) => {
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || undefined

  await registrarSolicitacaoExportacao({
    usuarioId: usuario.id,
    tipo: 'portabilidade',
    ip,
    userAgent,
  })

  const dados = await coletarDadosTitular(usuario.id, 'portabilidade')

  const filename = `portabilidade-${new Date().toISOString().slice(0, 10)}.json`
  const json = JSON.stringify(dados, null, 2)

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
})
