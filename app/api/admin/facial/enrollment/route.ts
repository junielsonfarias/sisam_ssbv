import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { enrollmentFacialSchema } from '@/lib/schemas'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/facial/enrollment
 * Busca embedding facial de um aluno (base64)
 * Params: aluno_id
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT ef.embedding_data, ef.qualidade, ef.versao_modelo,
              a.nome AS aluno_nome
       FROM embeddings_faciais ef
       INNER JOIN alunos a ON a.id = ef.aluno_id
       WHERE ef.aluno_id = $1`,
      [alunoId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Embedding não encontrado' }, { status: 404 })
    }

    const row = result.rows[0]
    const embeddingBase64 = Buffer.from(row.embedding_data).toString('base64')

    return NextResponse.json({
      aluno_id: alunoId,
      aluno_nome: row.aluno_nome,
      embedding_data: embeddingBase64,
      qualidade: row.qualidade,
      versao_modelo: row.versao_modelo,
    })
  } catch (error: any) {
    console.error('Erro ao buscar embedding:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/facial/enrollment
 * Cadastra embedding facial de um aluno
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, enrollmentFacialSchema)
    if (!validacao.success) return validacao.response

    const { aluno_id, embedding_data, qualidade } = validacao.data

    // Verificar se aluno existe
    const alunoResult = await pool.query(
      'SELECT id, nome FROM alunos WHERE id = $1 AND ativo = true',
      [aluno_id]
    )
    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    // Verificar se há consentimento ativo
    const consentimentoResult = await pool.query(
      `SELECT id FROM consentimentos_faciais
       WHERE aluno_id = $1 AND consentido = true AND data_revogacao IS NULL`,
      [aluno_id]
    )
    if (consentimentoResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'É necessário registrar o consentimento do responsável antes do cadastro facial' },
        { status: 400 }
      )
    }

    // Converter base64 para buffer
    const embeddingBuffer = Buffer.from(embedding_data, 'base64')

    // Inserir ou atualizar embedding
    const result = await pool.query(
      `INSERT INTO embeddings_faciais (aluno_id, embedding_data, qualidade, registrado_por)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (aluno_id) DO UPDATE SET
        embedding_data = EXCLUDED.embedding_data,
        qualidade = EXCLUDED.qualidade,
        registrado_por = EXCLUDED.registrado_por
       RETURNING id`,
      [aluno_id, embeddingBuffer, qualidade || null, usuario.id]
    )

    return NextResponse.json({
      mensagem: 'Embedding facial cadastrado com sucesso',
      id: result.rows[0].id,
      aluno: alunoResult.rows[0],
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro no enrollment facial:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/facial/enrollment
 * Remove todos os dados faciais de um aluno (LGPD)
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('aluno_id')

    if (!alunoId) {
      return NextResponse.json({ mensagem: 'aluno_id é obrigatório' }, { status: 400 })
    }

    // Deletar embedding
    await pool.query('DELETE FROM embeddings_faciais WHERE aluno_id = $1', [alunoId])

    return NextResponse.json({
      mensagem: 'Dados faciais removidos com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao remover dados faciais:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
