import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/alunos?turma_id=X
 * Lista alunos de uma turma vinculada ao professor
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')

    if (!turmaId) {
      return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
    }

    // Verificar vínculo
    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    const result = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.data_nascimento, a.situacao
       FROM alunos a
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       ORDER BY a.nome`,
      [turmaId]
    )

    return NextResponse.json({ alunos: result.rows })
  } catch (error: any) {
    console.error('Erro ao listar alunos do professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
