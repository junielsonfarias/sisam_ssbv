/**
 * API de Estatísticas - Polo
 *
 * Retorna estatísticas filtradas pelo polo do usuário logado.
 * Acesso restrito a usuários do tipo 'polo' com polo_id válido.
 *
 * @route GET /api/polo/estatisticas
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

    // Verificar permissão e se tem polo_id
    if (!usuario || !verificarPermissao(usuario, ['polo']) || !usuario.polo_id) {
      return forbidden()
    }

    // Extrair filtros da query string
    const { searchParams } = new URL(request.url)
    const serie = searchParams.get('serie') || undefined

    // Buscar estatísticas usando o serviço centralizado
    // O serviço detecta automaticamente que é usuário de polo e aplica os filtros
    const estatisticas = await getEstatisticas(usuario, { serie })

    return ok(estatisticas)
  } catch (error: any) {
    console.error('[API Polo Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
}
