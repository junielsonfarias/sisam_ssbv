import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { buscarAlunoQuestoes } from '@/lib/services/alunoQuestoes.service'

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola', 'polo'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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
    console.error('Erro ao buscar questões do aluno:', error)
    return NextResponse.json(
      { mensagem: 'Erro ao buscar questões do aluno' },
      { status: 500 }
    )
  }
}
