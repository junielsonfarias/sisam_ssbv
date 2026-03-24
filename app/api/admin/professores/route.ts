import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, professorPostSchema, professorPutSchema, professorPatchSchema, professorDeleteSchema } from '@/lib/schemas'
import { buscarProfessores, criarProfessor, atualizarProfessor, toggleAtivoProfessor, deletarProfessor } from '@/lib/services/professores.service'

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

    const searchParams = request.nextUrl.searchParams
    const { escola_id, ativo } = parseSearchParams(searchParams, ['escola_id', 'ativo'])

    // Filtro de escola: usa o parâmetro ou a escola do usuário logado
    const escolaFiltro = escola_id || (usuario.tipo_usuario === 'escola' ? usuario.escola_id : null)

    const professores = await buscarProfessores({ escolaId: escolaFiltro, ativo })

    return NextResponse.json({ professores })
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

    const validacao = await validateRequest(request, professorPostSchema)
    if (!validacao.success) return validacao.response
    const { nome, email, senha } = validacao.data

    const resultado = await criarProfessor({ nome, email, senha })

    if ('erro' in resultado) {
      return NextResponse.json({ mensagem: resultado.erro }, { status: resultado.status })
    }

    console.log(`[AUDIT] Professor criado | ${email} | por ${usuario.email} (${usuario.tipo_usuario})`)
    return NextResponse.json({
      mensagem: 'Professor criado com sucesso',
      professor: resultado.professor,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/professores
 * Editar dados do professor (nome, email, cpf, telefone)
 * Body: { professor_id, nome?, email?, cpf?, telefone? }
 */
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, professorPutSchema)
    if (!validacao.success) return validacao.response
    const { professor_id, nome, email, cpf, telefone } = validacao.data

    const resultado = await atualizarProfessor({ professor_id, nome, email, cpf, telefone })

    if ('erro' in resultado) {
      return NextResponse.json({ mensagem: resultado.erro }, { status: resultado.status })
    }

    return NextResponse.json({
      mensagem: 'Professor atualizado com sucesso',
      professor: resultado.professor,
    })
  } catch (error: unknown) {
    console.error('Erro ao atualizar professor:', error)
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

    const validacao = await validateRequest(request, professorPatchSchema)
    if (!validacao.success) return validacao.response
    const { professor_id, ativo } = validacao.data

    const resultado = await toggleAtivoProfessor(professor_id, ativo)

    if ('erro' in resultado) {
      return NextResponse.json({ mensagem: resultado.erro }, { status: resultado.status })
    }

    return NextResponse.json({
      mensagem: ativo ? 'Professor ativado com sucesso' : 'Professor desativado',
      professor: resultado.professor,
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

    const validacao = await validateRequest(request, professorDeleteSchema)
    if (!validacao.success) return validacao.response
    const { professor_id } = validacao.data

    const resultado = await deletarProfessor(professor_id)

    if ('erro' in resultado) {
      return NextResponse.json({ mensagem: resultado.erro }, { status: resultado.status })
    }

    return NextResponse.json({ mensagem: 'Cadastro rejeitado e excluído' })
  } catch (error: unknown) {
    console.error('Erro ao excluir professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
