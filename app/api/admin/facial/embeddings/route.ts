import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/facial/embeddings
 * Busca todos os embeddings de uma escola (para terminal web)
 * Params: escola_id, turma_id (opcional)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')

    if (!escolaId) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    // Controle de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escolaId) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    let query = `
      SELECT
        a.id AS aluno_id,
        a.nome,
        a.codigo,
        a.turma_id,
        a.serie,
        encode(ef.embedding_data, 'base64') AS embedding_base64,
        ef.qualidade
      FROM alunos a
      INNER JOIN embeddings_faciais ef ON ef.aluno_id = a.id
      INNER JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
        AND cf.consentido = true AND cf.data_revogacao IS NULL
      WHERE a.escola_id = $1
        AND a.ativo = true
        AND a.situacao = 'cursando'
    `
    const params: string[] = [escolaId]

    if (turmaId) {
      query += ` AND a.turma_id = $2`
      params.push(turmaId)
    }

    query += ` ORDER BY a.nome`

    const result = await pool.query(query, params)

    return NextResponse.json({
      alunos: result.rows,
      total: result.rows.length,
    })
  } catch (error: any) {
    console.error('Erro ao buscar embeddings:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
