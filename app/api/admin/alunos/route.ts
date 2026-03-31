import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { isValidUUID, isUniqueConstraintError, getErrorMessage } from '@/lib/validation'
import { alunoSchema, cpfSchema, validateRequest, validateId } from '@/lib/schemas'
import {
  parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  createWhereBuilder, addCondition, addSearchCondition, addRawCondition,
  addAccessControl, buildConditionsString, parseSearchParams,
} from '@/lib/api-helpers'
import { criarAluno, atualizarAluno, deletarAluno } from '@/lib/services/alunos.service'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminAlunos')

// Schema para criação de aluno
const criarAlunoSchema = alunoSchema.extend({
  codigo: z.string().max(100).optional().nullable(),
})

// Schema para atualização de aluno
const atualizarAlunoSchema = alunoSchema.extend({
  id: z.string().uuid('ID do aluno inválido'),
  codigo: z.string().max(100).optional().nullable(),
  ativo: z.boolean().optional(),
})

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/alunos
 *
 * Lista alunos com paginação de 50 itens por página
 *
 * Parâmetros:
 * - pagina: número da página (default: 1)
 * - limite: itens por página (default: 50, max: 200)
 * - escola_id, turma_id, serie, ano_letivo: filtros
 * - busca: busca por nome ou código
 */
export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { polo_id, escola_id, turma_id, serie, ano_letivo, busca } = parseSearchParams(
      searchParams, ['polo_id', 'escola_id', 'turma_id', 'serie', 'ano_letivo', 'busca']
    )

    const paginacao = parsePaginacao(searchParams, { limiteMax: 200, limitePadrao: 50 })

    // Construir WHERE com helpers
    const where = createWhereBuilder()
    addRawCondition(where, 'a.ativo = true')
    addAccessControl(where, usuario, { escolaIdField: 'e.id', poloIdField: 'e.polo_id' })
    addCondition(where, 'e.polo_id', polo_id)
    addCondition(where, 'a.escola_id', escola_id)
    addCondition(where, 'a.turma_id', turma_id)
    addCondition(where, 'a.ano_letivo', ano_letivo)

    // Série: comparação flexível extraindo número
    if (serie) {
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        addRawCondition(where, `COALESCE(a.serie_numero, REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g')) = $${where.paramIndex}`, [numeroSerie])
      } else {
        addCondition(where, 'a.serie', serie, 'ILIKE')
      }
    }

    addSearchCondition(where, ['a.nome', 'a.codigo'], busca)

    const whereClause = `WHERE ${buildConditionsString(where)}`

    // Keyset pagination: se cursor vier, usa para paginação eficiente (O(1) vs O(n) do OFFSET)
    const cursor = searchParams.get('cursor')
    const dataParams = [...where.params]
    let cursorClause = ''
    if (cursor) {
      // cursor = "nome|id" codificado em base64
      try {
        const decoded = Buffer.from(cursor, 'base64').toString()
        const [cursorNome, cursorId] = decoded.split('|')
        if (cursorNome && cursorId) {
          cursorClause = ` AND (a.nome, a.id) > ($${dataParams.length + 1}, $${dataParams.length + 2})`
          dataParams.push(cursorNome, cursorId)
        }
      } catch { /* fallback para OFFSET */ }
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total FROM alunos a INNER JOIN escolas e ON a.escola_id = e.id ${whereClause}`,
        where.params
      ),
      pool.query(
        `SELECT
          a.id, a.codigo, a.nome, a.escola_id, a.turma_id, a.serie, a.ano_letivo,
          a.ativo, a.situacao, a.cpf, a.data_nascimento, a.pcd,
          a.criado_em, a.atualizado_em,
          e.nome as escola_nome, e.polo_id,
          p.nome as polo_nome,
          t.codigo as turma_codigo, t.nome as turma_nome
        FROM alunos a
        INNER JOIN escolas e ON a.escola_id = e.id
        LEFT JOIN polos p ON e.polo_id = p.id
        LEFT JOIN turmas t ON a.turma_id = t.id
        ${whereClause}${cursorClause}
        ORDER BY a.nome, a.id
        ${cursorClause ? `LIMIT ${paginacao.limite}` : buildLimitOffset(paginacao)}`,
        dataParams
      ),
    ])

    const total = parseInt(countResult.rows[0]?.total || '0')

    // Gerar cursor para próxima página (keyset pagination)
    const rows = dataResult.rows
    let nextCursor: string | undefined
    if (rows.length === paginacao.limite) {
      const last = rows[rows.length - 1]
      nextCursor = Buffer.from(`${last.nome}|${last.id}`).toString('base64')
    }

    return NextResponse.json({
      alunos: rows,
      paginacao: buildPaginacaoResponse(paginacao, total),
      ...(nextCursor && { next_cursor: nextCursor }),
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar alunos', error)

    return NextResponse.json({
      alunos: [],
      paginacao: {
        pagina: 1,
        limite: 50,
        total: 0,
        totalPaginas: 0,
        temProxima: false,
        temAnterior: false
      },
      erro: 'Erro interno do servidor'
    }, { status: 500 })
  }
})

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    // Validar dados de entrada com Zod
    const validacao = await validateRequest(request, criarAlunoSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { escola_id } = validacao.data

    // Escola só pode criar aluno na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const aluno = await criarAluno(validacao.data)

    return NextResponse.json(aluno, { status: 201 })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Turma não pertence à escola selecionada') {
      return NextResponse.json({ mensagem: error.message }, { status: 400 })
    }
    log.error('Erro ao criar aluno', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    // Validar dados de entrada com Zod
    const validacao = await validateRequest(request, atualizarAlunoSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { id, escola_id } = validacao.data

    // Escola só pode editar aluno da própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const aluno = await atualizarAluno(id, validacao.data)

    if (!aluno) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(aluno)
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    if (error instanceof Error && error.message === 'Turma não pertence à escola selecionada') {
      return NextResponse.json({ mensagem: error.message }, { status: 400 })
    }
    log.error('Erro ao atualizar aluno', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const idParam = searchParams.get('id')

    // Validar ID com schema Zod
    const validacaoId = validateId(idParam)
    if (!validacaoId.success) {
      return validacaoId.response
    }
    const id = validacaoId.data

    // Verificar se o aluno existe antes de tentar excluir
    const alunoExiste = await pool.query(
      'SELECT id, escola_id FROM alunos WHERE id = $1',
      [id]
    )

    if (alunoExiste.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    // Escola só pode excluir aluno da própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && alunoExiste.rows[0].escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const { nome } = await deletarAluno(id)
    log.info(`Aluno excluído: ${nome} (${id}) por ${usuario.email} (${usuario.tipo_usuario})`)
    return NextResponse.json({ mensagem: 'Aluno excluído com sucesso' })
  } catch (error: unknown) {
    log.error('Erro ao excluir aluno', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
