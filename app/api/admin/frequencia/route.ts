import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia
 * Busca frequência de uma turma para um período específico
 * Params: turma_id, periodo_id
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const periodoId = searchParams.get('periodo_id')
  const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

  if (!turmaId || !periodoId) {
    return NextResponse.json({ mensagem: 'Informe turma_id e periodo_id' }, { status: 400 })
  }

  // Buscar alunos da turma
  const alunosResult = await pool.query(
    `SELECT a.id, a.nome, a.codigo, a.situacao, a.pcd
     FROM alunos a
     WHERE a.turma_id = $1 AND a.ano_letivo = $2
     ORDER BY
       CASE WHEN a.situacao IN ('transferido', 'abandono') THEN 1 ELSE 0 END,
       a.nome`,
    [turmaId, anoLetivo]
  )

  // Buscar frequências existentes
  const freqResult = await pool.query(
    `SELECT f.aluno_id, f.dias_letivos, f.presencas, f.faltas, f.faltas_justificadas,
            f.percentual_frequencia, f.observacao, f.metodo
     FROM frequencia_bimestral f
     WHERE f.turma_id = $1 AND f.periodo_id = $2`,
    [turmaId, periodoId]
  )

  const freqMap: Record<string, any> = {}
  for (const f of freqResult.rows) {
    freqMap[f.aluno_id] = f
  }

  return NextResponse.json({
    alunos: alunosResult.rows,
    frequencias: freqMap,
  })
})

/**
 * POST /api/admin/frequencia
 * Salva frequência em lote para uma turma/período
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { turma_id, periodo_id, dias_letivos, frequencias } = body

    if (!turma_id || !periodo_id || !Array.isArray(frequencias)) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    if (typeof dias_letivos !== 'number' || dias_letivos < 0) {
      return NextResponse.json({ mensagem: 'Dias letivos inválido' }, { status: 400 })
    }

    // Buscar escola_id e ano_letivo da turma
    const turmaResult = await pool.query(
      'SELECT escola_id, ano_letivo FROM turmas WHERE id = $1',
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const { escola_id, ano_letivo } = turmaResult.rows[0]

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let salvos = 0
      for (const freq of frequencias) {
        const { aluno_id, presencas, faltas, faltas_justificadas, observacao } = freq

        if (!aluno_id) continue

        const presencasVal = Math.max(0, presencas ?? 0)
        const faltasVal = Math.max(0, faltas ?? 0)
        const faltasJustVal = Math.max(0, faltas_justificadas ?? 0)

        // Validar: presenças + faltas não pode exceder dias letivos
        if (presencasVal + faltasVal > dias_letivos) {
          continue // Ignora registro inválido silenciosamente
        }

        // Calcular percentual de frequência
        const percentualFrequencia = dias_letivos > 0
          ? Math.round((presencasVal / dias_letivos) * 1000) / 10
          : 0

        await client.query(
          `INSERT INTO frequencia_bimestral
            (aluno_id, periodo_id, turma_id, escola_id, ano_letivo, dias_letivos, presencas, faltas, faltas_justificadas, percentual_frequencia, observacao, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (aluno_id, periodo_id) DO UPDATE SET
            dias_letivos = EXCLUDED.dias_letivos,
            presencas = EXCLUDED.presencas,
            faltas = EXCLUDED.faltas,
            faltas_justificadas = EXCLUDED.faltas_justificadas,
            percentual_frequencia = EXCLUDED.percentual_frequencia,
            observacao = EXCLUDED.observacao,
            registrado_por = EXCLUDED.registrado_por,
            atualizado_em = CURRENT_TIMESTAMP`,
          [aluno_id, periodo_id, turma_id, escola_id, ano_letivo, dias_letivos,
           presencasVal, faltasVal, faltasJustVal, percentualFrequencia, observacao || null, usuario.id]
        )
        salvos++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Frequência salva para ${salvos} aluno(s)`,
        salvos,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    console.error('Erro ao salvar frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
