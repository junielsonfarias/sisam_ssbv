import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import {
  parseSearchParams, parsePaginacao, buildPaginacaoResponse, buildLimitOffset,
  createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'
import { validateRequest, frequenciaDiariaDeleteSchema, frequenciaDiariaPatchSchema } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/frequencia-diaria
 * Lista frequência diária com filtros
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
    const searchParams = request.nextUrl.searchParams
    const { escola_id, turma_id, data, data_inicio, data_fim, metodo, status, ano_letivo } = parseSearchParams(
      searchParams, ['escola_id', 'turma_id', 'data', 'data_inicio', 'data_fim', 'metodo', 'status', 'ano_letivo']
    )
    const paginacao = parsePaginacao(searchParams, { limiteMax: 200, limitePadrao: 50 })

    const where = createWhereBuilder()

    // Controle de acesso
    const escolaFiltro = (usuario.tipo_usuario === 'escola' && usuario.escola_id) ? usuario.escola_id : escola_id
    addCondition(where, 'fd.escola_id', escolaFiltro)
    addCondition(where, 'fd.turma_id', turma_id)

    if (data) {
      addCondition(where, 'fd.data', data)
    } else {
      addCondition(where, 'fd.data', data_inicio, '>=')
      addCondition(where, 'fd.data', data_fim, '<=')
    }

    addCondition(where, 'fd.metodo', metodo)

    if (status && ['presente', 'ausente'].includes(status)) {
      addCondition(where, 'fd.status', status)
    }

    if (ano_letivo) {
      addRawCondition(where, `EXTRACT(YEAR FROM fd.data) = $${where.paramIndex}`, [parseInt(ano_letivo, 10)])
    }

    const whereClause = `WHERE ${buildConditionsString(where)}`

    const [result, countResult] = await Promise.all([
      pool.query(
        `SELECT fd.id, fd.aluno_id, fd.data, fd.hora_entrada, fd.hora_saida,
               fd.metodo, fd.confianca, fd.status, fd.justificativa, fd.criado_em,
               a.nome AS aluno_nome, a.codigo AS aluno_codigo,
               t.nome AS turma_nome, t.codigo AS turma_codigo,
               d.nome AS dispositivo
        FROM frequencia_diaria fd
        INNER JOIN alunos a ON a.id = fd.aluno_id
        LEFT JOIN turmas t ON t.id = fd.turma_id
        LEFT JOIN dispositivos_faciais d ON d.id = fd.dispositivo_id
        ${whereClause}
        ORDER BY fd.data DESC, fd.status ASC, a.nome ASC
        ${buildLimitOffset(paginacao)}`,
        where.params
      ),
      pool.query(
        `SELECT COUNT(*) as total FROM frequencia_diaria fd ${whereClause}`,
        where.params
      ),
    ])

    const total = parseInt(countResult.rows[0]?.total || '0', 10)

    return NextResponse.json({
      frequencias: result.rows,
      paginacao: buildPaginacaoResponse(paginacao, total),
    })
})

/**
 * DELETE /api/admin/frequencia-diaria
 * Exclui um registro de frequência
 * Body: { id }
 */
export const DELETE = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
    const validacao = await validateRequest(request, frequenciaDiariaDeleteSchema)
    if (!validacao.success) return validacao.response
    const { id } = validacao.data

    // Buscar dados do registro antes de excluir (para limpar frequencia_hora_aula)
    let selectQuery = 'SELECT id, aluno_id, turma_id, data FROM frequencia_diaria WHERE id = $1'
    const selectParams: string[] = [id]

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      selectQuery += ' AND escola_id = $2'
      selectParams.push(usuario.escola_id)
    }

    const registro = await pool.query(selectQuery, selectParams)

    if (registro.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
    }

    const { aluno_id, turma_id, data: dataRegistro } = registro.rows[0]

    // Excluir em transação atômica (frequencia_diaria + frequencia_hora_aula)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query('DELETE FROM frequencia_diaria WHERE id = $1', [id])

      if (aluno_id && turma_id && dataRegistro) {
        await client.query(
          'DELETE FROM frequencia_hora_aula WHERE aluno_id = $1 AND turma_id = $2 AND data = $3',
          [aluno_id, turma_id, dataRegistro]
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    try { await cacheDelPattern('frequencia:*') } catch {}
    try { await cacheDelPattern('boletim:*') } catch {}

    return NextResponse.json({ mensagem: 'Registro excluído com sucesso' })
})

/**
 * PATCH /api/admin/frequencia-diaria
 * Atualiza justificativa de um registro de frequência
 * Body: { id, justificativa }
 */
export const PATCH = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
    const validacao = await validateRequest(request, frequenciaDiariaPatchSchema)
    if (!validacao.success) return validacao.response
    const { id, justificativa } = validacao.data

    let query = 'UPDATE frequencia_diaria SET justificativa = $1 WHERE id = $2'
    const params: (string | null)[] = [justificativa || null, id]

    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      query += ' AND escola_id = $3'
      params.push(usuario.escola_id)
    }

    query += ' RETURNING id'
    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
    }

    try { await cacheDelPattern('frequencia:*') } catch {}

    return NextResponse.json({ mensagem: 'Justificativa salva com sucesso' })
})
