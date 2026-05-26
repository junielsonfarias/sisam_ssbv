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

    // 1) Agregar faltas POR DISCIPLINA em notas_escolares.faltas
    const resultNotas = await pool.query(
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

    // 2) Agregar POR DIA em frequencia_bimestral (corrige bug ALTO #9 da
    //    auditoria E2E — antes anos finais nunca alimentavam essa tabela,
    //    deixando boletim/FICAI/portal cegos para 6º-9º).
    //
    //    Regra: aluno e considerado PRESENTE no dia se foi presente em pelo
    //    menos 1 aula. Faltou em TODAS = falta. Total de dias letivos = dias
    //    distintos com aulas registradas para a turma no periodo.
    const resultBim = await pool.query(
      `WITH dias_aluno AS (
         SELECT aluno_id,
                turma_id,
                data,
                BOOL_OR(presente) AS esteve_presente
           FROM frequencia_hora_aula
          WHERE turma_id = $1
            AND data >= $3
            AND data <= $7
          GROUP BY aluno_id, turma_id, data
       ),
       totais AS (
         SELECT aluno_id,
                turma_id,
                (SELECT COUNT(DISTINCT data) FROM frequencia_hora_aula
                  WHERE turma_id = $1 AND data >= $3 AND data <= $7) AS dias_letivos,
                COUNT(*) FILTER (WHERE esteve_presente)                 AS presencas,
                COUNT(*) FILTER (WHERE NOT esteve_presente)             AS faltas
           FROM dias_aluno
          GROUP BY aluno_id, turma_id
       )
       INSERT INTO frequencia_bimestral
         (aluno_id, turma_id, periodo_id, escola_id, ano_letivo,
          dias_letivos, presencas, faltas, faltas_justificadas,
          percentual_frequencia, metodo, registrado_por)
       SELECT
         t.aluno_id, t.turma_id, $2, $4, $5,
         t.dias_letivos, t.presencas, t.faltas, 0,
         CASE WHEN t.dias_letivos > 0
              THEN ROUND((t.presencas::numeric / t.dias_letivos) * 100, 2)
              ELSE 0 END,
         'agregado_hora_aula', $6
       FROM totais t
       ON CONFLICT (aluno_id, turma_id, periodo_id) DO UPDATE SET
         dias_letivos = EXCLUDED.dias_letivos,
         presencas = EXCLUDED.presencas,
         faltas = EXCLUDED.faltas,
         percentual_frequencia = EXCLUDED.percentual_frequencia,
         metodo = EXCLUDED.metodo,
         registrado_por = EXCLUDED.registrado_por,
         atualizado_em = CURRENT_TIMESTAMP
       -- Preserva registros lançados manualmente em /admin/frequencia (corrige
       -- bug ALTO #11 da auditoria — antes a agregacao sobrescrevia tudo).
       WHERE frequencia_bimestral.metodo IS DISTINCT FROM 'manual'`,
      [turma_id, periodo_id, data_inicio, escola_id, ano_letivo, usuario.id, data_fim]
    )

    const atualizadosNotas = resultNotas.rowCount || 0
    const atualizadosBim = resultBim.rowCount || 0

    return NextResponse.json({
      mensagem: `Agregados: ${atualizadosNotas} disciplina(s) em notas_escolares + ${atualizadosBim} aluno(s) em frequencia_bimestral`,
      atualizados_notas: atualizadosNotas,
      atualizados_bimestral: atualizadosBim,
      periodo: { data_inicio, data_fim },
    })
  } catch (error: unknown) {
    console.error('Erro ao agregar frequência por aula:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
