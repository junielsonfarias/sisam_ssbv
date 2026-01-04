import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { 
  limparTodosOsCaches, 
  limparCachesExpirados, 
  obterInfoCaches,
  obterInfoCache 
} from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cache
 * Retorna informações sobre os caches
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
    
    // Limpar caches expirados
    if (acao === 'limpar_expirados') {
      const removidos = limparCachesExpirados()
      return NextResponse.json({
        mensagem: `${removidos} cache(s) expirado(s) removido(s)`,
        removidos
      })
    }

    // Limpar todos os caches
    if (acao === 'limpar_todos') {
      limparTodosOsCaches()
      return NextResponse.json({
        mensagem: 'Todos os caches foram limpos com sucesso'
      })
    }

    // Retornar informações dos caches
    const info = obterInfoCaches()
    
    return NextResponse.json({
      ...info,
      tamanhoTotalKB: (info.tamanhoTotal / 1024).toFixed(2),
      tamanhoTotalMB: (info.tamanhoTotal / 1024 / 1024).toFixed(2)
    })
  } catch (error: any) {
    console.error('Erro ao gerenciar cache:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro ao gerenciar cache' },
      { status: 500 }
    )
  }
}
