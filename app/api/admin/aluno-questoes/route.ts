import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { buscarAlunoQuestoes } from '@/lib/services/alunoQuestoes.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('AlunoQuestoes')

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const anoLetivo = searchParams.get('ano_letivo')
    // Limite de segurança para evitar retornos muito grandes
    const limiteSeguranca = Math.min(
      parseInt(searchParams.get('limite') || '500', 10),
      1000
    )

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'ID do aluno é obrigatório' }, { status: 400 })
    }

    const result = await buscarAlunoQuestoes(alunoId, anoLetivo, limiteSeguranca)

    if (!result) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    log.error('Erro ao buscar questões do aluno', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar questões do aluno' },
      { status: 500 }
    )
  }
})
