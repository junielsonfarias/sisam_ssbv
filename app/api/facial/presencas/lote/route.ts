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
 * Usa batch INSERT em chunks de 50 para evitar lock prolongado
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

    // Filtrar e preparar registros válidos
    const validos: { aluno_id: string; turma_id: string; data: string; hora: string; confianca: number }[] = []
    let erros = 0

    for (const registro of registros) {
      const { aluno_id, timestamp, confianca } = registro

      if (confianca < FACIAL.CONFIANCA_MINIMA) { erros++; continue }

      const turmaId = alunosMap.get(aluno_id)
      if (!turmaId) { erros++; continue }

      const dataHora = new Date(timestamp)
      if (isNaN(dataHora.getTime())) { erros++; continue }

      validos.push({
        aluno_id,
        turma_id: turmaId,
        data: dataHora.toISOString().split('T')[0],
        hora: dataHora.toTimeString().split(' ')[0],
        confianca,
      })
    }

    if (validos.length === 0) {
      return NextResponse.json({
        sucesso: true,
        total: registros.length,
        inseridos: 0,
        atualizados: 0,
        erros,
      })
    }

    // Processar em chunks de 50 para evitar lock prolongado
    const CHUNK_SIZE = 50
    let inseridos = 0
    let atualizados = 0

    for (let i = 0; i < validos.length; i += CHUNK_SIZE) {
      const chunk = validos.slice(i, i + CHUNK_SIZE)

      // Construir batch INSERT com múltiplos VALUES
      const values: (string | number)[] = []
      const placeholders: string[] = []
      let paramIdx = 1

      for (const reg of chunk) {
        placeholders.push(
          `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, 'facial', $${paramIdx + 5}, $${paramIdx + 6})`
        )
        values.push(
          reg.aluno_id, reg.turma_id, dispositivo.escola_id,
          reg.data, reg.hora, dispositivo.id, reg.confianca
        )
        paramIdx += 7
      }

      const result = await pool.query(
        `INSERT INTO frequencia_diaria
          (aluno_id, turma_id, escola_id, data, hora_entrada, metodo, dispositivo_id, confianca)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (aluno_id, data) DO UPDATE SET
          hora_saida = EXCLUDED.hora_entrada,
          confianca = GREATEST(frequencia_diaria.confianca, EXCLUDED.confianca),
          atualizado_em = CURRENT_TIMESTAMP
         RETURNING (xmax = 0) AS is_insert`,
        values
      )

      for (const row of result.rows) {
        if (row.is_insert) inseridos++
        else atualizados++
      }
    }

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
  } catch (error: any) {
    console.error('Erro ao registrar presença em lote:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
