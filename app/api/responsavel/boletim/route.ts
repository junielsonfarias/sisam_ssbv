import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/responsavel/boletim?aluno_id=UUID
 * Retorna notas, frequencia e boletim completo de um filho do responsavel
 * Valida que o aluno pertence ao responsavel logado
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id e obrigatorio' }, { status: 400 })
    }

    // Verificar vinculo: o aluno pertence ao responsavel?
    const vinculoResult = await pool.query(
      'SELECT id FROM responsaveis_alunos WHERE usuario_id = $1 AND aluno_id = $2 AND ativo = true',
      [usuario.id, alunoId]
    )
    if (vinculoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao vinculado a este responsavel' }, { status: 403 })
    }

    // Buscar dados do aluno
    const alunoResult = await pool.query(
      `SELECT a.id, a.nome, a.codigo, a.serie, a.ano_letivo, a.situacao,
              a.data_nascimento, a.pcd, a.turma_id, a.escola_id,
              e.nome AS escola_nome,
              t.codigo AS turma_codigo, t.nome AS turma_nome
       FROM alunos a
       INNER JOIN escolas e ON a.escola_id = e.id
       LEFT JOIN turmas t ON a.turma_id = t.id
       WHERE a.id = $1`,
      [alunoId]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao encontrado' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Buscar em paralelo: notas, frequencia, disciplinas, periodos
    const [notasResult, freqResult, disciplinasResult, periodosResult] = await Promise.all([
      // Notas escolares
      pool.query(
        `SELECT ne.nota_final, ne.nota_recuperacao, ne.faltas,
                ne.disciplina_id, ne.periodo_id,
                d.nome AS disciplina, d.abreviacao, d.codigo AS disciplina_codigo,
                p.nome AS periodo, p.numero
         FROM notas_escolares ne
         INNER JOIN disciplinas_escolares d ON ne.disciplina_id = d.id
         INNER JOIN periodos_letivos p ON ne.periodo_id = p.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY p.numero, d.nome`,
        [alunoId, anoLetivo]
      ),
      // Frequencia por periodo (consolidada).
      //
      // Padrao alinhado com /api/admin/turmas/[id]/diario-completo e
      // /api/boletim — mesma estrategia do fix do dia 30/05 (commit
      // d3dd97d):
      // - dias_letivos via contar_dias_letivos() (respeita calendario)
      // - presencas/faltas: COUNT FILTER em frequencia_diaria
      // - COALESCE com frequencia_bimestral preserva snapshot oficial
      // - CTE tipo_primario evita duplicacao bimestre+semestre derivado
      //
      // Bug anterior: dependia 100% de frequencia_bimestral (snapshot
      // vazio em prod, 0 registros) — boletim do responsavel mostrava
      // sempre vazio mesmo com lancamentos diarios feitos pelo professor.
      pool.query(
        `WITH tipo_primario AS (
           SELECT CASE
             WHEN COUNT(*) FILTER (WHERE tipo = 'bimestre')  > 0 THEN 'bimestre'
             WHEN COUNT(*) FILTER (WHERE tipo = 'trimestre') > 0 THEN 'trimestre'
             WHEN COUNT(*) FILTER (WHERE tipo = 'semestre')  > 0 THEN 'semestre'
             ELSE NULL
           END AS tipo
             FROM periodos_letivos
            WHERE ano_letivo = $2
         ),
         escopos AS (
           SELECT pl.id AS periodo_id, pl.nome, pl.numero, pl.tipo,
                  pl.data_inicio, pl.data_fim,
                  al.id AS ano_letivo_id
             FROM periodos_letivos pl
             LEFT JOIN anos_letivos al ON al.ano = pl.ano_letivo
            WHERE pl.ano_letivo = $2
              AND pl.tipo = (SELECT tipo FROM tipo_primario)
              AND pl.data_inicio IS NOT NULL
              AND pl.data_fim IS NOT NULL
         ),
         dias AS (
           SELECT e.periodo_id,
                  CASE
                    WHEN e.ano_letivo_id IS NOT NULL AND $3::uuid IS NOT NULL
                      THEN contar_dias_letivos(e.ano_letivo_id, $3::uuid, e.data_inicio, e.data_fim)
                    ELSE (
                      SELECT COUNT(*)::int
                        FROM generate_series(e.data_inicio, e.data_fim, '1 day') d
                       WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
                    )
                  END AS dias_letivos
             FROM escopos e
         )
         SELECT e.numero AS bimestre,
                d.dias_letivos AS aulas_dadas,
                COALESCE(fb.presencas,
                         COUNT(*) FILTER (WHERE fd.status = 'presente')::int) AS presencas,
                COALESCE(fb.faltas,
                         COUNT(*) FILTER (WHERE fd.status = 'ausente')::int) AS faltas,
                COALESCE(fb.faltas_justificadas,
                         COUNT(*) FILTER (WHERE fd.status = 'justificado')::int) AS faltas_justificadas,
                COALESCE(fb.percentual_frequencia,
                         CASE WHEN d.dias_letivos > 0
                              THEN ROUND(
                                (COUNT(*) FILTER (WHERE fd.status = 'presente')::numeric / d.dias_letivos) * 100,
                                2
                              )
                              ELSE NULL
                         END) AS percentual_frequencia,
                e.nome AS periodo_nome
           FROM escopos e
           JOIN dias d ON d.periodo_id = e.periodo_id
           LEFT JOIN frequencia_diaria fd
                  ON fd.aluno_id = $1
                 AND fd.turma_id = $4::uuid
                 AND fd.data BETWEEN e.data_inicio AND e.data_fim
           LEFT JOIN frequencia_bimestral fb
                  ON fb.aluno_id = $1
                 AND fb.periodo_id = e.periodo_id
          GROUP BY e.numero, e.nome, d.dias_letivos,
                   fb.presencas, fb.faltas, fb.faltas_justificadas,
                   fb.percentual_frequencia
          ORDER BY e.numero`,
        [alunoId, anoLetivo, aluno.escola_id || null, aluno.turma_id || null]
      ),
      // Disciplinas da turma
      pool.query(
        `SELECT DISTINCT d.id, d.nome, d.codigo, d.abreviacao, d.ordem
         FROM disciplinas_escolares d
         INNER JOIN notas_escolares ne ON ne.disciplina_id = d.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY d.ordem, d.nome`,
        [alunoId, anoLetivo]
      ),
      // Periodos letivos
      pool.query(
        `SELECT DISTINCT p.id, p.nome, p.numero, p.data_inicio, p.data_fim
         FROM periodos_letivos p
         INNER JOIN notas_escolares ne ON ne.periodo_id = p.id
         WHERE ne.aluno_id = $1 AND ne.ano_letivo = $2
         ORDER BY p.numero`,
        [alunoId, anoLetivo]
      ),
    ])

    // Organizar notas por disciplina e periodo
    const notas: Record<string, Record<string, any>> = {}
    for (const row of notasResult.rows) {
      if (!notas[row.disciplina_id]) notas[row.disciplina_id] = {}
      notas[row.disciplina_id][row.numero] = {
        nota_final: row.nota_final,
        nota_recuperacao: row.nota_recuperacao,
        faltas: row.faltas,
      }
    }

    // Calcular frequencia geral
    let totalFaltas = 0
    let totalAulas = 0
    for (const f of freqResult.rows) {
      totalFaltas += parseInt(f.faltas) || 0
      totalAulas += parseInt(f.aulas_dadas) || 0
    }
    const frequenciaGeral = totalAulas > 0 ? Math.round(((totalAulas - totalFaltas) / totalAulas) * 1000) / 10 : 0

    return NextResponse.json({
      aluno,
      disciplinas: disciplinasResult.rows,
      periodos: periodosResult.rows,
      notas,
      frequencia: freqResult.rows,
      frequencia_geral: frequenciaGeral,
      total_faltas: totalFaltas,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar boletim:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
