import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { enrollmentFacialSchema } from '@/lib/schemas'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { cacheDelPattern } from '@/lib/cache/redis'

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
              ef.criado_em, ef.atualizado_em,
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
      criado_em: row.criado_em,
      atualizado_em: row.atualizado_em,
    })
  } catch (error: unknown) {
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
        registrado_por = EXCLUDED.registrado_por,
        atualizado_em = CURRENT_TIMESTAMP
       RETURNING id`,
      [aluno_id, embeddingBuffer, qualidade || null, usuario.id]
    )

    // Invalidar cache de embeddings da escola do aluno
    const escolaResult = await pool.query('SELECT escola_id FROM alunos WHERE id = $1', [aluno_id])
    if (escolaResult.rows[0]?.escola_id) {
      await cacheDelPattern(`facial:embeddings:${escolaResult.rows[0].escola_id}:*`)
    }

    return NextResponse.json({
      mensagem: 'Embedding facial cadastrado com sucesso',
      id: result.rows[0].id,
      aluno: alunoResult.rows[0],
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro no enrollment facial:', error)

    // Erro de constraint do PostgreSQL (qualidade fora do range, etc)
    if ((error as DatabaseError)?.code === PG_ERRORS.CHECK_VIOLATION) {
      return NextResponse.json({
        mensagem: 'Valor de qualidade fora do intervalo permitido (0-100)',
      }, { status: 400 })
    }

    return NextResponse.json({
      mensagem: 'Erro interno do servidor',
    }, { status: 500 })
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

    // Buscar escola antes de deletar para invalidar cache
    const escolaResult = await pool.query('SELECT escola_id FROM alunos WHERE id = $1', [alunoId])

    // Deletar embedding
    await pool.query('DELETE FROM embeddings_faciais WHERE aluno_id = $1', [alunoId])

    // Invalidar cache
    if (escolaResult.rows[0]?.escola_id) {
      await cacheDelPattern(`facial:embeddings:${escolaResult.rows[0].escola_id}:*`)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Erro ao remover dados faciais:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
