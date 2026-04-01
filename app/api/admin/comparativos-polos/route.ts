import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { buscarComparativoPolos } from '@/lib/services/comparativos.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ComparativosPolos')

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Sempre revalidar, sem cache

export const GET = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
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
    log.error('Erro ao buscar comparativo de polos', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
