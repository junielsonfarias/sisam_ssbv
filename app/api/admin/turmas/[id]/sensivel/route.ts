/**
 * PATCH /api/admin/turmas/[id]/sensivel
 *
 * Marca / desmarca uma turma como sensivel (LGPD art. 11). Quando sensivel,
 * leituras do diario passam a ser auditadas com DIARIO_LER_SENSIVEL.
 *
 * Body: { sensivel: boolean }
 *
 * Permissao: apenas administrador e tecnico. Escola NAO pode alterar a flag
 * (decisao deliberada: e responsabilidade da SEMED determinar quais turmas
 * sao sensiveis, nao da escola).
 *
 * Toda mudanca e auditada com DIARIO_MARCAR_SENSIVEL (ou
 * DIARIO_DESMARCAR_SENSIVEL) — note que este e um padrao de mutacao normal,
 * nao a auditoria de leitura.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { validateRequest } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'

const log = createLogger('AdminTurmaSensivel')

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  sensivel: z.boolean(),
})

export const PATCH = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const segments = request.nextUrl.pathname.split('/')
  const turmaId = segments[segments.indexOf('turmas') + 1]

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turmaId obrigatório' }, { status: 400 })
  }

  const validacao = await validateRequest(request, patchSchema)
  if (!validacao.success) return validacao.response

  try {
    // Confirma que a turma existe e pega o estado anterior para auditoria
    const antes = await pool.query(
      `SELECT id, codigo, sensivel, escola_id, ano_letivo
         FROM turmas
        WHERE id = $1`,
      [turmaId]
    )
    if (antes.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }
    const valorAnterior = antes.rows[0].sensivel as boolean

    // Se nao mudou nada, retorna 200 sem mexer no banco nem auditar
    if (valorAnterior === validacao.data.sensivel) {
      return NextResponse.json({
        mensagem: 'Nenhuma alteração necessária',
        sensivel: valorAnterior,
      })
    }

    const result = await pool.query(
      `UPDATE turmas SET sensivel = $1 WHERE id = $2 RETURNING id, sensivel`,
      [validacao.data.sensivel, turmaId]
    )

    // Auditoria com await — em mutacoes, garantir que o log esta no banco
    // antes de retornar (LGPD: nao podemos perder o registro se a request cair)
    await registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: validacao.data.sensivel ? 'DIARIO_MARCAR_SENSIVEL' : 'DIARIO_DESMARCAR_SENSIVEL',
      entidade: 'turma',
      entidadeId: turmaId,
      detalhes: {
        codigo: antes.rows[0].codigo,
        escola_id: antes.rows[0].escola_id,
        ano_letivo: antes.rows[0].ano_letivo,
        de: valorAnterior,
        para: validacao.data.sensivel,
      },
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    })

    // Invalida caches de turmas que possam carregar o campo sensivel
    try { await cacheDelPattern('turmas:*') } catch { /* nao bloqueia */ }

    return NextResponse.json({
      mensagem: validacao.data.sensivel
        ? 'Turma marcada como sensível. Leituras do diário passam a ser auditadas.'
        : 'Turma desmarcada. Leituras do diário não serão mais auditadas.',
      sensivel: result.rows[0].sensivel,
    })
  } catch (error) {
    log.error('Erro ao alterar flag sensivel da turma', error, { turmaId })
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
