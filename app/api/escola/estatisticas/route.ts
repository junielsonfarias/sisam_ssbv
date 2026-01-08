/**
 * API de Estatísticas - Escola
 *
 * Retorna estatísticas filtradas pela escola do usuário logado.
 * Acesso restrito a usuários do tipo 'escola' com escola_id válido.
 *
 * @route GET /api/escola/estatisticas
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

    // Verificar permissão e se tem escola_id
    if (!usuario || !verificarPermissao(usuario, ['escola']) || !usuario.escola_id) {
      return forbidden()
    }

    // Buscar estatísticas usando o serviço centralizado
    // O serviço detecta automaticamente que é usuário de escola e aplica os filtros
    const estatisticas = await getEstatisticas(usuario)

    return ok(estatisticas)
  } catch (error) {
    console.error('[API Escola Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
}
