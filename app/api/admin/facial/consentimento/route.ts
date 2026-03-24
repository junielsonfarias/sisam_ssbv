import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { consentimentoFacialSchema } from '@/lib/schemas'
import pool from '@/database/connection'
import { buscarConsentimentos, buscarConsentimentoAluno, revogarConsentimento } from '@/lib/services/facial.service'

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
    const alunoIdParam = searchParams.get('aluno_id')

    // Busca por aluno específico (usado na aba facial do perfil)
    if (alunoIdParam) {
      const alunos = await buscarConsentimentoAluno(alunoIdParam)
      return NextResponse.json({ alunos })
    }

    if (!escolaId) {
      return NextResponse.json({ mensagem: 'escola_id é obrigatório' }, { status: 400 })
    }

    const anoLetivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    const alunos = await buscarConsentimentos(escolaId, anoLetivo, turmaId)

    return NextResponse.json({ alunos })
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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

    // Validar que aluno existe e pertence à escola do usuário (se tipo escola)
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      const alunoCheck = await pool.query(
        'SELECT id FROM alunos WHERE id = $1 AND escola_id = $2',
        [alunoId, usuario.escola_id]
      )
      if (alunoCheck.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Aluno não encontrado nesta escola' }, { status: 403 })
      }
    }

    await revogarConsentimento(alunoId)

    return NextResponse.json({
      mensagem: 'Consentimento revogado e dados faciais removidos',
    })
  } catch (error: unknown) {
    console.error('Erro ao revogar consentimento:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
