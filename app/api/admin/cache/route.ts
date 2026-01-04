import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import {
  limparTodosOsCaches,
  limparCachesExpirados,
  obterInfoCaches,
  obterInfoCache
} from '@/lib/cache-dashboard'
import {
  memoryCache,
  invalidateDashboardCache,
  invalidateFiltrosCache
} from '@/lib/cache-memoria'
import { getPoolStats } from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cache
 * Retorna informações sobre os caches (memória + arquivo)
 *
 * Parâmetros:
 * - acao=limpar_expirados: Limpa caches expirados
 * - acao=limpar_todos: Limpa todos os caches
 * - acao=limpar_memoria: Limpa apenas cache em memória
 * - acao=stats: Retorna estatísticas detalhadas
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const acao = request.nextUrl.searchParams.get('acao')

    // Limpar caches expirados (memória + arquivo)
    if (acao === 'limpar_expirados') {
      const removidosArquivo = limparCachesExpirados()
      const removidosMemoria = memoryCache.cleanExpired()
      return NextResponse.json({
        mensagem: `Caches expirados removidos`,
        removidosArquivo,
        removidosMemoria,
        total: removidosArquivo + removidosMemoria
      })
    }

    // Limpar todos os caches (memória + arquivo)
    if (acao === 'limpar_todos') {
      limparTodosOsCaches()
      memoryCache.clear()
      return NextResponse.json({
        mensagem: 'Todos os caches foram limpos (memória + arquivo)',
        success: true
      })
    }

    // Limpar apenas cache em memória (mais rápido)
    if (acao === 'limpar_memoria') {
      memoryCache.clear()
      return NextResponse.json({
        mensagem: 'Cache em memória limpo com sucesso',
        success: true
      })
    }

    // Invalidar cache do dashboard (após importações)
    if (acao === 'invalidar_dashboard') {
      invalidateDashboardCache()
      return NextResponse.json({
        mensagem: 'Cache do dashboard invalidado',
        success: true
      })
    }

    // Invalidar cache de filtros
    if (acao === 'invalidar_filtros') {
      invalidateFiltrosCache()
      return NextResponse.json({
        mensagem: 'Cache de filtros invalidado',
        success: true
      })
    }

    // Estatísticas detalhadas
    if (acao === 'stats') {
      const memoriaStats = memoryCache.getStats()
      const poolStats = getPoolStats()

      return NextResponse.json({
        memoria: {
          ...memoriaStats,
          hitRateFormatado: `${memoriaStats.hitRate.toFixed(1)}%`
        },
        pool: poolStats,
        timestamp: new Date().toISOString()
      })
    }

    // Retornar informações completas dos caches
    const infoArquivo = obterInfoCaches()
    const infoMemoria = memoryCache.getStats()
    const poolStats = getPoolStats()

    return NextResponse.json({
      cacheArquivo: {
        ...infoArquivo,
        tamanhoTotalKB: (infoArquivo.tamanhoTotal / 1024).toFixed(2),
        tamanhoTotalMB: (infoArquivo.tamanhoTotal / 1024 / 1024).toFixed(2)
      },
      cacheMemoria: {
        ...infoMemoria,
        hitRateFormatado: `${infoMemoria.hitRate.toFixed(1)}%`
      },
      poolConexoes: poolStats,
      recomendacoes: gerarRecomendacoes(infoMemoria, poolStats)
    })
  } catch (error: any) {
    console.error('Erro ao gerenciar cache:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro ao gerenciar cache' },
      { status: 500 }
    )
  }
}

/**
 * Gera recomendações de otimização baseadas nas estatísticas
 */
function gerarRecomendacoes(
  memoriaStats: { hitRate: number; entries: number },
  poolStats: { waiting: number; activeQueries: number; queuedQueries: number }
): string[] {
  const recomendacoes: string[] = []

  // Verificar hit rate do cache
  if (memoriaStats.hitRate < 50 && memoriaStats.entries > 10) {
    recomendacoes.push('Hit rate do cache baixo. Considere aumentar o TTL do cache.')
  }

  // Verificar fila de queries
  if (poolStats.queuedQueries > 10) {
    recomendacoes.push('Muitas queries na fila. Considere usar Transaction Mode do Supabase (porta 6543).')
  }

  // Verificar conexões aguardando
  if (poolStats.waiting > 5) {
    recomendacoes.push('Muitas conexões aguardando. Considere aumentar o pool ou otimizar queries.')
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push('Sistema operando normalmente.')
  }

  return recomendacoes
}
