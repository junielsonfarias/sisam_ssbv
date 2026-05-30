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

  // Buscar turmas do professor — cruzando pt.ano_letivo com t.ano_letivo
  // (defesa em profundidade da Pt.6: vinculo legado de ano antigo nao
  // contamina detecao de risco do ano corrente).
  const turmasResult = await pool.query(
    `SELECT pt.turma_id, t.nome AS turma_nome
     FROM professor_turmas pt
     JOIN turmas t ON t.id = pt.turma_id
     WHERE pt.professor_id = $1
       AND pt.ativo = true
       AND pt.ano_letivo = t.ano_letivo`,
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

  // 1. Alunos com frequência baixa.
  //
  // Padrao alinhado com /api/admin/turmas/[id]/diario-completo:
  // - dias_letivos = contar_dias_letivos(ano_letivo_id, escola_id, dt_ini, dt_fim)
  //   (mesma funcao SQL que considera calendario_eventos: feriados, recessos,
  //   reposicoes — nao apenas dias uteis).
  // - presencas: COUNT FILTER (status = 'presente') da frequencia_diaria.
  // - percentual = presencas / dias_letivos * 100 (NAO media de percentuais
  //   bimestrais — o bug anterior usava AVG(fb.percentual_frequencia), o que
  //   a) so funcionava se frequencia_bimestral estivesse populada (hoje tem
  //   0 registros em prod) e b) descartava ponderacao por dias.
  //
  // COALESCE com frequencia_bimestral preserva o snapshot bimestral quando ele
  // existir (preferindo o oficial), mas nao quebra quando esta vazio.
  //
  // Filtro "lancamentos_total > 0" evita falso positivo no inicio do ano —
  // quando ninguem ainda lancou, todos teriam 0% e apareceriam em risco.
  const freqResult = await pool.query(
    `WITH escopos AS (
       SELECT t.id AS turma_id, t.escola_id, t.ano_letivo,
              al.id AS ano_letivo_id,
              COALESCE(al.data_inicio, (t.ano_letivo || '-01-01')::date) AS dt_ini,
              COALESCE(al.data_fim,    (t.ano_letivo || '-12-31')::date) AS dt_fim
         FROM turmas t
         LEFT JOIN anos_letivos al ON al.ano = t.ano_letivo
        WHERE t.id = ANY($1)
     ),
     dias_por_turma AS (
       SELECT e.turma_id, e.escola_id,
              CASE
                WHEN e.ano_letivo_id IS NOT NULL
                  THEN contar_dias_letivos(e.ano_letivo_id, e.escola_id, e.dt_ini, e.dt_fim)
                ELSE (
                  SELECT COUNT(*)::int
                    FROM generate_series(e.dt_ini, e.dt_fim, '1 day') d
                   WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
                )
              END AS dias_letivos
         FROM escopos e
     ),
     agregado AS (
       SELECT a.id, a.nome, a.turma_id, d.dias_letivos,
              COUNT(*) FILTER (WHERE fd.status = 'presente')::int AS presencas,
              COUNT(*) FILTER (WHERE fd.status IN ('ausente','justificado','presente'))::int AS lancamentos
         FROM alunos a
         JOIN escopos e        ON e.turma_id = a.turma_id
         JOIN dias_por_turma d ON d.turma_id = a.turma_id
         LEFT JOIN frequencia_diaria fd
                ON fd.aluno_id = a.id
               AND fd.turma_id = a.turma_id
               AND fd.data BETWEEN e.dt_ini AND e.dt_fim
        WHERE a.turma_id = ANY($1)
          AND a.ativo = true
          AND a.situacao = 'cursando'
        GROUP BY a.id, a.nome, a.turma_id, d.dias_letivos
     )
     SELECT id, nome, turma_id,
            ROUND(
              CASE WHEN dias_letivos > 0
                THEN (presencas::numeric / dias_letivos) * 100
                ELSE 0
              END
            , 1) AS freq_media
       FROM agregado
      WHERE dias_letivos > 0
        AND lancamentos > 0
        AND (presencas::numeric / dias_letivos) * 100 < 75`,
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
