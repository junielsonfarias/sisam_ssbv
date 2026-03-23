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
        t.codigo AS turma_codigo,
        t.nome AS turma_nome,
        ef.embedding_data,
        ef.qualidade
      FROM alunos a
      INNER JOIN embeddings_faciais ef ON ef.aluno_id = a.id
      INNER JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
        AND cf.consentido = true AND cf.data_revogacao IS NULL
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE a.escola_id = $1
        AND a.ativo = true
        AND a.situacao = 'cursando'
        AND a.ano_letivo = $2
    `
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()
    const params: string[] = [escolaId, anoLetivo]

    if (turmaId) {
      query += ` AND a.turma_id = $3`
      params.push(turmaId)
    }

    query += ` ORDER BY a.nome LIMIT 2000`

    const result = await pool.query(query, params)

    // Converter BYTEA para base64 limpo (sem quebras de linha do PostgreSQL)
    const alunos = result.rows.map(row => ({
      aluno_id: row.aluno_id,
      nome: row.nome,
      codigo: row.codigo,
      turma_id: row.turma_id,
      serie: row.serie,
      turma_codigo: row.turma_codigo,
      turma_nome: row.turma_nome,
      qualidade: row.qualidade,
      embedding_base64: row.embedding_data
        ? Buffer.from(row.embedding_data).toString('base64')
        : null,
    }))

    return NextResponse.json({
      alunos,
      total: alunos.length,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar embeddings:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
