import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { listarHabilidades, mapearDisciplinaParaComponenteBncc } from '@/lib/services/bncc.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/bncc/habilidades
 *   ?disciplina_id=UUID  (opcional — busca o codigo + mapeia para componente BNCC)
 *   ?turma_id=UUID       (opcional — usa a serie para definir etapa AI/AF)
 *   ?componente_id=ID    (opcional — sobrescreve mapeamento, ex: LP_AI)
 *   ?ano=1..9            (opcional)
 *   ?busca=texto         (opcional, min 3 chars)
 *   ?limite=N            (default 100, max 500)
 *
 * Espelho do /api/admin/bncc/habilidades, mas autorizado para professor
 * e com mapeamento automatico disciplina -> componente BNCC.
 */
export const GET = withAuth(['professor', 'administrador', 'tecnico'], async (request) => {
  const { searchParams } = new URL(request.url)
  const disciplinaId = searchParams.get('disciplina_id')
  const turmaId = searchParams.get('turma_id')
  const componenteIdParam = searchParams.get('componente_id')
  const anoParam = searchParams.get('ano')
  const busca = searchParams.get('busca')
  const limiteParam = searchParams.get('limite')
  const offsetParam = searchParams.get('offset')

  // 1) Resolver serie da turma (se fornecida) — define etapa AI vs AF.
  let serieTurma: string | null = null
  if (turmaId) {
    const r = await pool.query('SELECT serie FROM turmas WHERE id = $1', [turmaId])
    serieTurma = r.rows[0]?.serie ?? null
  }

  // 2) Resolver componente BNCC.
  let componenteId: string | null = componenteIdParam || null
  if (!componenteId && disciplinaId) {
    const r = await pool.query(
      'SELECT codigo FROM disciplinas_escolares WHERE id = $1',
      [disciplinaId]
    )
    const codigoDisciplina = r.rows[0]?.codigo
    componenteId = mapearDisciplinaParaComponenteBncc(codigoDisciplina, serieTurma)
  }

  // 3) Inferir etapa quando ainda nao temos componente.
  let etapa: string | null = null
  if (!componenteId && serieTurma) {
    const num = parseInt(String(serieTurma).replace(/[^0-9]/g, ''), 10)
    if (Number.isFinite(num)) etapa = num >= 1 && num <= 5 ? 'EF_AI' : 'EF_AF'
  }

  const habilidades = await listarHabilidades({
    componenteId: componenteId ?? null,
    etapa,
    ano: anoParam ? parseInt(anoParam, 10) : null,
    busca,
    limite: limiteParam ? parseInt(limiteParam, 10) : undefined,
    offset: offsetParam ? parseInt(offsetParam, 10) : undefined,
  })

  return NextResponse.json({
    habilidades,
    total: habilidades.length,
    filtros_aplicados: {
      componente_id: componenteId,
      etapa,
      serie_turma: serieTurma,
    },
  })
})
