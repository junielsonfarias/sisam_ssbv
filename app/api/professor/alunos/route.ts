import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { buscarAlunosProfessor } from '@/lib/services/alunos.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/alunos?turma_id=X
 * Lista alunos de uma turma vinculada ao professor
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    // Verificar vínculo
    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    const alunos = await buscarAlunosProfessor(turmaId)

    return NextResponse.json({ alunos })
  } catch (error: unknown) {
    console.error('Erro ao listar alunos do professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
