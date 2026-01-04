import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { limparTodosOsCaches, obterInfoCaches } from '@/lib/cache-dashboard'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cache
 * Retorna informacoes sobre os caches existentes
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Nao autorizado' },
        { status: 403 }
      )
    }

    const info = obterInfoCaches()

    return NextResponse.json({
      sucesso: true,
      ...info,
      tamanhoTotalFormatado: `${(info.tamanhoTotal / 1024 / 1024).toFixed(2)} MB`
    })
  } catch (error: any) {
    console.error('Erro ao obter informacoes do cache:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/cache
 * Limpa todos os caches
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Apenas administradores podem limpar o cache' },
        { status: 403 }
      )
    }

    limparTodosOsCaches()

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Todos os caches foram limpos com sucesso'
    })
  } catch (error: any) {
    console.error('Erro ao limpar cache:', error)
    return NextResponse.json(
      { mensagem: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
