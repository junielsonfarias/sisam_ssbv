import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import { validateRequest } from '@/lib/schemas'
import { presencaFacialSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import pool from '@/database/connection'

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

    // Extrair data e hora do timestamp (com validação)
    const dataHora = new Date(timestamp)
    if (isNaN(dataHora.getTime())) {
      return NextResponse.json({ mensagem: 'Timestamp inválido' }, { status: 400 })
    }
    const data = dataHora.toISOString().split('T')[0]
    const hora = dataHora.toTimeString().split(' ')[0]

    // Inserir ou atualizar presença
    // Primeiro scan = hora_entrada, scans seguintes = hora_saida
    const result = await pool.query(
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

    // Log do registro
    await pool.query(
      `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
       VALUES ($1, 'presenca', $2)`,
      [dispositivo.id, JSON.stringify({ aluno_id, data, hora, confianca })]
    )

    const registro = result.rows[0]

    return NextResponse.json({
      sucesso: true,
      registro_id: registro.id,
      tipo: registro.hora_saida ? 'saida' : 'entrada',
      data,
      hora,
    })
  } catch (error: any) {
    console.error('Erro ao registrar presença facial:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
