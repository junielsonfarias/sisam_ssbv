/**
 * GET /api/responsavel/anos-disponiveis?aluno_id=
 *
 * Lista os anos letivos em que o aluno tem dados (notas, frequência, matrícula
 * ou histórico) — para o seletor de ano no portal do responsável.
 * Restrito ao responsável vinculado ao aluno.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['responsavel'], async (request, usuario) => {
  const alunoId = new URL(request.url).searchParams.get('aluno_id')
  if (!alunoId) {
    return NextResponse.json({ mensagem: 'Informe aluno_id' }, { status: 400 })
  }

  const vinculo = await pool.query(
    'SELECT 1 FROM responsaveis_alunos WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true LIMIT 1',
    [usuario.id, alunoId]
  )
  if (vinculo.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Sem permissão para acessar este aluno' }, { status: 403 })
  }

  const r = await pool.query(
    `SELECT ano FROM (
        SELECT DISTINCT ano_letivo AS ano FROM notas_escolares WHERE aluno_id = $1 AND ano_letivo IS NOT NULL
        UNION SELECT DISTINCT ano_letivo FROM frequencia_bimestral WHERE aluno_id = $1 AND ano_letivo IS NOT NULL
        UNION SELECT ano_letivo FROM alunos WHERE id = $1 AND ano_letivo IS NOT NULL
        UNION SELECT EXTRACT(YEAR FROM data)::text FROM historico_situacao WHERE aluno_id = $1
     ) t
     WHERE ano ~ '^[0-9]{4}$'
     ORDER BY ano DESC`,
    [alunoId]
  )

  const anos = r.rows.map((x: { ano: string }) => x.ano)
  // Garante ao menos o ano corrente para não deixar o seletor vazio.
  if (anos.length === 0) anos.push(String(new Date().getFullYear()))

  return NextResponse.json({ anos })
})
