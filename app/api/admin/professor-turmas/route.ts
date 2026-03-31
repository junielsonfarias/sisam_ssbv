import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, professorTurmaPostSchema, professorTurmaPatchSchema, professorTurmaDeleteSchema } from '@/lib/schemas'
import { buscarVinculos, criarVinculo, trocarProfessor, desativarVinculo } from '@/lib/services/professores.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/professor-turmas
 * Lista vínculos professor-turma
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const { escola_id, professor_id, ano_letivo } = parseSearchParams(searchParams, ['escola_id', 'professor_id', 'ano_letivo'])

    const escolaFiltro = escola_id || (usuario.tipo_usuario === 'escola' ? usuario.escola_id : null)

    const vinculos = await buscarVinculos({
      escolaId: escolaFiltro,
      professorId: professor_id,
      anoLetivo: ano_letivo,
    })

    return NextResponse.json({ vinculos })
  } catch (error: unknown) {
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

    const validacao = await validateRequest(request, professorTurmaPostSchema)
    if (!validacao.success) return validacao.response
    const { professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo } = validacao.data

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

    const resultado = await criarVinculo({ professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo })

    return NextResponse.json({
      mensagem: 'Vínculo criado com sucesso',
      vinculo_id: resultado.id,
    }, { status: 201 })
  } catch (error: unknown) {
    // Constraint violation (vínculo duplicado)
    if ((error as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
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

    const validacao = await validateRequest(request, professorTurmaPatchSchema)
    if (!validacao.success) return validacao.response
    const { vinculo_id, novo_professor_id } = validacao.data

    // Verificar se novo professor existe
    const profResult = await pool.query(
      "SELECT id FROM usuarios WHERE id = $1 AND tipo_usuario = 'professor' AND ativo = true",
      [novo_professor_id]
    )
    if (profResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Novo professor não encontrado' }, { status: 404 })
    }

    const resultado = await trocarProfessor(vinculo_id, novo_professor_id)

    return NextResponse.json({
      mensagem: 'Professor substituído com sucesso. Os dados de frequência anteriores foram preservados.',
      vinculo_anterior: resultado.vinculo_anterior,
      vinculo_novo: resultado.vinculo_novo,
    })
  } catch (error: unknown) {
    if ((error as DatabaseError).code === PG_ERRORS.UNIQUE_VIOLATION) {
      return NextResponse.json({ mensagem: 'O novo professor já possui vínculo ativo com esta turma/disciplina' }, { status: 409 })
    }
    if (error instanceof Error) {
      if (error.message === 'Vínculo não encontrado ou já inativo') {
        return NextResponse.json({ mensagem: 'Vínculo não encontrado ou já inativo' }, { status: 404 })
      }
      if (error.message === 'O novo professor é o mesmo do vínculo atual') {
        return NextResponse.json({ mensagem: 'O novo professor é o mesmo do vínculo atual' }, { status: 400 })
      }
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

    const validacao = await validateRequest(request, professorTurmaDeleteSchema)
    if (!validacao.success) return validacao.response
    const { vinculo_id } = validacao.data

    const encontrado = await desativarVinculo(vinculo_id)

    if (!encontrado) {
      return NextResponse.json({ mensagem: 'Vínculo não encontrado' }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Erro ao remover vínculo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
