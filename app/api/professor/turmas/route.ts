import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  buscarTurmasDoProfessor,
  buscarAnoLetivoAtivo,
  buscarAnosLetivosDoProfessor,
} from '@/lib/services/turmas.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/turmas?ano_letivo=YYYY
 *
 * Lista turmas vinculadas ao professor no ano letivo informado.
 * Default: ano letivo marcado como ativo em anos_letivos
 * (fallback: ano corrente). Devolve tambem a lista de anos disponiveis
 * do professor para popular o seletor da UI.
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const anoParam = searchParams.get('ano_letivo')?.trim() || undefined

  const anoAtivo = await buscarAnoLetivoAtivo()
  const ano = anoParam && /^\d{4}$/.test(anoParam) ? anoParam : anoAtivo

  const [turmas, anosDisponiveis] = await Promise.all([
    buscarTurmasDoProfessor(usuario.id, ano),
    buscarAnosLetivosDoProfessor(usuario.id),
  ])

  return NextResponse.json({
    turmas,
    ano_letivo: ano,
    ano_letivo_ativo: anoAtivo,
    anos_disponiveis: anosDisponiveis,
  })
})
