import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import { validateRequest } from '@/lib/schemas'
import { presencaFacialSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import { extrairDataHoraLocal } from '@/lib/api-helpers'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { propagarPresencaFacialParaHoraAula } from '@/lib/services/frequencia-facial.service'

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

    // Verificar se aluno pertence à escola do dispositivo e está ativo.
    // Tambem traz a serie (de alunos OU da turma) para decidir se propaga
    // para frequencia_hora_aula (anos finais).
    const alunoResult = await pool.query(
      `SELECT a.id, a.turma_id, a.escola_id, COALESCE(a.serie, t.serie) AS serie
         FROM alunos a
         LEFT JOIN turmas t ON t.id = a.turma_id
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

    // Extrair data e hora no fuso local (não UTC)
    let data: string, hora: string
    try {
      ({ data, hora } = extrairDataHoraLocal(timestamp))
    } catch {
      return NextResponse.json({ mensagem: 'Timestamp inválido' }, { status: 400 })
    }

    // Inserir ou atualizar presença + log em transação
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1) Sempre grava frequencia_diaria (rastreia "esteve no predio")
      //    Primeiro scan = hora_entrada, scans seguintes = hora_saida
      const result = await client.query(
        `INSERT INTO frequencia_diaria
          (aluno_id, turma_id, escola_id, data, hora_entrada, metodo, dispositivo_id, confianca)
         VALUES ($1, $2, $3, $4, $5, 'facial', $6, $7)
         ON CONFLICT (aluno_id, data) DO UPDATE SET
          hora_saida = $5,
          confianca = GREATEST(frequencia_diaria.confianca, $7),
          atualizado_em = CURRENT_TIMESTAMP
         RETURNING id, hora_entrada, hora_saida`,
        [aluno_id, aluno.turma_id, dispositivo.escola_id, data, hora, dispositivo.id, confianca]
      )

      // 2) Anos finais (6-9): propaga presenca para frequencia_hora_aula
      //    em todas as aulas previstas em horarios_aula daquele dia da
      //    semana. Anos iniciais: skip (frequencia_diaria ja basta).
      const propagacao = await propagarPresencaFacialParaHoraAula(client, {
        aluno_id,
        turma_id: aluno.turma_id,
        data,
        serie: aluno.serie,
      })

      // Log do registro
      await client.query(
        `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
         VALUES ($1, 'presenca', $2)`,
        [dispositivo.id, JSON.stringify({ aluno_id, data, hora, confianca, propagacao })]
      )

      await client.query('COMMIT')

      const registro = result.rows[0]

      return NextResponse.json({
        sucesso: true,
        registro_id: registro.id,
        tipo: registro.hora_saida ? 'saida' : 'entrada',
        data,
        hora,
        propagacao_hora_aula: propagacao,
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
