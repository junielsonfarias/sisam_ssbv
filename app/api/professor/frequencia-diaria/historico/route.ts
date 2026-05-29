import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor, validarData } from '@/lib/professor-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/frequencia-diaria/historico
 *   ?turma_id=UUID
 *   &inicio=YYYY-MM-DD  (opcional, default = hoje - 30 dias)
 *   &fim=YYYY-MM-DD     (opcional, default = hoje)
 *
 * Retorna um agregado diario com totais de presentes/faltas/justificadas
 * e o numero de alunos cursando na turma, para o professor poder
 * navegar entre dias lancados e identificar pendencias.
 */
export const GET = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const inicioParam = searchParams.get('inicio') || undefined
  const fimParam = searchParams.get('fim') || undefined

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turma_id e obrigatorio' }, { status: 400 })
  }

  // Default: ultimos 30 dias.
  const hoje = new Date().toISOString().split('T')[0]
  const inicioPadrao = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })()
  const inicio = inicioParam && validarData(inicioParam) ? inicioParam : inicioPadrao
  const fim = fimParam && validarData(fimParam) ? fimParam : hoje

  if (inicio > fim) {
    return NextResponse.json(
      { mensagem: 'inicio nao pode ser posterior a fim' },
      { status: 400 }
    )
  }

  const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vinculo com esta turma' }, { status: 403 })
  }

  // Total de alunos cursando na turma — usado para detectar dias com
  // registro parcial (X de Y) vs completo.
  const totalAlunosResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM alunos
      WHERE turma_id = $1 AND ativo = true AND situacao = 'cursando'`,
    [turmaId]
  )
  const totalAlunos: number = totalAlunosResult.rows[0]?.total ?? 0

  const result = await pool.query(
    `SELECT
       fd.data::text AS data,
       COUNT(*)::int AS total_registros,
       COUNT(*) FILTER (WHERE fd.status = 'presente')::int AS presentes,
       COUNT(*) FILTER (WHERE fd.status = 'ausente')::int AS faltas,
       COUNT(*) FILTER (WHERE fd.status = 'justificado')::int AS justificadas
     FROM frequencia_diaria fd
     WHERE fd.turma_id = $1
       AND fd.data BETWEEN $2 AND $3
     GROUP BY fd.data
     ORDER BY fd.data DESC`,
    [turmaId, inicio, fim]
  )

  const dias = result.rows.map(r => {
    const presentes = Number(r.presentes) || 0
    const total = Number(r.total_registros) || 0
    return {
      data: r.data,
      total_registros: total,
      presentes,
      faltas: Number(r.faltas) || 0,
      justificadas: Number(r.justificadas) || 0,
      percentual_presenca: total > 0 ? Math.round((presentes / total) * 100) : 0,
      completo: totalAlunos > 0 && total >= totalAlunos,
    }
  })

  return NextResponse.json({
    inicio,
    fim,
    total_alunos: totalAlunos,
    dias,
  })
})
