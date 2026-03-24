import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { lancarFaltas } from '@/lib/services/frequencia'
import { validateRequest, lancarFaltasSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frequencia-diaria/lancar-faltas
 * Lança falta para alunos da turma sem registro no dia
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const validacao = await validateRequest(request, lancarFaltasSchema)
  if (!validacao.success) return validacao.response
  const { turma_id, data } = validacao.data

  // Verificar permissão de escola
  if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turma_id])
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    if (turmaResult.rows[0].escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }
  }

  const totalFaltas = await lancarFaltas(turma_id, data, usuario.id)

  return NextResponse.json({
    mensagem: `${totalFaltas} falta(s) lançada(s) com sucesso`,
    total_faltas: totalFaltas,
  })
})
