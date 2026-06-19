import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { frequenciaHoraAulaSchema } from '@/lib/schemas'
import { buscarFrequenciaHoraAula, registrarFrequenciaHoraAula } from '@/lib/services/frequencia'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * IDOR: usuário tipo `escola`/`polo` só opera frequência de turmas do seu
 * escopo. Resolve a escola da turma e valida pertencimento (admin/técnico
 * passam direto). Sibling `frequencia-diaria` já faz scoping; este não fazia.
 */
async function podeOperarTurma(usuario: Parameters<typeof podeAcessarEscola>[0], turmaId: string): Promise<boolean> {
  if (usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') return true
  const r = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turmaId])
  const escolaId = r.rows[0]?.escola_id
  if (!escolaId) return false
  return podeAcessarEscola(usuario, escolaId)
}

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

  if (!(await podeOperarTurma(usuario, turmaId))) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
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

  if (!(await podeOperarTurma(usuario, turma_id))) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
  }

  const salvos = await registrarFrequenciaHoraAula(turma_id, data, numero_aula, disciplina_id, registros, usuario.id)

  return NextResponse.json({
    mensagem: `Frequência registrada: ${salvos} aluno(s) na ${numero_aula}ª aula`,
    salvos,
    numero_aula,
  })
})
