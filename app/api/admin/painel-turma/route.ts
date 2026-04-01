import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { buscarPainelTurma } from '@/lib/services/painelTurma.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/painel-turma
 * Retorna dados do painel da turma: alunos, status de entrada, horário do dia, frequência por aula
 * Params: turma_id, data (YYYY-MM-DD, default: hoje)
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    const resultado = await buscarPainelTurma(turmaId, data)

    if (!resultado) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    return NextResponse.json(resultado)
  } catch (error: unknown) {
    console.error('Erro no painel da turma:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
