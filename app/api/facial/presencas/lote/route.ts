import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import { validateRequest } from '@/lib/schemas'
import { presencaFacialLoteSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/facial/presencas/lote
 * Registra presenças em lote (sync offline)
 * Máximo 500 registros por requisição
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticar dispositivo
    const dispositivo = await validateDeviceApiKey(request)
    if (!dispositivo) {
      return NextResponse.json(
        { mensagem: 'API key inválida ou dispositivo inativo' },
        { status: 401 }
      )
    }

    // Validar body
    const validacao = await validateRequest(request, presencaFacialLoteSchema)
    if (!validacao.success) return validacao.response

    const { registros } = validacao.data

    // Buscar alunos da escola para validação rápida
    const alunosResult = await pool.query(
      `SELECT a.id, a.turma_id
       FROM alunos a
       INNER JOIN consentimentos_faciais cf ON cf.aluno_id = a.id AND cf.consentido = true AND cf.data_revogacao IS NULL
       WHERE a.escola_id = $1 AND a.ativo = true AND a.situacao = 'cursando'`,
      [dispositivo.escola_id]
    )

    const alunosMap = new Map<string, string>()
    for (const a of alunosResult.rows) {
      alunosMap.set(a.id, a.turma_id)
    }

    const client = await pool.connect()
    let inseridos = 0
    let atualizados = 0
    let erros = 0

    try {
      await client.query('BEGIN')

      for (const registro of registros) {
        const { aluno_id, timestamp, confianca } = registro

        // Validar confiança
        if (confianca < FACIAL.CONFIANCA_MINIMA) {
          erros++
          continue
        }

        // Validar aluno
        const turmaId = alunosMap.get(aluno_id)
        if (!turmaId) {
          erros++
          continue
        }

        const dataHora = new Date(timestamp)
        const data = dataHora.toISOString().split('T')[0]
        const hora = dataHora.toTimeString().split(' ')[0]

        const result = await client.query(
          `INSERT INTO frequencia_diaria
            (aluno_id, turma_id, escola_id, data, hora_entrada, metodo, dispositivo_id, confianca)
           VALUES ($1, $2, $3, $4, $5, 'facial', $6, $7)
           ON CONFLICT (aluno_id, data) DO UPDATE SET
            hora_saida = $5,
            confianca = GREATEST(frequencia_diaria.confianca, $7),
            atualizado_em = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS is_insert`,
          [aluno_id, turmaId, dispositivo.escola_id, data, hora, dispositivo.id, confianca]
        )

        if (result.rows[0]?.is_insert) {
          inseridos++
        } else {
          atualizados++
        }
      }

      await client.query('COMMIT')

      // Log do lote
      await pool.query(
        `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
         VALUES ($1, 'presenca_lote', $2)`,
        [dispositivo.id, JSON.stringify({ total: registros.length, inseridos, atualizados, erros })]
      )

      return NextResponse.json({
        sucesso: true,
        total: registros.length,
        inseridos,
        atualizados,
        erros,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao registrar presença em lote:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
