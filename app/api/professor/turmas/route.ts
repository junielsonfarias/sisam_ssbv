import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { buscarTurmasDoProfessor } from '@/lib/services/turmas.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/turmas
 * Lista turmas vinculadas ao professor com info de escola, série, disciplina
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const turmas = await buscarTurmasDoProfessor(usuario.id)

  return NextResponse.json({ turmas })
})
