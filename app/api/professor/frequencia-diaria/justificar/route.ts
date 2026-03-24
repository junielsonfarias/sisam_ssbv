import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { justificarFalta } from '@/lib/services/frequencia'
import { validateRequest, professorJustificarSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/professor/frequencia-diaria/justificar
 * Body: { frequencia_id, justificativa }
 */
export const PATCH = withAuth('professor', async (request, usuario) => {
  const result = await validateRequest(request, professorJustificarSchema)
  if (!result.success) return result.response
  const { frequencia_id, justificativa } = result.data

  // Verificar que a frequência pertence a uma turma vinculada ao professor
  const freqResult = await pool.query(
    `SELECT fd.id FROM frequencia_diaria fd
     INNER JOIN professor_turmas pt ON pt.turma_id = fd.turma_id
     WHERE fd.id = $1 AND pt.professor_id = $2 AND pt.ativo = true`,
    [frequencia_id, usuario.id]
  )
  if (freqResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado ou sem permissão' }, { status: 404 })
  }

  await justificarFalta(frequencia_id, justificativa)
  return NextResponse.json({ mensagem: 'Justificativa registrada com sucesso' })
})
