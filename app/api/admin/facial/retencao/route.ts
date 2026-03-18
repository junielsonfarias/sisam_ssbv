import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { FACIAL } from '@/lib/constants'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/facial/retencao
 * Purga dados antigos conforme política de retenção
 * - Logs de dispositivos com mais de 365 dias
 * - Embeddings de alunos inativos
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json(
        { mensagem: 'Apenas administradores podem executar política de retenção' },
        { status: 403 }
      )
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Purgar logs antigos
      const logsResult = await client.query(
        `DELETE FROM logs_dispositivos
         WHERE criado_em < NOW() - INTERVAL '${FACIAL.RETENCAO_LOGS_DIAS} days'`
      )

      // 2. Purgar embeddings de alunos inativos
      const embeddingsResult = await client.query(
        `DELETE FROM embeddings_faciais ef
         USING alunos a
         WHERE ef.aluno_id = a.id AND (a.ativo = false OR a.situacao != 'cursando')`
      )

      // 3. Revogar consentimentos de alunos inativos
      const consentimentosResult = await client.query(
        `UPDATE consentimentos_faciais cf
         SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
         FROM alunos a
         WHERE cf.aluno_id = a.id
           AND (a.ativo = false OR a.situacao != 'cursando')
           AND cf.consentido = true`
      )

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: 'Política de retenção executada',
        removidos: {
          logs: logsResult.rowCount || 0,
          embeddings: embeddingsResult.rowCount || 0,
          consentimentos_revogados: consentimentosResult.rowCount || 0,
        },
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro na política de retenção:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
