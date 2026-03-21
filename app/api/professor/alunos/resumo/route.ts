import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool from '@/database/connection'
import { verificarVinculoProfessor } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/alunos/resumo?turma_id=X
 * Lista alunos com resumo de frequência e notas
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

    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    // Alunos com frequência e notas resumidas
    const result = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.data_nascimento,
              -- Frequência
              COALESCE(freq.total_presentes, 0) as total_presentes,
              COALESCE(freq.total_ausentes, 0) as total_ausentes,
              COALESCE(freq.total_registros, 0) as total_registros,
              CASE WHEN COALESCE(freq.total_registros, 0) > 0
                THEN ROUND(COALESCE(freq.total_presentes, 0)::numeric / freq.total_registros * 100)
                ELSE 0 END as percentual_presenca,
              -- Notas (total lançadas)
              COALESCE(notas.total_notas, 0) as total_notas,
              notas.media_geral
       FROM alunos a
       LEFT JOIN (
         SELECT aluno_id,
                COUNT(CASE WHEN status = 'presente' THEN 1 END) as total_presentes,
                COUNT(CASE WHEN status = 'ausente' OR status = 'justificado' THEN 1 END) as total_ausentes,
                COUNT(*) as total_registros
         FROM frequencia_diaria WHERE turma_id = $1
         GROUP BY aluno_id
       ) freq ON freq.aluno_id = a.id
       LEFT JOIN (
         SELECT aluno_id,
                COUNT(*) as total_notas,
                ROUND(AVG(nota_final)::numeric, 1) as media_geral
         FROM notas_escolares WHERE turma_id = $1 AND nota_final IS NOT NULL
         GROUP BY aluno_id
       ) notas ON notas.aluno_id = a.id
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       ORDER BY a.nome`,
      [turmaId]
    )

    return NextResponse.json({ alunos: result.rows })
  } catch (error: any) {
    console.error('Erro ao buscar resumo alunos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
