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
import { withAuth } from '@/lib/auth/with-auth'
import { getEstatisticas, getEstatisticasPadrao } from '@/lib/services/estatisticas.service'
import { okComCache, okComFallback } from '@/lib/api-utils'
import { withRedisCache, cacheKey } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminEstatisticas')

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const serie = request.nextUrl.searchParams.get('serie') || undefined
    const anoLetivo = request.nextUrl.searchParams.get('ano_letivo') || new Date().getFullYear().toString()
    const avaliacaoId = request.nextUrl.searchParams.get('avaliacao_id') || undefined

    const redisKey = cacheKey('stats', anoLetivo, serie, avaliacaoId)
    const estatisticas = await withRedisCache(redisKey, CACHE_TTL.DASHBOARD, () =>
      getEstatisticas(usuario, { serie, anoLetivo, avaliacaoId })
    )

    return okComCache(estatisticas, 'banco')
  } catch (error: unknown) {
    log.error('Erro ao buscar estatísticas', error)
    return okComFallback(getEstatisticasPadrao(), error)
  }
})
