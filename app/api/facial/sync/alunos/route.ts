import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/facial/sync/alunos
 * Retorna alunos da escola do dispositivo com embeddings faciais
 * Suporta sync incremental via ?atualizado_apos=ISO_TIMESTAMP
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticar dispositivo
    const dispositivo = await validateDeviceApiKey(request)
    if (!dispositivo) {
      return NextResponse.json(
        { mensagem: 'API key inválida ou dispositivo inativo' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const atualizadoApos = searchParams.get('atualizado_apos')

    let query = `
      SELECT
        a.id AS aluno_id,
        a.nome,
        a.codigo,
        a.turma_id,
        a.serie,
        encode(ef.embedding_data, 'base64') AS embedding_base64,
        ef.versao_modelo,
        ef.qualidade,
        GREATEST(a.atualizado_em, ef.atualizado_em) AS atualizado_em
      FROM alunos a
      INNER JOIN embeddings_faciais ef ON ef.aluno_id = a.id
      INNER JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
        AND cf.consentido = true
        AND cf.data_revogacao IS NULL
      WHERE a.escola_id = $1
        AND a.ativo = true
        AND a.situacao = 'cursando'
    `
    const params: (string | null)[] = [dispositivo.escola_id]

    if (atualizadoApos) {
      query += ` AND GREATEST(a.atualizado_em, ef.atualizado_em) > $2`
      params.push(atualizadoApos)
    }

    query += ` ORDER BY a.nome`

    const result = await pool.query(query, params)

    // Buscar alunos removidos (para que o dispositivo limpe do cache local)
    let removidos: string[] = []
    if (atualizadoApos) {
      const removidosResult = await pool.query(
        `SELECT a.id
         FROM alunos a
         WHERE a.escola_id = $1
           AND (a.ativo = false OR a.situacao != 'cursando')
           AND a.atualizado_em > $2`,
        [dispositivo.escola_id, atualizadoApos]
      )
      removidos = removidosResult.rows.map(r => r.id)
    }

    // Log da sincronização
    await pool.query(
      `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
       VALUES ($1, 'sync', $2)`,
      [dispositivo.id, JSON.stringify({
        alunos_sincronizados: result.rows.length,
        removidos: removidos.length,
        incremental: !!atualizadoApos,
      })]
    )

    return NextResponse.json({
      alunos: result.rows,
      removidos,
      sincronizado_em: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('Erro ao sincronizar alunos:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
