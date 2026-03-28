/**
 * API de Estatísticas - Administrador/Técnico
 *
 * Retorna estatísticas globais do sistema (todas as escolas e polos).
 * Sempre busca dados frescos do banco de dados.
 * Acesso restrito a usuários do tipo 'administrador' ou 'tecnico'.
 *
 * @route GET /api/admin/estatisticas
 */

import { NextRequest } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { forbidden, okComCache, okComFallback } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return forbidden()
    }

    const serie = request.nextUrl.searchParams.get('serie') || undefined
    const anoLetivo = request.nextUrl.searchParams.get('ano_letivo') || new Date().getFullYear().toString()
    const avaliacaoId = request.nextUrl.searchParams.get('avaliacao_id') || undefined

    // Sempre buscar do banco — dados atualizados sem cache stale
    const estatisticas = await getEstatisticas(usuario, { serie, anoLetivo, avaliacaoId })

    return okComCache(estatisticas, 'banco')
  } catch (error: unknown) {
    console.error('[API Admin Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
}
