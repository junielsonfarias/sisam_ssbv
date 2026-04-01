import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  turma_id: z.string().uuid('turma_id deve ser UUID válido').optional(),
})

interface AlunoRisco {
  id: string
  nome: string
  turma_nome: string
  turma_id: string
  motivos_risco: string[]
  gravidade: 'alta' | 'media' | 'baixa'
}

/**
 * GET /api/professor/dashboard/alunos-risco
 * Alunos com frequência < 75% ou 2+ disciplinas abaixo da média de aprovação
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({ turma_id: searchParams.get('turma_id') || undefined })

  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Parâmetros inválidos' }, { status: 400 })
  }

  const turmaId = parsed.data.turma_id

  // Buscar turmas do professor
  const turmasResult = await pool.query(
    `SELECT pt.turma_id, t.nome AS turma_nome
     FROM professor_turmas pt
     JOIN turmas t ON t.id = pt.turma_id
     WHERE pt.professor_id = $1 AND pt.ativo = true`,
    [usuario.id]
  )

  if (turmasResult.rows.length === 0) {
    return NextResponse.json({ alunos: [], total: 0 })
  }

  const turmaIds = turmaId
    ? turmasResult.rows.filter((t: any) => t.turma_id === turmaId).map((t: any) => t.turma_id)
    : turmasResult.rows.map((t: any) => t.turma_id)

  if (turmaIds.length === 0) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const turmaMap = new Map(turmasResult.rows.map((t: any) => [t.turma_id, t.turma_nome]))

  // 1. Alunos com frequência baixa (via frequencia_bimestral)
  const freqResult = await pool.query(
    `SELECT a.id, a.nome, a.turma_id,
            ROUND(AVG(fb.percentual_frequencia)::numeric, 1) AS freq_media
     FROM alunos a
     JOIN frequencia_bimestral fb ON fb.aluno_id = a.id
     WHERE a.turma_id = ANY($1)
       AND a.ativo = true AND a.situacao = 'cursando'
     GROUP BY a.id, a.nome, a.turma_id
     HAVING AVG(fb.percentual_frequencia) < 75`,
    [turmaIds]
  )

  // 2. Alunos com 2+ disciplinas abaixo de 6.0 (último período com notas)
  const notasResult = await pool.query(
    `WITH ultimo_periodo AS (
       SELECT ne.aluno_id, ne.disciplina_id, ne.nota_final,
              d.nome AS disciplina_nome,
              ROW_NUMBER() OVER (PARTITION BY ne.aluno_id, ne.disciplina_id ORDER BY p.numero DESC) AS rn
       FROM notas_escolares ne
       JOIN periodos_letivos p ON ne.periodo_id = p.id
       JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
       JOIN alunos a ON ne.aluno_id = a.id
       WHERE a.turma_id = ANY($1)
         AND a.ativo = true AND a.situacao = 'cursando'
         AND ne.nota_final IS NOT NULL
     )
     SELECT up.aluno_id AS id, a.nome, a.turma_id,
            COUNT(*) AS disciplinas_abaixo,
            ARRAY_AGG(up.disciplina_nome) AS disciplinas
     FROM ultimo_periodo up
     JOIN alunos a ON a.id = up.aluno_id
     WHERE up.rn = 1 AND up.nota_final < 6.0
     GROUP BY up.aluno_id, a.nome, a.turma_id
     HAVING COUNT(*) >= 2`,
    [turmaIds]
  )

  // Consolidar resultados
  const alunosMap = new Map<string, AlunoRisco>()

  for (const row of freqResult.rows as any[]) {
    alunosMap.set(row.id, {
      id: row.id,
      nome: row.nome,
      turma_nome: turmaMap.get(row.turma_id) || '',
      turma_id: row.turma_id,
      motivos_risco: [`Frequência ${row.freq_media}%`],
      gravidade: parseFloat(row.freq_media) < 50 ? 'alta' : 'media',
    })
  }

  for (const row of notasResult.rows as any[]) {
    const existente = alunosMap.get(row.id)
    const motivo = `${row.disciplinas_abaixo} disciplinas abaixo de 6.0 (${row.disciplinas.join(', ')})`

    if (existente) {
      existente.motivos_risco.push(motivo)
      existente.gravidade = 'alta' // Frequência + notas = alta
    } else {
      alunosMap.set(row.id, {
        id: row.id,
        nome: row.nome,
        turma_nome: turmaMap.get(row.turma_id) || '',
        turma_id: row.turma_id,
        motivos_risco: [motivo],
        gravidade: parseInt(row.disciplinas_abaixo) >= 3 ? 'alta' : 'media',
      })
    }
  }

  const alunos = [...alunosMap.values()].sort((a, b) => {
    const ordemGravidade = { alta: 0, media: 1, baixa: 2 }
    return ordemGravidade[a.gravidade] - ordemGravidade[b.gravidade]
  })

  return NextResponse.json({ alunos, total: alunos.length })
})
