import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/frequencia-diaria/agregar
 * Agrega frequência diária em frequência bimestral
 * Converte registros diários em totais por período para compatibilidade com o sistema existente
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { turma_id, periodo_id, dias_letivos } = body

    if (!turma_id || !periodo_id) {
      return NextResponse.json(
        { mensagem: 'turma_id e periodo_id são obrigatórios' },
        { status: 400 }
      )
    }

    if (typeof dias_letivos !== 'number' || dias_letivos <= 0) {
      return NextResponse.json(
        { mensagem: 'dias_letivos deve ser um número maior que zero' },
        { status: 400 }
      )
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

    // Buscar período para saber as datas
    const periodoResult = await pool.query(
      'SELECT data_inicio, data_fim FROM periodos_letivos WHERE id = $1',
      [periodo_id]
    )
    if (periodoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Período não encontrado' }, { status: 404 })
    }

    const { data_inicio, data_fim } = periodoResult.rows[0]

    // Agregar: contar dias com presença por aluno dentro do período
    const agregacaoResult = await pool.query(
      `SELECT
        fd.aluno_id,
        COUNT(DISTINCT fd.data) AS presencas
       FROM frequencia_diaria fd
       WHERE fd.turma_id = $1
         AND fd.data >= $2
         AND fd.data <= $3
       GROUP BY fd.aluno_id`,
      [turma_id, data_inicio, data_fim]
    )

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      let salvos = 0
      for (const row of agregacaoResult.rows) {
        const presencas = Math.min(parseInt(row.presencas, 10), dias_letivos)
        const faltas = dias_letivos - presencas

        await client.query(
          `INSERT INTO frequencia_bimestral
            (aluno_id, periodo_id, turma_id, escola_id, ano_letivo, dias_letivos, presencas, faltas, metodo, registrado_por)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'facial', $9)
           ON CONFLICT (aluno_id, periodo_id) DO UPDATE SET
            dias_letivos = EXCLUDED.dias_letivos,
            presencas = EXCLUDED.presencas,
            faltas = EXCLUDED.faltas,
            metodo = 'facial',
            registrado_por = EXCLUDED.registrado_por,
            atualizado_em = CURRENT_TIMESTAMP`,
          [row.aluno_id, periodo_id, turma_id, escola_id, ano_letivo,
           dias_letivos, presencas, faltas, usuario.id]
        )
        salvos++
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Frequência agregada para ${salvos} aluno(s)`,
        salvos,
        periodo: { data_inicio, data_fim },
        dias_letivos,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao agregar frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
