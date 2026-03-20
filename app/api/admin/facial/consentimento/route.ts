import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { consentimentoFacialSchema } from '@/lib/schemas'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/facial/consentimento
 * Lista status de consentimento facial dos alunos
 * Params: escola_id, turma_id
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

    let query = `
      SELECT
        a.id AS aluno_id,
        a.nome AS aluno_nome,
        a.codigo AS aluno_codigo,
        cf.id AS consentimento_id,
        cf.responsavel_nome,
        cf.consentido,
        cf.data_consentimento,
        cf.data_revogacao,
        CASE WHEN ef.id IS NOT NULL THEN true ELSE false END AS tem_embedding
      FROM alunos a
      LEFT JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
      LEFT JOIN embeddings_faciais ef ON ef.aluno_id = a.id
      WHERE a.escola_id = $1 AND a.ativo = true
        AND a.ano_letivo = $2
    `
    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()
    const params: string[] = [escolaId, anoLetivo]

    if (turmaId) {
      query += ` AND a.turma_id = $3`
      params.push(turmaId)
    }

    query += ` ORDER BY a.nome`

    const result = await pool.query(query, params)

    return NextResponse.json({ alunos: result.rows })
  } catch (error: any) {
    console.error('Erro ao listar consentimentos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/facial/consentimento
 * Registra consentimento do responsável
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, consentimentoFacialSchema)
    if (!validacao.success) return validacao.response

    const { aluno_id, responsavel_nome, responsavel_cpf, consentido } = validacao.data

    // Verificar se aluno existe
    const alunoResult = await pool.query(
      'SELECT id, nome FROM alunos WHERE id = $1 AND ativo = true',
      [aluno_id]
    )
    if (alunoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    const result = await pool.query(
      `INSERT INTO consentimentos_faciais
        (aluno_id, responsavel_nome, responsavel_cpf, consentido, data_consentimento, ip_registro)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
       ON CONFLICT (aluno_id) DO UPDATE SET
        responsavel_nome = EXCLUDED.responsavel_nome,
        responsavel_cpf = EXCLUDED.responsavel_cpf,
        consentido = EXCLUDED.consentido,
        data_consentimento = CASE WHEN EXCLUDED.consentido THEN CURRENT_TIMESTAMP ELSE consentimentos_faciais.data_consentimento END,
        data_revogacao = CASE WHEN NOT EXCLUDED.consentido THEN CURRENT_TIMESTAMP WHEN EXCLUDED.consentido THEN NULL ELSE consentimentos_faciais.data_revogacao END,
        ip_registro = EXCLUDED.ip_registro
       RETURNING id, consentido`,
      [aluno_id, responsavel_nome, responsavel_cpf || null, consentido, ip]
    )

    return NextResponse.json({
      mensagem: consentido ? 'Consentimento registrado' : 'Consentimento revogado',
      consentimento: result.rows[0],
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao registrar consentimento:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/facial/consentimento
 * Revoga consentimento e remove dados faciais do aluno
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

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Revogar consentimento
      await client.query(
        `UPDATE consentimentos_faciais
         SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
         WHERE aluno_id = $1`,
        [alunoId]
      )

      // Remover embedding
      await client.query('DELETE FROM embeddings_faciais WHERE aluno_id = $1', [alunoId])

      // Manter frequências mas remover vínculo facial
      await client.query(
        `UPDATE frequencia_diaria SET metodo = 'manual', dispositivo_id = NULL, confianca = NULL
         WHERE aluno_id = $1 AND metodo = 'facial'`,
        [alunoId]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: 'Consentimento revogado e dados faciais removidos',
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Erro ao revogar consentimento:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
