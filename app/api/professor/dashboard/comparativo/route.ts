import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
})

/**
 * GET /api/professor/dashboard/comparativo
 * Média da turma vs média da escola por disciplina
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({ turma_id: searchParams.get('turma_id') })

  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'turma_id inválido ou ausente' }, { status: 400 })
  }

  const { turma_id } = parsed.data

  // Verificar vínculo e obter escola_id
  const vinculo = await pool.query(
    `SELECT pt.id, t.escola_id
     FROM professor_turmas pt
     JOIN turmas t ON t.id = pt.turma_id
     WHERE pt.professor_id = $1 AND pt.turma_id = $2 AND pt.ativo = true
     LIMIT 1`,
    [usuario.id, turma_id]
  )

  if (vinculo.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const escolaId = vinculo.rows[0].escola_id

  // Comparativo: média da turma vs média da escola por disciplina
  const result = await pool.query(
    `SELECT
       d.nome AS disciplina,
       d.abreviacao,
       d.codigo,
       ROUND(AVG(CASE WHEN a.turma_id = $1 THEN ne.nota_final END)::numeric, 2) AS media_turma,
       ROUND(AVG(ne.nota_final)::numeric, 2) AS media_escola
     FROM notas_escolares ne
     JOIN alunos a ON ne.aluno_id = a.id
     JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
     WHERE ne.escola_id = $2
       AND ne.nota_final IS NOT NULL
       AND a.ativo = true
       AND a.situacao = 'cursando'
     GROUP BY d.id, d.nome, d.abreviacao, d.codigo, d.ordem
     HAVING AVG(CASE WHEN a.turma_id = $1 THEN ne.nota_final END) IS NOT NULL
     ORDER BY d.ordem`,
    [turma_id, escolaId]
  )

  const dados = result.rows.map((r: any) => ({
    disciplina: r.abreviacao || r.codigo,
    media_turma: parseFloat(r.media_turma),
    media_escola: parseFloat(r.media_escola),
  }))

  return NextResponse.json({ dados })
})
