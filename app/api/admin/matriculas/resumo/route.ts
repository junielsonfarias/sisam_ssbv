import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { buscarResumoMatriculas } from '@/lib/services/matriculas.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!escolaId) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    // Escola só pode ver resumo da própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escolaId !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const resumo = await buscarResumoMatriculas(escolaId, anoLetivo)

    return NextResponse.json(resumo)
  } catch (error: unknown) {
    console.error('Erro ao buscar resumo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
