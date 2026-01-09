/**
 * API de Estatísticas - Administrador/Técnico
 *
 * Retorna estatísticas globais do sistema (todas as escolas e polos).
 * Acesso restrito a usuários do tipo 'administrador' ou 'tecnico'.
 *
 * @route GET /api/admin/estatisticas
 * @query atualizar_cache - Se 'true', força atualização do cache
 */

import { NextRequest } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { forbidden, okComCache, okComFallback } from '@/lib/api-utils'
import { verificarCache, carregarCache, salvarCache, limparCachesExpirados } from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return forbidden()
    }

    // Limpar caches expirados (não crítico)
    try {
      limparCachesExpirados()
    } catch {
      // Ignorar erros de limpeza de cache
    }

    // Configuração do cache
    const cacheOptions = {
      filtros: {},
      tipoUsuario: usuario.tipo_usuario,
      usuarioId: usuario.id,
      poloId: usuario.polo_id || null,
      escolaId: usuario.escola_id || null
    }

    const forcarAtualizacao = request.nextUrl.searchParams.get('atualizar_cache') === 'true'

    // Verificar cache
    if (!forcarAtualizacao && verificarCache(cacheOptions)) {
      const dadosCache = carregarCache<ReturnType<typeof getEstatisticasPadrao>>(cacheOptions)
      if (dadosCache) {
        return okComCache(dadosCache, 'cache')
      }
    }

    // Buscar estatísticas usando o serviço centralizado
    const estatisticas = await getEstatisticas(usuario)

    // Salvar no cache
    try {
      salvarCache(cacheOptions, estatisticas, 'estatisticas')
    } catch {
      // Erro de cache não é crítico
    }

    return okComCache(estatisticas, 'banco')
  } catch (error: any) {
    console.error('[API Admin Estatisticas] Erro:', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
}
