/**
 * API de Estatísticas - Técnico
 *
 * Retorna estatísticas globais do sistema (mesma lógica do admin).
 * Acesso restrito a usuários do tipo 'tecnico'.
 *
 * @route GET /api/tecnico/estatisticas
 */

import { NextRequest } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { forbidden, ok, okComFallback } from '@/lib/api-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['tecnico'])) {
      return forbidden()
    }

    // Buscar estatísticas usando o serviço centralizado
    const estatisticas = await getEstatisticas(usuario)

    return ok(estatisticas)
  } catch (error: any) {
    console.error('[API Tecnico Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
}
