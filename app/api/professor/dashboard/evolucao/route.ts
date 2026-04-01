import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido'),
})

/**
 * GET /api/professor/dashboard/evolucao
 * Média por disciplina × período para a turma (dados para gráfico de evolução)
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({ turma_id: searchParams.get('turma_id') })

  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'turma_id inválido ou ausente' }, { status: 400 })
  }

  const { turma_id } = parsed.data

  // Verificar vínculo do professor com a turma
  const vinculo = await pool.query(
    `SELECT id FROM professor_turmas
     WHERE professor_id = $1 AND turma_id = $2 AND ativo = true
     LIMIT 1`,
    [usuario.id, turma_id]
  )

  if (vinculo.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  // Buscar médias por disciplina e período
  const result = await pool.query(
    `SELECT
       d.nome AS disciplina,
       d.abreviacao,
       d.codigo,
       p.nome AS periodo,
       p.numero AS periodo_numero,
       ROUND(AVG(ne.nota_final)::numeric, 2) AS media
     FROM notas_escolares ne
     JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
     JOIN periodos_letivos p ON ne.periodo_id = p.id
     JOIN alunos a ON ne.aluno_id = a.id
     WHERE a.turma_id = $1
       AND a.ativo = true
       AND a.situacao = 'cursando'
       AND ne.nota_final IS NOT NULL
     GROUP BY d.id, d.nome, d.abreviacao, d.codigo, d.ordem, p.id, p.nome, p.numero, p.data_inicio
     ORDER BY p.data_inicio, d.ordem`,
    [turma_id]
  )

  // Formatar para Recharts: array de objetos com { periodo, LP, MAT, CIE, ... }
  const periodos = [...new Set(result.rows.map((r: any) => r.periodo))]
  const disciplinas = [...new Map(
    result.rows.map((r: any) => [r.codigo, { nome: r.disciplina, abreviacao: r.abreviacao, codigo: r.codigo }])
  ).values()]

  const dados = periodos.map(periodo => {
    const ponto: Record<string, string | number> = { periodo }
    result.rows
      .filter((r: any) => r.periodo === periodo)
      .forEach((r: any) => {
        ponto[r.codigo] = parseFloat(r.media)
      })
    return ponto
  })

  return NextResponse.json({ dados, disciplinas, periodos })
})
