import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

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

    const body = await request.json()
    const { turma_id, periodo_id } = body

    if (!turma_id || !periodo_id) {
      return NextResponse.json({ mensagem: 'turma_id e periodo_id são obrigatórios' }, { status: 400 })
    }

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

    // Contar faltas por (aluno_id, disciplina_id) no período
    const faltasResult = await pool.query(
      `SELECT
        fha.aluno_id,
        fha.disciplina_id,
        COUNT(*) FILTER (WHERE fha.presente = false) AS total_faltas
       FROM frequencia_hora_aula fha
       WHERE fha.turma_id = $1
         AND fha.data >= $2
         AND fha.data <= $3
       GROUP BY fha.aluno_id, fha.disciplina_id`,
      [turma_id, data_inicio, data_fim]
    )

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let atualizados = 0
      for (const row of faltasResult.rows) {
        const faltas = parseInt(row.total_faltas, 10)

        await client.query(
          `INSERT INTO notas_escolares
            (aluno_id, disciplina_id, periodo_id, escola_id, ano_letivo, faltas, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (aluno_id, disciplina_id, periodo_id) DO UPDATE SET
            faltas = EXCLUDED.faltas,
            registrado_por = EXCLUDED.registrado_por`,
          [row.aluno_id, row.disciplina_id, periodo_id, escola_id, ano_letivo, faltas, usuario.id]
        )
        atualizados++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Faltas agregadas: ${atualizados} registro(s) atualizados`,
        atualizados,
        periodo: { data_inicio, data_fim },
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao agregar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
