import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, professorPostSchema, professorPutSchema, professorPatchSchema, professorDeleteSchema } from '@/lib/schemas'
import { buscarProfessores, criarProfessor, atualizarProfessor, toggleAtivoProfessor, deletarProfessor } from '@/lib/services/professores.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminProfessores')

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/professores
 * Lista todos os professores com suas vinculações
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
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
})

/**
 * POST /api/admin/professores
 * Cria um novo professor
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, professorPostSchema)
    if (!validacao.success) return validacao.response
    const { nome, email, senha } = validacao.data

    const resultado = await criarProfessor({ nome, email, senha })

    if ('erro' in resultado) {
      return NextResponse.json({ mensagem: resultado.erro }, { status: resultado.status })
    }

    log.info('Professor criado', { email, por: usuario.email, tipo: usuario.tipo_usuario })
    return NextResponse.json({
      mensagem: 'Professor criado com sucesso',
      professor: resultado.professor,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao criar professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * PUT /api/admin/professores
 * Editar dados do professor
 */
export const PUT = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
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
})

/**
 * PATCH /api/admin/professores
 * Ativar ou desativar professor
 */
export const PATCH = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
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
})

/**
 * DELETE /api/admin/professores
 * Rejeitar cadastro pendente
 */
export const DELETE = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, professorDeleteSchema)
    if (!validacao.success) return validacao.response
    const { professor_id } = validacao.data

    const resultado = await deletarProfessor(professor_id)

    if ('erro' in resultado) {
      return NextResponse.json({ mensagem: resultado.erro }, { status: resultado.status })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('Erro ao excluir professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
