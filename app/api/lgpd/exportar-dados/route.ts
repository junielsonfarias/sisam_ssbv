/**
 * POST /api/lgpd/exportar-dados
 *
 * LGPD Art. 18 II: direito de acesso aos dados pessoais.
 *
 * Gera e retorna JSON com TODOS os dados do titular autenticado.
 * Inclui dados do usuário, filhos (se responsável), boletins, frequência,
 * mensagens, logs de acesso, consentimentos faciais.
 *
 * Conteúdo retornado como download direto (Content-Disposition).
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { coletarDadosTitular, registrarSolicitacaoExportacao } from '@/lib/services/lgpd.service'
import { getClientIP } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (request, usuario) => {
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || undefined

  // Registra solicitação para auditoria
  await registrarSolicitacaoExportacao({
    usuarioId: usuario.id,
    tipo: 'exportar',
    ip,
    userAgent,
  })

  // Coleta dados
  const dados = await coletarDadosTitular(usuario.id, 'completo')

  // Retorna como download
  const filename = `meus-dados-${usuario.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`
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
