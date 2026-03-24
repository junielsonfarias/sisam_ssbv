import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { validateRequest, uuidSchema } from '@/lib/schemas'

const agregarFrequenciaHoraAulaSchema = z.object({
  turma_id: uuidSchema,
  periodo_id: uuidSchema,
})

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frequencia-hora-aula/agregar
 * Agrega faltas por hora-aula em notas_escolares.faltas
 * Body: { turma_id, periodo_id }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validationResult = await validateRequest(request, agregarFrequenciaHoraAulaSchema)
    if (!validationResult.success) return validationResult.response
    const { turma_id, periodo_id } = validationResult.data

    // Buscar turma
    const turmaResult = await pool.query(
      'SELECT escola_id, ano_letivo FROM turmas WHERE id = $1',
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const { escola_id, ano_letivo } = turmaResult.rows[0]

    // Buscar período
    const periodoResult = await pool.query(
      'SELECT data_inicio, data_fim FROM periodos_letivos WHERE id = $1',
      [periodo_id]
    )
    if (periodoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Período não encontrado' }, { status: 404 })
    }

    const { data_inicio, data_fim } = periodoResult.rows[0]

    // Agregar faltas em 1 INSERT...SELECT (sem loop N+1)
    const result = await pool.query(
      `INSERT INTO notas_escolares
        (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, faltas, registrado_por)
       SELECT
        fha.aluno_id,
        fha.disciplina_id,
        $2 AS periodo_id,
        $4 AS escola_id,
        $5 AS ano_letivo,
        COUNT(*) FILTER (WHERE fha.presente = false) AS faltas,
        $6 AS registrado_por
       FROM frequencia_hora_aula fha
       WHERE fha.turma_id = $1
         AND fha.data >= $3
         AND fha.data <= $7
       GROUP BY fha.aluno_id, fha.disciplina_id
       ON CONFLICT (aluno_id, disciplina_id, periodo_id) DO UPDATE SET
        faltas = EXCLUDED.faltas,
        registrado_por = EXCLUDED.registrado_por`,
      [turma_id, periodo_id, data_inicio, escola_id, ano_letivo, usuario.id, data_fim]
    )

    const atualizados = result.rowCount || 0

    return NextResponse.json({
      mensagem: `Faltas agregadas: ${atualizados} registro(s) atualizados`,
      atualizados,
      periodo: { data_inicio, data_fim },
    })
  } catch (error: unknown) {
    console.error('Erro ao agregar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
