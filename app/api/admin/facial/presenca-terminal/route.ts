import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest, presencaFacialSchema } from '@/lib/schemas'
import { FACIAL } from '@/lib/constants'
import { extrairDataHoraLocal } from '@/lib/api-helpers'
import pool from '@/database/connection'
import { propagarPresencaFacialParaHoraAula } from '@/lib/services/frequencia-facial.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('FacialTerminal')

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/facial/presenca-terminal
 * Registra presença via terminal web (usa JWT do usuario logado, não API key)
 * Body: { aluno_id, timestamp, confianca }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, presencaFacialSchema)
    if (!validacao.success) return validacao.response

    const { aluno_id, timestamp, confianca } = validacao.data

    // O FaceMatcher no terminal já filtra por threshold configurável.
    // A API aceita qualquer confiança > 0 (a qualidade é controlada no terminal).
    if (confianca <= 0) {
      return NextResponse.json(
        { mensagem: 'Confiança deve ser maior que 0' },
        { status: 400 }
      )
    }

    // Buscar aluno + serie (anos finais propaga para frequencia_hora_aula)
    const alunoResult = await pool.query(
      `SELECT a.id, a.turma_id, a.escola_id, COALESCE(a.serie, t.serie) AS serie
         FROM alunos a
         LEFT JOIN turmas t ON t.id = a.turma_id
        WHERE a.id = $1 AND a.ativo = true AND a.situacao = 'cursando'`,
      [aluno_id]
    )

    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado ou inativo' }, { status: 404 })
    }

    const aluno = alunoResult.rows[0]

    // Verificar consentimento facial ativo (LGPD)
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
    const { data, hora } = extrairDataHoraLocal(timestamp)

    // Transacao: frequencia_diaria + propagacao opcional para hora_aula
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `INSERT INTO frequencia_diaria
          (aluno_id, turma_id, escola_id, data, hora_entrada, metodo, confianca, registrado_por)
         VALUES ($1, $2, $3, $4, $5, 'facial', $6, $7)
         ON CONFLICT (aluno_id, data) DO UPDATE SET
          hora_saida = $5,
          confianca = GREATEST(frequencia_diaria.confianca, $6),
          atualizado_em = CURRENT_TIMESTAMP
         RETURNING id, hora_entrada, hora_saida`,
        [aluno_id, aluno.turma_id, aluno.escola_id, data, hora, confianca, usuario.id]
      )

      // Anos finais: propaga para frequencia_hora_aula
      const propagacao = await propagarPresencaFacialParaHoraAula(client, {
        aluno_id,
        turma_id: aluno.turma_id,
        data,
        serie: aluno.serie,
        usuario_id: usuario.id,
      })

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
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    log.error('Erro ao registrar presença via terminal', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
