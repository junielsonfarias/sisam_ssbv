import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'
import { lancarFaltas } from '@/lib/services/frequencia'

export const dynamic = 'force-dynamic'

export const POST = withAuth('professor', async (request, usuario) => {
  const { turma_id, data } = await request.json()
  if (!turma_id || !data) {
    return NextResponse.json({ mensagem: 'turma_id e data são obrigatórios' }, { status: 400 })
  }
  if (!validarData(data)) {
    return NextResponse.json({ mensagem: 'Formato de data inválido (use YYYY-MM-DD)' }, { status: 400 })
  }

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
