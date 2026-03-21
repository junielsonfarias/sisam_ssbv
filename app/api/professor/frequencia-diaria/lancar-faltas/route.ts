import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/professor/frequencia-diaria/lancar-faltas
 * Lança falta para alunos da turma sem registro no dia
 * Body: { turma_id, data }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || usuario.tipo_usuario !== 'professor') {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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

    const turmaResult = await pool.query('SELECT escola_id FROM turmas WHERE id = $1', [turma_id])
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const result = await pool.query(`
      INSERT INTO frequencia_diaria (aluno_id, turma_id, escola_id, data, metodo, status, registrado_por)
      SELECT a.id, $1, $2, $3, 'manual', 'ausente', $4
      FROM alunos a
      WHERE a.turma_id = $1
        AND a.ativo = true
        AND a.situacao = 'cursando'
        AND a.id NOT IN (
          SELECT fd.aluno_id FROM frequencia_diaria fd
          WHERE fd.turma_id = $1 AND fd.data = $3
        )
      RETURNING id
    `, [turma_id, turmaResult.rows[0].escola_id, data, usuario.id])

    return NextResponse.json({
      mensagem: `${result.rows.length} falta(s) lançada(s) com sucesso`,
      total_faltas: result.rows.length,
    })
  } catch (error: any) {
    console.error('Erro ao lançar faltas:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
