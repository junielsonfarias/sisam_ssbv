import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { buscarComparativoPolos } from '@/lib/services/comparativos.service'

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache

export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const polosIds = searchParams.get('polos_ids')?.split(',').filter(Boolean) || []
    const anoLetivo = searchParams.get('ano_letivo')
    const serie = searchParams.get('serie')
    const escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')
    const avaliacaoId = searchParams.get('avaliacao_id')

    if (polosIds.length !== 2) {
      return NextResponse.json(
        { mensagem: 'Selecione exatamente 2 polos para comparar' },
        { status: 400 }
      )
    }

    const result = await buscarComparativoPolos({
      polosIds: [polosIds[0], polosIds[1]],
      anoLetivo,
      serie,
      escolaId,
      turmaId,
      avaliacaoId,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Erro ao buscar comparativo de polos:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
