import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { buscarHistoricoEscolar } from '@/lib/services/historicoEscolar.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id é obrigatório' }, { status: 400 })
    }

    const resultado = await buscarHistoricoEscolar(alunoId)

    if (!resultado) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Filtrar por escola se usuário é escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && resultado.aluno.escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    return NextResponse.json(resultado)

  } catch (error: unknown) {
    console.error('Erro ao buscar histórico escolar:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
