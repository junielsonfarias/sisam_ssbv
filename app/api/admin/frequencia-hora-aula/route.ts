import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { validateRequest } from '@/lib/schemas'
import { frequenciaHoraAulaSchema } from '@/lib/schemas'
import { buscarFrequenciaHoraAula, registrarFrequenciaHoraAula } from '@/lib/services/frequencia'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia-hora-aula?turma_id=X&data=YYYY-MM-DD
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const data = searchParams.get('data')

  if (!turmaId || !data) {
    return NextResponse.json({ mensagem: 'turma_id e data são obrigatórios' }, { status: 400 })
  }

  const resultado = await buscarFrequenciaHoraAula(turmaId, data)
  return NextResponse.json({ frequencias: resultado.frequencias })
})

/**
 * POST /api/admin/frequencia-hora-aula
 * Body: { turma_id, data, numero_aula, disciplina_id, registros: [{aluno_id, presente}] }
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const validacao = await validateRequest(request, frequenciaHoraAulaSchema)
  if (!validacao.success) return validacao.response

  const { turma_id, data, numero_aula, disciplina_id, registros } = validacao.data

  const salvos = await registrarFrequenciaHoraAula(turma_id, data, numero_aula, disciplina_id, registros, usuario.id)

  return NextResponse.json({
    mensagem: `Frequência registrada: ${salvos} aluno(s) na ${numero_aula}ª aula`,
    salvos,
    numero_aula,
  })
})
