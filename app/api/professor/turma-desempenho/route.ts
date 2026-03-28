import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/turma-desempenho?turma_id=X
 * Resumo de desempenho da turma: media por disciplina, acima/abaixo da media
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
  }

  const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const [mediaPorDisciplinaResult, resumoGeralResult] = await Promise.all([
    // Media por disciplina
    pool.query(
      `SELECT d.nome as disciplina, d.abreviacao,
              ROUND(AVG(ne.nota_final)::numeric, 1) as media,
              COUNT(DISTINCT ne.aluno_id) as total_alunos,
              COUNT(DISTINCT ne.aluno_id) FILTER (WHERE ne.nota_final >= 6) as acima_media,
              COUNT(DISTINCT ne.aluno_id) FILTER (WHERE ne.nota_final < 6 AND ne.nota_final IS NOT NULL) as abaixo_media
       FROM notas_escolares ne
       JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
       WHERE ne.turma_id = $1 AND ne.nota_final IS NOT NULL
       GROUP BY d.id, d.nome, d.abreviacao, d.ordem
       ORDER BY d.ordem`,
      [turmaId]
    ),

    // Resumo geral da turma
    pool.query(
      `SELECT
         COUNT(DISTINCT a.id) as total_alunos,
         ROUND(AVG(sub.media_aluno)::numeric, 1) as media_turma,
         COUNT(DISTINCT sub.aluno_id) FILTER (WHERE sub.media_aluno >= 6) as acima_media,
         COUNT(DISTINCT sub.aluno_id) FILTER (WHERE sub.media_aluno < 6) as abaixo_media
       FROM alunos a
       LEFT JOIN (
         SELECT aluno_id, ROUND(AVG(nota_final)::numeric, 1) as media_aluno
         FROM notas_escolares
         WHERE turma_id = $1 AND nota_final IS NOT NULL
         GROUP BY aluno_id
       ) sub ON sub.aluno_id = a.id
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'`,
      [turmaId]
    ),
  ])

  return NextResponse.json({
    disciplinas: mediaPorDisciplinaResult.rows,
    resumo: resumoGeralResult.rows[0] || {
      total_alunos: 0,
      media_turma: null,
      acima_media: 0,
      abaixo_media: 0,
    },
  })
})
