import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/dashboard
 * KPIs do professor: turmas, alunos, frequência hoje/semana
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    const hoje = new Date().toISOString().split('T')[0]
    const inicioSemana = new Date()
    inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1)
    const inicioSemanaStr = inicioSemana.toISOString().split('T')[0]

    // Query 1: KPIs consolidados com CTEs
    const kpisResult = await pool.query(
      `WITH minhas_turmas AS (
         SELECT DISTINCT pt.turma_id
         FROM professor_turmas pt
         WHERE pt.professor_id = $1 AND pt.ativo = true
       ),
       kpi_turmas AS (
         SELECT COUNT(*) as total_turmas FROM minhas_turmas
       ),
       kpi_alunos AS (
         SELECT COUNT(DISTINCT a.id) as total_alunos
         FROM alunos a
         INNER JOIN minhas_turmas mt ON mt.turma_id = a.turma_id
         WHERE a.ativo = true AND a.situacao = 'cursando'
       ),
       kpi_freq_hoje AS (
         SELECT
           COUNT(CASE WHEN fd.status = 'presente' THEN 1 END) as presentes_hoje,
           COUNT(CASE WHEN fd.status = 'ausente' THEN 1 END) as ausentes_hoje,
           COUNT(*) as total_hoje
         FROM frequencia_diaria fd
         INNER JOIN minhas_turmas mt ON mt.turma_id = fd.turma_id
         WHERE fd.data = $2
       ),
       kpi_freq_semana AS (
         SELECT
           COUNT(CASE WHEN fd.status = 'presente' THEN 1 END) as presentes_semana,
           COUNT(*) as total_semana
         FROM frequencia_diaria fd
         INNER JOIN minhas_turmas mt ON mt.turma_id = fd.turma_id
         WHERE fd.data >= $3 AND fd.data <= $2
       )
       SELECT
         (SELECT total_turmas FROM kpi_turmas) as total_turmas,
         (SELECT total_alunos FROM kpi_alunos) as total_alunos,
         (SELECT presentes_hoje FROM kpi_freq_hoje) as presentes_hoje,
         (SELECT ausentes_hoje FROM kpi_freq_hoje) as ausentes_hoje,
         (SELECT total_hoje FROM kpi_freq_hoje) as total_hoje,
         (SELECT presentes_semana FROM kpi_freq_semana) as presentes_semana,
         (SELECT total_semana FROM kpi_freq_semana) as total_semana`,
      [usuario.id, hoje, inicioSemanaStr]
    )

    // Query 2: Turmas com detalhes
    const turmasResult = await pool.query(
      `SELECT t.id, t.nome as turma_nome, t.serie, t.turno,
              e.nome as escola_nome,
              pt.tipo_vinculo,
              de.nome as disciplina_nome,
              COALESCE(ac.total, 0) as total_alunos,
              COALESCE(fc.registros, 0) as registros_hoje
       FROM professor_turmas pt
       INNER JOIN turmas t ON t.id = pt.turma_id
       INNER JOIN escolas e ON e.id = t.escola_id
       LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) as total FROM alunos a
         WHERE a.turma_id = t.id AND a.ativo = true AND a.situacao = 'cursando'
       ) ac ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*) as registros FROM frequencia_diaria fd
         WHERE fd.turma_id = t.id AND fd.data = $2
       ) fc ON true
       WHERE pt.professor_id = $1 AND pt.ativo = true
       ORDER BY t.turno, t.serie, t.nome`,
      [usuario.id, hoje]
    )

    const k = kpisResult.rows[0] || {}
    const totalHoje = parseInt(k.total_hoje || '0')
    const presentesHoje = parseInt(k.presentes_hoje || '0')
    const totalSemana = parseInt(k.total_semana || '0')
    const presentesSemana = parseInt(k.presentes_semana || '0')

    return NextResponse.json({
      total_turmas: parseInt(k.total_turmas || '0'),
      total_alunos: parseInt(k.total_alunos || '0'),
      frequencia_hoje: {
        presentes: presentesHoje,
        ausentes: parseInt(k.ausentes_hoje || '0'),
        total: totalHoje,
        percentual: totalHoje > 0 ? Math.round((presentesHoje / totalHoje) * 100) : 0,
      },
      frequencia_semana: {
        presentes: presentesSemana,
        total: totalSemana,
        percentual: totalSemana > 0 ? Math.round((presentesSemana / totalSemana) * 100) : 0,
      },
      turmas: turmasResult.rows,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar dashboard professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
