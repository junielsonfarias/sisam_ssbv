import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { validateRequest, uuidSchema } from '@/lib/schemas'

const agregarFrequenciaDiariaSchema = z.object({
  turma_id: uuidSchema,
  periodo_id: uuidSchema,
  dias_letivos: z.number().int().min(1, 'dias_letivos deve ser um número maior que zero'),
})

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

    const validationResult = await validateRequest(request, agregarFrequenciaDiariaSchema)
    if (!validationResult.success) return validationResult.response
    const { turma_id, periodo_id, dias_letivos } = validationResult.data

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

    // Agregar em uma ÚNICA query INSERT...SELECT (elimina N+1)
    // Conta dias com presença efetiva por aluno e gera frequencia_bimestral
    const result = await pool.query(
      `INSERT INTO frequencia_bimestral
        (aluno_id, periodo_id, turma_id, escola_id, ano_letivo, dias_letivos, presencas, faltas, percentual_frequencia, metodo, registrado_por)
       SELECT
        a.id,
        $2 AS periodo_id,
        $1 AS turma_id,
        $4 AS escola_id,
        $5 AS ano_letivo,
        $6 AS dias_letivos,
        LEAST(COUNT(DISTINCT CASE WHEN fd.status = 'presente' THEN fd.data END), $6) AS presencas,
        GREATEST(0, $6 - LEAST(COUNT(DISTINCT CASE WHEN fd.status = 'presente' THEN fd.data END), $6)) AS faltas,
        CASE WHEN $6 > 0
          THEN ROUND(LEAST(COUNT(DISTINCT CASE WHEN fd.status = 'presente' THEN fd.data END), $6)::numeric / $6 * 100, 2)
          ELSE 0
        END AS percentual_frequencia,
        'facial' AS metodo,
        $7 AS registrado_por
       FROM alunos a
       LEFT JOIN frequencia_diaria fd ON fd.aluno_id = a.id
         AND fd.turma_id = $1
         AND fd.data >= $3
         AND fd.data <= $8
       WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
       GROUP BY a.id
       ON CONFLICT (aluno_id, periodo_id) DO UPDATE SET
        dias_letivos = EXCLUDED.dias_letivos,
        presencas = EXCLUDED.presencas,
        faltas = EXCLUDED.faltas,
        percentual_frequencia = EXCLUDED.percentual_frequencia,
        metodo = 'facial',
        registrado_por = EXCLUDED.registrado_por,
        atualizado_em = CURRENT_TIMESTAMP`,
      [turma_id, periodo_id, data_inicio, escola_id, ano_letivo, dias_letivos, usuario.id, data_fim]
    )

    const salvos = result.rowCount || 0

    return NextResponse.json({
      mensagem: `Frequência agregada para ${salvos} aluno(s)`,
      salvos,
      periodo: { data_inicio, data_fim },
      dias_letivos,
    })
  } catch (error: unknown) {
    console.error('Erro ao agregar frequência:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
