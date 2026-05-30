import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  buscarTurmasDoProfessor,
  buscarAnoLetivoAtivo,
  buscarAnosLetivosDoProfessor,
  buscarStatusSemanalDasTurmas,
} from '@/lib/services/turmas.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/turmas?ano_letivo=YYYY
 *
 * Lista turmas vinculadas ao professor no ano letivo informado.
 * Default: ano letivo marcado como ativo em anos_letivos
 * (fallback: ano corrente). Devolve tambem a lista de anos disponiveis
 * do professor para popular o seletor da UI, e o status de lancamento
 * dos ultimos 7 dias por turma (badge em_dia/pendente/sem_lancamento).
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

  // Status semanal so faz sentido para o ano ativo (semana passada de um ano
  // finalizado nao traz informacao acionavel). Em uma unica query agregada.
  let turmasComStatus = turmas
  if (ano === anoAtivo && turmas.length > 0) {
    const statusMap = await buscarStatusSemanalDasTurmas(turmas.map(t => t.turma_id))
    turmasComStatus = turmas.map(t => ({
      ...t,
      status_semanal: statusMap.get(t.turma_id) ?? null,
    }))
  }

  return NextResponse.json({
    turmas: turmasComStatus,
    ano_letivo: ano,
    ano_letivo_ativo: anoAtivo,
    anos_disponiveis: anosDisponiveis,
  })
})
