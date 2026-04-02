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
      // Frequencia bimestral
      pool.query(
        `SELECT fb.bimestre, fb.aulas_dadas, fb.faltas, fb.percentual_frequencia,
                fb.presencas, fb.faltas_justificadas,
                p.nome AS periodo_nome
         FROM frequencia_bimestral fb
         LEFT JOIN periodos_letivos p ON fb.periodo_id = p.id
         WHERE fb.aluno_id = $1 AND fb.ano_letivo = $2
         ORDER BY fb.bimestre`,
        [alunoId, anoLetivo]
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
