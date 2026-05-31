import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import { validateRequest } from '@/lib/schemas'
import { presencaFacialSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import { extrairDataHoraLocal } from '@/lib/api-helpers'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { registrarEventoFacial } from '@/lib/services/presenca-facial-eventos.service'

const log = createLogger('FacialPresencas')

export const dynamic = 'force-dynamic'

/**
 * POST /api/facial/presencas
 * Registra presença de um aluno via reconhecimento facial
 *
 * Primeiro scan do dia → hora_entrada
 * Scans seguintes → atualiza hora_saida
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
    const validacao = await validateRequest(request, presencaFacialSchema)
    if (!validacao.success) return validacao.response

    const { aluno_id, timestamp, confianca } = validacao.data

    // Verificar confiança mínima
    if (confianca < FACIAL.CONFIANCA_MINIMA) {
      return NextResponse.json(
        { mensagem: `Confiança ${confianca} abaixo do mínimo (${FACIAL.CONFIANCA_MINIMA})` },
        { status: 400 }
      )
    }

    // Verificar se aluno pertence à escola do dispositivo e está ativo
    const alunoResult = await pool.query(
      `SELECT a.id, a.turma_id, a.escola_id
       FROM alunos a
       WHERE a.id = $1 AND a.escola_id = $2 AND a.ativo = true
         AND a.situacao = 'cursando'`,
      [aluno_id, dispositivo.escola_id]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado, inativo ou não pertence a esta escola' },
        { status: 404 }
      )
    }

    const aluno = alunoResult.rows[0]

    // Verificar consentimento facial ativo
    const consentimentoResult = await pool.query(
      `SELECT id FROM consentimentos_faciais
       WHERE aluno_id = $1 AND consentido = true AND data_revogacao IS NULL`,
      [aluno_id]
    )

    if (consentimentoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno sem consentimento facial ativo' },
        { status: 403 }
      )
    }

    // Extrair data no fuso local (para particionar eventos por dia)
    let data: string, hora: string
    try {
      ({ data, hora } = extrairDataHoraLocal(timestamp))
    } catch {
      return NextResponse.json({ mensagem: 'Timestamp inválido' }, { status: 400 })
    }
    const registradoEm = new Date(timestamp)
    if (isNaN(registradoEm.getTime())) {
      return NextResponse.json({ mensagem: 'Timestamp inválido' }, { status: 400 })
    }

    // Service classifica o evento (entrada/saida/duplicado) baseado nos
    // eventos do dia + janela de 30min. Atualiza frequencia_diaria so
    // quando faz sentido (duplicado nao toca).
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const evento = await registrarEventoFacial(client, {
        aluno_id,
        escola_id: dispositivo.escola_id,
        registrado_em: registradoEm,
        data,
        dispositivo_id: dispositivo.id,
        confianca,
        origem: 'dispositivo',
      }, aluno.turma_id)

      // Log do dispositivo (auditoria operacional)
      await client.query(
        `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
         VALUES ($1, 'presenca', $2)`,
        [dispositivo.id, JSON.stringify({ aluno_id, data, hora, confianca, tipo: evento.tipo })]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        sucesso: true,
        evento_id: evento.id,
        tipo: evento.tipo,
        primeiro_do_dia: evento.primeiro_do_dia,
        data,
        hora,
      })
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      log.error('Erro ao registrar presença facial', error)
      return NextResponse.json(
        { mensagem: 'Erro interno do servidor' },
        { status: 500 }
      )
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    log.error('Erro ao registrar presença facial', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
