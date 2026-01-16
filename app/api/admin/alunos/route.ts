import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { gerarCodigoAluno } from '@/lib/gerar-codigo-aluno'
import { isValidUUID, isUniqueConstraintError, getErrorMessage } from '@/lib/validation'
import { alunoSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'

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
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json(
        { alunos: [], total: 0, mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const poloId = searchParams.get('polo_id')
    const escolaId = searchParams.get('escola_id')
    const turmaId = searchParams.get('turma_id')
    const serie = searchParams.get('serie')
    const anoLetivo = searchParams.get('ano_letivo')
    const busca = searchParams.get('busca')

    // Parâmetros de paginação
    const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1'))
    const limite = Math.min(200, Math.max(1, parseInt(searchParams.get('limite') || '50')))
    const offset = (pagina - 1) * limite

    // Query base com condições (incluindo apenas alunos ativos)
    let whereConditions: string[] = ['a.ativo = true']
    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    // Aplicar restrições de acesso
    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(usuario.polo_id)
      paramIndex++
    } else if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      whereConditions.push(`e.id = $${paramIndex}`)
      params.push(usuario.escola_id)
      paramIndex++
    }

    // Aplicar filtros
    if (poloId) {
      whereConditions.push(`e.polo_id = $${paramIndex}`)
      params.push(poloId)
      paramIndex++
    }

    if (escolaId) {
      whereConditions.push(`a.escola_id = $${paramIndex}`)
      params.push(escolaId)
      paramIndex++
    }

    if (turmaId) {
      whereConditions.push(`a.turma_id = $${paramIndex}`)
      params.push(turmaId)
      paramIndex++
    }

    if (serie) {
      // Extrair apenas o número da série para comparação flexível
      // Ex: "3º Ano" -> "3", "5º" -> "5"
      const numeroSerie = serie.match(/\d+/)?.[0]
      if (numeroSerie) {
        // Buscar séries que contenham o mesmo número (ex: "3º", "3º Ano", "3")
        whereConditions.push(`REGEXP_REPLACE(a.serie, '[^0-9]', '', 'g') = $${paramIndex}`)
        params.push(numeroSerie)
        paramIndex++
      } else {
        // Se não for numérico, comparar diretamente
        whereConditions.push(`a.serie ILIKE $${paramIndex}`)
        params.push(serie)
        paramIndex++
      }
    }

    if (anoLetivo) {
      whereConditions.push(`a.ano_letivo = $${paramIndex}`)
      params.push(anoLetivo)
      paramIndex++
    }

    if (busca && busca.trim()) {
      // CORREÇÃO: Usar dois parâmetros separados para evitar SQL injection e paramIndex incorreto
      const searchTerm = `%${busca.trim()}%`
      whereConditions.push(`(a.nome ILIKE $${paramIndex} OR a.codigo ILIKE $${paramIndex + 1})`)
      params.push(searchTerm, searchTerm)
      paramIndex += 2
    }

    const whereClause = whereConditions.join(' AND ')

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      WHERE ${whereClause}
    `

    // Query para buscar dados com paginação
    const dataQuery = `
      SELECT
        a.id,
        a.codigo,
        a.nome,
        a.escola_id,
        a.turma_id,
        a.serie,
        a.ano_letivo,
        a.ativo,
        a.criado_em,
        a.atualizado_em,
        e.nome as escola_nome,
        e.polo_id,
        p.nome as polo_nome,
        t.codigo as turma_codigo,
        t.nome as turma_nome
      FROM alunos a
      INNER JOIN escolas e ON a.escola_id = e.id
      LEFT JOIN polos p ON e.polo_id = p.id
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE ${whereClause}
      ORDER BY a.nome
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    // Executar queries em paralelo com tratamento de erro
    let countResult, dataResult
    try {
      [countResult, dataResult] = await Promise.all([
        pool.query(countQuery, params),
        pool.query(dataQuery, [...params, limite, offset])
      ])
    } catch (queryError: any) {
      console.error('Erro na query SQL:', queryError)
      console.error('Query count:', countQuery)
      console.error('Query data:', dataQuery)
      console.error('Params:', params)
      throw queryError
    }

    const total = parseInt(countResult.rows[0]?.total || '0')
    const totalPaginas = Math.ceil(total / limite)

    return NextResponse.json({
      alunos: dataResult.rows,
      paginacao: {
        pagina,
        limite,
        total,
        totalPaginas,
        temProxima: pagina < totalPaginas,
        temAnterior: pagina > 1
      }
    })
  } catch (error: any) {
    console.error('Erro ao buscar alunos:', error?.message || error)

    // Retornar estrutura válida mesmo em erro para evitar crash no frontend
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
      erro: error?.message || 'Erro interno do servidor'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Validar dados de entrada com Zod
    const validacao = await validateRequest(request, criarAlunoSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { codigo, nome, escola_id, turma_id, serie, ano_letivo } = validacao.data

    // Gerar código automático se não fornecido
    const codigoFinal = codigo || await gerarCodigoAluno()

    const result = await pool.query(
      `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        codigoFinal,
        nome,
        escola_id,
        turma_id || null,
        serie || null,
        ano_letivo || null,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao criar aluno:', getErrorMessage(error))
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

    // Validar dados de entrada com Zod
    const validacao = await validateRequest(request, atualizarAlunoSchema)
    if (!validacao.success) {
      return validacao.response
    }

    const { id, codigo, nome, escola_id, turma_id, serie, ano_letivo, ativo } = validacao.data

    const result = await pool.query(
      `UPDATE alunos
       SET codigo = $1, nome = $2, escola_id = $3, turma_id = $4, serie = $5, ano_letivo = $6, ativo = $7, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        codigo || null,
        nome,
        escola_id,
        turma_id || null,
        serie || null,
        ano_letivo || null,
        ativo !== undefined ? ativo : true,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { mensagem: 'Código já cadastrado' },
        { status: 400 }
      )
    }
    console.error('Erro ao atualizar aluno:', getErrorMessage(error))
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 403 }
      )
    }

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
      'SELECT id FROM alunos WHERE id = $1',
      [id]
    )

    if (alunoExiste.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    // Excluir dados relacionados explicitamente (fallback para garantir limpeza completa)
    // Isso garante que mesmo se a constraint não for CASCADE, os dados sejam removidos
    await pool.query('DELETE FROM resultados_provas WHERE aluno_id = $1', [id])
    await pool.query('DELETE FROM resultados_producao WHERE aluno_id = $1', [id])
    await pool.query('DELETE FROM resultados_consolidados WHERE aluno_id = $1', [id])

    // Agora excluir o aluno
    const result = await pool.query(
      'DELETE FROM alunos WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mensagem: 'Aluno excluído com sucesso' })
  } catch (error: unknown) {
    console.error('Erro ao excluir aluno:', getErrorMessage(error))
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

