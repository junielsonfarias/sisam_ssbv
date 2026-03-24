import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { parseSearchParams } from '@/lib/api-helpers'
import { buscarEmbeddings } from '@/lib/services/facial.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/facial/embeddings
 * Busca todos os embeddings de uma escola (para terminal web)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const { escola_id, turma_id } = parseSearchParams(searchParams, ['escola_id', 'turma_id'])
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!escola_id) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await buscarEmbeddings(escola_id, anoLetivo, turma_id)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Erro ao buscar embeddings:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
