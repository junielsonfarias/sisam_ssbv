import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/professor-turmas
 * Lista vínculos professor-turma
 * Params: escola_id, professor_id, ano_letivo
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')
    const professorId = searchParams.get('professor_id')
    const anoLetivo = searchParams.get('ano_letivo')

    let query = `
      SELECT pt.id, pt.tipo_vinculo, pt.ano_letivo, pt.ativo, pt.criado_em,
             u.id as professor_id, u.nome as professor_nome, u.email as professor_email,
             t.id as turma_id, t.nome as turma_nome, t.serie, t.turno,
             e.id as escola_id, e.nome as escola_nome,
             de.id as disciplina_id, de.nome as disciplina_nome
      FROM professor_turmas pt
      INNER JOIN usuarios u ON u.id = pt.professor_id
      INNER JOIN turmas t ON t.id = pt.turma_id
      INNER JOIN escolas e ON e.id = t.escola_id
      LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
      WHERE pt.ativo = true
    `
    const params: string[] = []
    let paramIndex = 1

    if (escolaId) {
      query += ` AND t.escola_id = $${paramIndex++}`
      params.push(escolaId)
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ` AND t.escola_id = $${paramIndex++}`
      params.push(usuario.escola_id)
    }

    if (professorId) {
      query += ` AND pt.professor_id = $${paramIndex++}`
      params.push(professorId)
    }

    if (anoLetivo) {
      query += ` AND pt.ano_letivo = $${paramIndex++}`
      params.push(anoLetivo)
    }

    query += ` ORDER BY e.nome, t.serie, t.nome, u.nome`

    const result = await pool.query(query, params)

    return NextResponse.json({ vinculos: result.rows })
  } catch (error: any) {
    console.error('Erro ao listar vínculos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/professor-turmas
 * Cria vínculo professor-turma
 * Body: { professor_id, turma_id, disciplina_id?, tipo_vinculo, ano_letivo }
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo } = await request.json()

    if (!professor_id || !turma_id || !tipo_vinculo || !ano_letivo) {
      return NextResponse.json({ mensagem: 'professor_id, turma_id, tipo_vinculo e ano_letivo são obrigatórios' }, { status: 400 })
    }

    if (!['polivalente', 'disciplina'].includes(tipo_vinculo)) {
      return NextResponse.json({ mensagem: 'tipo_vinculo deve ser "polivalente" ou "disciplina"' }, { status: 400 })
    }

    if (tipo_vinculo === 'disciplina' && !disciplina_id) {
      return NextResponse.json({ mensagem: 'disciplina_id é obrigatório para vínculo por disciplina' }, { status: 400 })
    }

    // Verificar se professor existe e é do tipo correto
    const profResult = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario = 'professor'",
      [professor_id]
    )
    if (profResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Professor não encontrado' }, { status: 404 })
    }

    // Verificar se turma existe
    const turmaResult = await pool.query('SELECT id, escola_id FROM turmas WHERE id = $1', [turma_id])
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    // Verificar permissão de escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && usuario.escola_id !== turmaResult.rows[0].escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO professor_turmas (professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [professor_id, turma_id, tipo_vinculo === 'polivalente' ? null : disciplina_id, tipo_vinculo, ano_letivo]
    )

    return NextResponse.json({
      mensagem: 'Vínculo criado com sucesso',
      vinculo_id: result.rows[0].id,
    }, { status: 201 })
  } catch (error: any) {
    // Constraint violation (vínculo duplicado)
    if (error.code === '23505') {
      return NextResponse.json({ mensagem: 'Vínculo já existe para esta turma/disciplina' }, { status: 409 })
    }
    console.error('Erro ao criar vínculo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/professor-turmas
 * Troca atômica de professor em uma turma/disciplina (preserva dados do anterior)
 * Body: { vinculo_id, novo_professor_id }
 */
export async function PATCH(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { vinculo_id, novo_professor_id } = await request.json()
    if (!vinculo_id || !novo_professor_id) {
      return NextResponse.json({ mensagem: 'vinculo_id e novo_professor_id são obrigatórios' }, { status: 400 })
    }

    // Verificar se novo professor existe
    const profResult = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario = 'professor' AND ativo = true",
      [novo_professor_id]
    )
    if (profResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Novo professor não encontrado' }, { status: 404 })
    }

    // Buscar vínculo atual
    const vinculoResult = await pool.query(
      `SELECT id, professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo
       FROM professor_turmas WHERE id = $1 AND ativo = true`,
      [vinculo_id]
    )
    if (vinculoResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Vínculo não encontrado ou já inativo' }, { status: 404 })
    }

    const vinculoAtual = vinculoResult.rows[0]

    if (vinculoAtual.professor_id === novo_professor_id) {
      return NextResponse.json({ mensagem: 'O novo professor é o mesmo do vínculo atual' }, { status: 400 })
    }

    // Transação atômica: desativar antigo → criar novo
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Desativar vínculo atual (soft delete — preserva histórico)
      await client.query(
        `UPDATE professor_turmas SET ativo = false WHERE id = $1`,
        [vinculo_id]
      )

      // 2. Criar novo vínculo com mesmo turma/disciplina/tipo/ano
      const novoResult = await client.query(
        `INSERT INTO professor_turmas (professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [novo_professor_id, vinculoAtual.turma_id, vinculoAtual.disciplina_id, vinculoAtual.tipo_vinculo, vinculoAtual.ano_letivo]
      )

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: 'Professor substituído com sucesso. Os dados de frequência anteriores foram preservados.',
        vinculo_anterior: vinculo_id,
        vinculo_novo: novoResult.rows[0].id,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ mensagem: 'O novo professor já possui vínculo ativo com esta turma/disciplina' }, { status: 409 })
    }
    console.error('Erro ao trocar professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/professor-turmas
 * Desativa vínculo (soft delete)
 * Body: { vinculo_id }
 */
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { vinculo_id } = await request.json()
    if (!vinculo_id) {
      return NextResponse.json({ mensagem: 'vinculo_id é obrigatório' }, { status: 400 })
    }

    const result = await pool.query(
      `UPDATE professor_turmas SET ativo = false WHERE id = $1 RETURNING id`,
      [vinculo_id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Vínculo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ mensagem: 'Vínculo removido com sucesso' })
  } catch (error: any) {
    console.error('Erro ao remover vínculo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
