import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, professorTurmaPostSchema, professorTurmaPatchSchema, professorTurmaDeleteSchema } from '@/lib/schemas'
import { buscarVinculos, criarVinculo, trocarProfessor, desativarVinculo, buscarTurmasComVinculos } from '@/lib/services/professores.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminProfessorTurmas')

export const dynamic = 'force-dynamic'

/**
 * Verifica se o usuario tem permissao para alterar/remover o vinculo.
 * Retorna { ok: true } | { ok: false, status, mensagem } para o caller
 * tratar como early-return.
 *
 * Auditoria 31/05/2026: PATCH/DELETE aceitavam vinculo_id sem checar se
 * o vinculo pertencia a escola/polo do usuario — diretor podia operar
 * vinculos de outras escolas.
 */
async function autorizarEscopoVinculo(
  vinculoId: string,
  usuario: { tipo_usuario: string; escola_id?: string | null; polo_id?: string | null }
): Promise<{ ok: true } | { ok: false; status: number; mensagem: string }> {
  // admin/tecnico tem acesso total
  if (usuario.tipo_usuario === 'administrador' || usuario.tipo_usuario === 'tecnico') {
    return { ok: true }
  }

  const result = await pool.query(
    `SELECT t.escola_id, e.polo_id
       FROM professor_turmas pt
       INNER JOIN turmas t ON t.id = pt.turma_id
       INNER JOIN escolas e ON e.id = t.escola_id
      WHERE pt.id = $1
      LIMIT 1`,
    [vinculoId]
  )
  if (result.rows.length === 0) {
    return { ok: false, status: 404, mensagem: 'Vínculo não encontrado' }
  }
  const { escola_id, polo_id } = result.rows[0]

  if (usuario.tipo_usuario === 'escola') {
    if (!usuario.escola_id || usuario.escola_id !== escola_id) {
      return { ok: false, status: 403, mensagem: 'Não autorizado para esta escola' }
    }
  }
  if (usuario.tipo_usuario === 'polo') {
    if (!usuario.polo_id || usuario.polo_id !== polo_id) {
      return { ok: false, status: 403, mensagem: 'Não autorizado para este polo' }
    }
  }
  return { ok: true }
}

/**
 * GET /api/admin/professor-turmas
 * - sem mode: lista vinculos professor-turma (legado, compat)
 * - mode=por_turma: lista TODAS as turmas (com ou sem professor) +
 *   slots (1 polivalente para iniciais, N disciplinas para finais via
 *   horarios_aula). Usado pelo painel /admin/professor-turmas.
 *
 * Filtros (escola_id, polo_id, ano_letivo, serie, turno) sao auto-
 * restringidos pelo escopo do usuario:
 * - escola: forca escola_id = usuario.escola_id
 * - polo:   forca polo_id   = usuario.polo_id
 * - admin/tecnico: ve tudo
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const mode = searchParams.get('mode')
    const { escola_id, professor_id, ano_letivo, serie, turno, polo_id } = parseSearchParams(
      searchParams,
      ['escola_id', 'professor_id', 'ano_letivo', 'serie', 'turno', 'polo_id']
    )

    // Escopo automatico por tipo de usuario
    const escolaFiltro = usuario.tipo_usuario === 'escola'
      ? usuario.escola_id
      : (escola_id || null)
    const poloFiltro = usuario.tipo_usuario === 'polo'
      ? usuario.polo_id
      : (polo_id || null)

    if (mode === 'por_turma') {
      const turmas = await buscarTurmasComVinculos({
        escolaId: escolaFiltro,
        poloId: poloFiltro,
        anoLetivo: ano_letivo,
        serie,
        turno,
      })
      return NextResponse.json({ turmas })
    }

    // Modo legado (lista de vinculos)
    const vinculos = await buscarVinculos({
      escolaId: escolaFiltro,
      professorId: professor_id,
      anoLetivo: ano_letivo,
    })
    return NextResponse.json({ vinculos })
  } catch (error: unknown) {
    log.error('Erro ao listar vinculos/turmas', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/admin/professor-turmas
 * Cria vínculo professor-turma
 * Body: { professor_id, turma_id, disciplina_id?, tipo_vinculo, ano_letivo }
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  try {
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

    // Verificar se turma existe (e trazer polo_id para autz de polo)
    const turmaResult = await pool.query(
      `SELECT t.id, t.escola_id, e.polo_id
         FROM turmas t
         INNER JOIN escolas e ON e.id = t.escola_id
        WHERE t.id = $1`,
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    const turmaInfo = turmaResult.rows[0]

    // Autorizacao por tipo de usuario
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && usuario.escola_id !== turmaInfo.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id && usuario.polo_id !== turmaInfo.polo_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para este polo' }, { status: 403 })
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
    log.error('Erro ao criar vínculo', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * PATCH /api/admin/professor-turmas
 * Troca atômica de professor em uma turma/disciplina (preserva dados do anterior)
 * Body: { vinculo_id, novo_professor_id }
 */
export const PATCH = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, professorTurmaPatchSchema)
    if (!validacao.success) return validacao.response
    const { vinculo_id, novo_professor_id } = validacao.data

    // IDOR: validar que o vinculo pertence ao escopo do usuario
    const autz = await autorizarEscopoVinculo(vinculo_id, usuario)
    if (!autz.ok) {
      return NextResponse.json({ mensagem: autz.mensagem }, { status: autz.status })
    }

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
    log.error('Erro ao trocar professor', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * DELETE /api/admin/professor-turmas
 * Desativa vínculo (soft delete)
 * Body: { vinculo_id }
 */
export const DELETE = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, professorTurmaDeleteSchema)
    if (!validacao.success) return validacao.response
    const { vinculo_id } = validacao.data

    // IDOR: validar que o vinculo pertence ao escopo do usuario
    const autz = await autorizarEscopoVinculo(vinculo_id, usuario)
    if (!autz.ok) {
      return NextResponse.json({ mensagem: autz.mensagem }, { status: autz.status })
    }

    const encontrado = await desativarVinculo(vinculo_id)

    if (!encontrado) {
      return NextResponse.json({ mensagem: 'Vínculo não encontrado' }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    log.error('Erro ao remover vínculo', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
