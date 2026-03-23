import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/turmas
 * Lista turmas vinculadas ao professor com info de escola, série, disciplina
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const result = await pool.query(
    `SELECT pt.id as vinculo_id, pt.tipo_vinculo, pt.ano_letivo,
            t.id as turma_id, t.nome as turma_nome, t.serie, t.turno, t.codigo as turma_codigo,
            e.id as escola_id, e.nome as escola_nome,
            de.id as disciplina_id, de.nome as disciplina_nome, de.abreviacao as disciplina_abreviacao,
            se.etapa,
            (SELECT COUNT(*) FROM alunos a WHERE a.turma_id = t.id AND a.ativo = true AND a.situacao = 'cursando') as total_alunos
     FROM professor_turmas pt
     INNER JOIN turmas t ON t.id = pt.turma_id
     INNER JOIN escolas e ON e.id = t.escola_id
     LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
     LEFT JOIN series_escolares se ON se.numero::text = t.serie OR se.nome = t.serie
     WHERE pt.professor_id = $1 AND pt.ativo = true
     ORDER BY e.nome, t.turno, t.serie, t.nome, de.nome`,
    [usuario.id]
  )

  return NextResponse.json({ turmas: result.rows })
})
