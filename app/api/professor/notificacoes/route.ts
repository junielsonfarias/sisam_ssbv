import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { parseBoolParam, parseIntParam, parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, notificacaoMarcarLidaSchema } from '@/lib/schemas'
import { createLogger } from '@/lib/logger'

const log = createLogger('ProfessorNotificacoes')

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/notificacoes
 * Busca notificações do professor autenticado.
 * Inclui notificações diretas (destinatario_id) e da escola (destinatario_tipo = 'professor' + escola_id).
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { tipo } = parseSearchParams(searchParams, ['tipo'])
    const apenasNaoLidas = parseBoolParam(searchParams, 'apenas_nao_lidas')
    const limite = parseIntParam(searchParams, 'limite', 50)

    // Buscar escola_ids do professor via professor_turmas
    const escolasResult = await pool.query(
      `SELECT DISTINCT t.escola_id
       FROM professor_turmas pt
       INNER JOIN turmas t ON t.id = pt.turma_id
       WHERE pt.professor_id = $1 AND pt.ativo = true`,
      [usuario.id]
    )
    const escolaIds = escolasResult.rows.map((r: any) => r.escola_id)

    // Condições de visibilidade:
    // 1) Notificações diretas para o professor (destinatario_id = usuario.id)
    // 2) Notificações para professores da escola (destinatario_tipo = 'professor' AND escola_id IN (...))
    const params: (string | number | boolean | null)[] = [usuario.id]
    let escolaCondition = 'FALSE'
    if (escolaIds.length > 0) {
      const placeholders = escolaIds.map((_: string, i: number) => `$${i + 2}`).join(',')
      escolaCondition = `(n.destinatario_tipo = 'professor' AND n.escola_id IN (${placeholders}))`
      params.push(...escolaIds)
    }

    const nextIdx = params.length + 1
    let tipoCondition = ''
    if (tipo) {
      tipoCondition = `AND n.tipo = $${nextIdx}`
      params.push(tipo)
    }

    let lidaCondition = ''
    if (apenasNaoLidas) {
      lidaCondition = 'AND n.lida = FALSE'
    }

    const limiteIdx = params.length + 1
    params.push(limite)

    const result = await pool.query(
      `SELECT n.id, n.tipo, n.titulo, n.mensagem, n.prioridade,
              n.lida, n.lida_em, n.criado_em,
              n.escola_id, n.aluno_id, n.turma_id,
              e.nome as escola_nome, a.nome as aluno_nome, t.codigo as turma_codigo
       FROM notificacoes n
       LEFT JOIN escolas e ON n.escola_id = e.id
       LEFT JOIN alunos a ON n.aluno_id = a.id
       LEFT JOIN turmas t ON n.turma_id = t.id
       WHERE (n.expira_em IS NULL OR n.expira_em > CURRENT_TIMESTAMP)
         AND (n.destinatario_id = $1 OR ${escolaCondition})
         ${tipoCondition}
         ${lidaCondition}
       ORDER BY n.criado_em DESC
       LIMIT $${limiteIdx}`,
      params
    )

    // Contagem de não lidas
    const countParams: (string | null)[] = [usuario.id]
    let countEscolaCondition = 'FALSE'
    if (escolaIds.length > 0) {
      const placeholders = escolaIds.map((_: string, i: number) => `$${i + 2}`).join(',')
      countEscolaCondition = `(n.destinatario_tipo = 'professor' AND n.escola_id IN (${placeholders}))`
      countParams.push(...escolaIds)
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM notificacoes n
       WHERE n.lida = FALSE
         AND (n.expira_em IS NULL OR n.expira_em > CURRENT_TIMESTAMP)
         AND (n.destinatario_id = $1 OR ${countEscolaCondition})`,
      countParams
    )

    return NextResponse.json({
      notificacoes: result.rows,
      nao_lidas: parseInt(countResult.rows[0].total),
    })
  } catch (error: unknown) {
    log.error('Erro ao buscar notificações do professor', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

/**
 * PUT /api/professor/notificacoes
 * Marca notificações como lidas.
 * Body: { ids: string[], marcar_todas?: boolean }
 */
export const PUT = withAuth('professor', async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, notificacaoMarcarLidaSchema)
    if (!validacao.success) return validacao.response
    const { ids, marcar_todas } = validacao.data

    if (marcar_todas) {
      // Buscar escola_ids do professor
      const escolasResult = await pool.query(
        `SELECT DISTINCT t.escola_id
         FROM professor_turmas pt
         INNER JOIN turmas t ON t.id = pt.turma_id
         WHERE pt.professor_id = $1 AND pt.ativo = true`,
        [usuario.id]
      )
      const escolaIds = escolasResult.rows.map((r: any) => r.escola_id)

      const params: (string | null)[] = [usuario.id, usuario.id]
      let escolaCondition = 'FALSE'
      if (escolaIds.length > 0) {
        const placeholders = escolaIds.map((_: string, i: number) => `$${i + 3}`).join(',')
        escolaCondition = `(destinatario_tipo = 'professor' AND escola_id IN (${placeholders}))`
        params.push(...escolaIds)
      }

      await pool.query(
        `UPDATE notificacoes
         SET lida = TRUE, lida_em = CURRENT_TIMESTAMP, lida_por = $1
         WHERE lida = FALSE
           AND (destinatario_id = $2 OR ${escolaCondition})`,
        params
      )

      return NextResponse.json({ mensagem: 'Todas marcadas como lidas' })
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json({ mensagem: 'ids e obrigatorio' }, { status: 400 })
    }

    const placeholders = ids.map((_: string, i: number) => `$${i + 2}`).join(',')
    await pool.query(
      `UPDATE notificacoes
       SET lida = TRUE, lida_em = CURRENT_TIMESTAMP, lida_por = $1
       WHERE id IN (${placeholders})`,
      [usuario.id, ...ids]
    )

    return NextResponse.json({ mensagem: `${ids.length} notificacao(oes) marcada(s) como lida(s)` })
  } catch (error: unknown) {
    log.error('Erro ao marcar notificacoes do professor', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
