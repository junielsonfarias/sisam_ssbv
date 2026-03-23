import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao, hashPassword } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/professores
 * Lista todos os professores com suas vinculações
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const filtroAtivo = searchParams.get('ativo') // 'true', 'false', null (todos)

    let query = `
      SELECT u.id, u.nome, u.email, u.ativo, u.criado_em, u.cpf, u.telefone,
             COUNT(DISTINCT pt.turma_id) as total_turmas,
             ARRAY_AGG(DISTINCT e.nome) FILTER (WHERE e.nome IS NOT NULL) as escolas
      FROM usuarios u
      LEFT JOIN professor_turmas pt ON pt.professor_id = u.id AND pt.ativo = true
      LEFT JOIN turmas t ON t.id = pt.turma_id
      LEFT JOIN escolas e ON e.id = t.escola_id
      WHERE u.tipo_usuario = 'professor'
    `
    const params: string[] = []
    let paramIndex = 1

    if (filtroAtivo === 'true') {
      query += ` AND u.ativo = true`
    } else if (filtroAtivo === 'false') {
      query += ` AND u.ativo = false`
    }

    if (escolaId) {
      query += ` AND (t.escola_id = $${paramIndex} OR pt.id IS NULL)`
      params.push(escolaId)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND (t.escola_id = $${paramIndex} OR pt.id IS NULL)`
      params.push(usuario.escola_id)
      paramIndex++
    }

    query += ` GROUP BY u.id, u.nome, u.email, u.ativo, u.criado_em, u.cpf, u.telefone ORDER BY u.ativo ASC, u.nome`

    const result = await pool.query(query, params)

    return NextResponse.json({ professores: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao listar professores:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/professores
 * Cria um novo professor
 * Body: { nome, email, senha }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { nome, email, senha } = await request.json()

    if (!nome || !email || !senha) {
      return NextResponse.json({ mensagem: 'nome, email e senha são obrigatórios' }, { status: 400 })
    }

    if (senha.length < 6) {
      return NextResponse.json({ mensagem: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // Verificar se email já existe
    const existeResult = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email.toLowerCase()]
    )
    if (existeResult.rows.length > 0) {
      return NextResponse.json({ mensagem: 'Email já cadastrado' }, { status: 409 })
    }

    const senhaHash = await hashPassword(senha)

    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo)
       VALUES ($1, $2, $3, 'professor', true)
       RETURNING id, nome, email, tipo_usuario, criado_em`,
      [nome.trim(), email.toLowerCase().trim(), senhaHash]
    )

    return NextResponse.json({
      mensagem: 'Professor criado com sucesso',
      professor: result.rows[0],
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/professores
 * Ativar ou desativar professor
 * Body: { professor_id, ativo }
 */
export async function PATCH(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { professor_id, ativo } = await request.json()
    if (!professor_id || typeof ativo !== 'boolean') {
      return NextResponse.json({ mensagem: 'professor_id e ativo são obrigatórios' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE usuarios SET ativo = $1 WHERE id = $2 AND tipo_usuario = 'professor' RETURNING id, nome, email, ativo`,
      [ativo, professor_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Professor não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      mensagem: ativo ? 'Professor ativado com sucesso' : 'Professor desativado',
      professor: result.rows[0],
    })
  } catch (error: unknown) {
    console.error('Erro ao atualizar professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/professores
 * Rejeitar cadastro pendente (excluir professor inativo sem vínculos)
 * Body: { professor_id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { professor_id } = await request.json()
    if (!professor_id) {
      return NextResponse.json({ mensagem: 'professor_id é obrigatório' }, { status: 400 })
    }

    // Só permite excluir se inativo e sem vínculos
    const vinculosResult = await pool.query(
      'SELECT COUNT(*) as total FROM professor_turmas WHERE professor_id = $1',
      [professor_id]
    )
    if (parseInt(vinculosResult.rows[0].total) > 0) {
      return NextResponse.json({ mensagem: 'Professor possui vínculos. Desative-o ao invés de excluir.' }, { status: 400 })
    }

    const result = await pool.query(
      `DELETE FROM usuarios WHERE id = $1 AND tipo_usuario = 'professor' AND ativo = false RETURNING id`,
      [professor_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Professor não encontrado ou já ativo (só é possível excluir cadastros pendentes)' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Cadastro rejeitado e excluído' })
  } catch (error: unknown) {
    console.error('Erro ao excluir professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
