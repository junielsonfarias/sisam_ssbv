import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/professor/frequencia-diaria/justificar
 * Justifica uma falta
 * Body: { frequencia_id, justificativa }
 */
export async function PATCH(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { frequencia_id, justificativa } = await request.json()
    if (!frequencia_id || !justificativa) {
      return NextResponse.json({ mensagem: 'frequencia_id e justificativa são obrigatórios' }, { status: 400 })
    }

    if (typeof justificativa !== 'string' || justificativa.trim().length === 0 || justificativa.length > 500) {
      return NextResponse.json({ mensagem: 'Justificativa deve ter entre 1 e 500 caracteres' }, { status: 400 })
    }

    // Verificar que a frequência pertence a uma turma vinculada ao professor
    const freqResult = await pool.query(
      `SELECT fd.id, fd.turma_id FROM frequencia_diaria fd
       INNER JOIN professor_turmas pt ON pt.turma_id = fd.turma_id
       WHERE fd.id = $1 AND pt.professor_id = $2 AND pt.ativo = true`,
      [frequencia_id, usuario.id]
    )
    if (freqResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Registro não encontrado ou sem permissão' }, { status: 404 })
    }

    await pool.query(
      `UPDATE frequencia_diaria SET justificativa = $1, status = 'justificado' WHERE id = $2`,
      [justificativa.trim(), frequencia_id]
    )

    return NextResponse.json({ mensagem: 'Justificativa registrada com sucesso' })
  } catch (error: any) {
    console.error('Erro ao justificar falta:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
