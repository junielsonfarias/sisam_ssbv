import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { justificarFalta } from '@/lib/services/frequencia'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/professor/frequencia-diaria/justificar
 * Body: { frequencia_id, justificativa }
 */
export const PATCH = withAuth('professor', async (request, usuario) => {
  const { frequencia_id, justificativa } = await request.json()
  if (!frequencia_id || !justificativa) {
    return NextResponse.json({ mensagem: 'frequencia_id e justificativa são obrigatórios' }, { status: 400 })
  }
  if (typeof justificativa !== 'string' || justificativa.trim().length === 0 || justificativa.length > 500) {
    return NextResponse.json({ mensagem: 'Justificativa deve ter entre 1 e 500 caracteres' }, { status: 400 })
  }

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
