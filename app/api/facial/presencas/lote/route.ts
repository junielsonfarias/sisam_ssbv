import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import { validateRequest } from '@/lib/schemas'
import { presencaFacialLoteSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import { extrairDataHoraLocal } from '@/lib/api-helpers'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarEventoFacial } from '@/lib/services/presenca-facial-eventos.service'

const log = createLogger('FacialPresencasLote')

export const dynamic = 'force-dynamic'

/**
 * POST /api/facial/presencas/lote
 * Registra presenças em lote (sync offline)
 * Máximo 500 registros por requisição (FACIAL.LOTE_MAXIMO)
 *
 * Cada registro válido é processado UM A UM (ordenado por timestamp
 * ascendente) via registrarEventoFacial — o mesmo serviço usado por
 * /api/facial/presencas e /api/admin/facial/presenca-terminal. Isso:
 *   - Classifica cada scan em entrada/saida/duplicado pelo turno da turma;
 *   - Só seta hora_entrada na primeira do dia (COALESCE) e hora_saida em
 *     eventos do tipo 'saida' (não corrompe hora_saida com scan duplicado);
 *   - Grava o histórico bruto em presenca_facial_eventos;
 *   - Elimina o erro "ON CONFLICT DO UPDATE command cannot affect row a
 *     second time" que ocorria quando 2+ scans do mesmo aluno/dia caíam no
 *     mesmo statement de batch INSERT em frequencia_diaria.
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

    // Buscar alunos da escola para validação rápida.
    // O INNER JOIN com consentimentos_faciais já garante o consentimento
    // LGPD ativo (consentido = true AND data_revogacao IS NULL).
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
    interface RegistroValido {
      aluno_id: string
      turma_id: string
      data: string
      hora: string
      confianca: number
      registrado_em: Date
    }
    const validos: RegistroValido[] = []
    let erros = 0

    for (const registro of registros) {
      const { aluno_id, timestamp, confianca } = registro

      if (confianca < FACIAL.CONFIANCA_MINIMA) { erros++; continue }

      const turmaId = alunosMap.get(aluno_id)
      if (!turmaId) { erros++; continue }

      const registradoEm = new Date(timestamp)
      if (isNaN(registradoEm.getTime())) { erros++; continue }

      try {
        const { data, hora } = extrairDataHoraLocal(timestamp)
        validos.push({ aluno_id, turma_id: turmaId, data, hora, confianca, registrado_em: registradoEm })
      } catch {
        erros++; continue
      }
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

    // Ordenar por timestamp ascendente: o service classifica entrada/saida
    // com base no último evento do dia, então a ordem cronológica importa.
    validos.sort((a, b) => a.registrado_em.getTime() - b.registrado_em.getTime())

    let inseridos = 0
    let atualizados = 0
    let duplicados = 0

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Processa cada scan individualmente. O service é idempotente por
      // (aluno, data) — INSERT/UPDATE individual em frequencia_diaria com
      // COALESCE/GREATEST — então não há conflito de duas linhas no mesmo
      // statement nem necessidade de savepoint por item.
      for (const reg of validos) {
        const evento = await registrarEventoFacial(client, {
          aluno_id: reg.aluno_id,
          escola_id: dispositivo.escola_id,
          registrado_em: reg.registrado_em,
          data: reg.data,
          dispositivo_id: dispositivo.id,
          confianca: reg.confianca,
          origem: 'dispositivo',
        }, reg.turma_id)

        if (evento.tipo === 'duplicado') {
          duplicados++
        } else if (evento.primeiro_do_dia) {
          inseridos++
        } else {
          atualizados++
        }
      }

      // Log do lote
      await client.query(
        `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
         VALUES ($1, 'presenca_lote', $2)`,
        [dispositivo.id, JSON.stringify({ total: registros.length, inseridos, atualizados, duplicados, erros })]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        sucesso: true,
        total: registros.length,
        inseridos,
        atualizados,
        duplicados,
        erros,
      })
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      log.error('Erro ao registrar presença em lote', error)
      return NextResponse.json(
        { mensagem: 'Erro interno do servidor' },
        { status: 500 }
      )
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    log.error('Erro ao registrar presença em lote', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
