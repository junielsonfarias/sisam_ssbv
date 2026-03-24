import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'
import { lancarFaltas } from '@/lib/services/frequencia'
import { validateRequest, lancarFaltasSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export const POST = withAuth('professor', async (request, usuario) => {
  const result = await validateRequest(request, lancarFaltasSchema)
  if (!result.success) return result.response
  const { turma_id, data } = result.data

  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const totalFaltas = await lancarFaltas(turma_id, data, usuario.id)

  return NextResponse.json({
    mensagem: `${totalFaltas} falta(s) lançada(s) com sucesso`,
    total_faltas: totalFaltas,
  })
})
