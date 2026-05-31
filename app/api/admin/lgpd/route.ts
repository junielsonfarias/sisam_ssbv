/**
 * /api/admin/lgpd
 *
 * GET: lista solicitações LGPD com filtros + estatísticas
 * PATCH: atualiza status de uma solicitação (cancelar, concluir, executar)
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import {
  coletarDadosTitular,
  estatisticasLgpd,
  listarSolicitacoesAdmin,
} from '@/lib/services/lgpd.service'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  acao: z.enum(['cancelar', 'concluir', 'executar_exclusao']),
  observacao: z.string().max(2000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico'], 'admin', async (request) => {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('estatisticas') === 'true') {
    const stats = await estatisticasLgpd()
    return NextResponse.json({ estatisticas: stats })
  }

  if (searchParams.get('detalhe')) {
    const id = searchParams.get('detalhe')!
    const r = await pool.query(
      `SELECT s.*, u.nome AS usuario_nome, u.email AS usuario_email, u.tipo_usuario
         FROM lgpd_solicitacoes s
         LEFT JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.id = $1`,
      [id]
    )
    if (!r.rows[0]) return NextResponse.json({ mensagem: 'Não encontrada' }, { status: 404 })
    return NextResponse.json({ solicitacao: r.rows[0] })
  }

  if (searchParams.get('exportar_dados')) {
    const usuarioId = searchParams.get('exportar_dados')!
    const dados = await coletarDadosTitular(usuarioId, 'completo')
    return NextResponse.json({ dados })
  }

  const solicitacoes = await listarSolicitacoesAdmin({
    status: searchParams.get('status') || undefined,
    tipo: searchParams.get('tipo') || undefined,
    busca: searchParams.get('busca') || undefined,
    limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
  })
  return NextResponse.json({ solicitacoes })
})

export const PATCH = withAuthModulo(['administrador', 'tecnico'], 'admin', async (request, usuario) => {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ mensagem: 'Informe ?id=' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
  }

  const solR = await pool.query(`SELECT * FROM lgpd_solicitacoes WHERE id = $1`, [id])
  const sol = solR.rows[0]
  if (!sol) return NextResponse.json({ mensagem: 'Não encontrada' }, { status: 404 })

  switch (parsed.data.acao) {
    case 'cancelar': {
      if (sol.status !== 'pendente') {
        return NextResponse.json({ mensagem: 'Apenas solicitações pendentes podem ser canceladas' }, { status: 409 })
      }
      await pool.query(
        `UPDATE lgpd_solicitacoes
           SET status = 'cancelada', concluida_em = NOW()
         WHERE id = $1`,
        [id]
      )
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'LGPD_ADMIN_CANCELAR',
        entidade: 'lgpd_solicitacoes',
        entidadeId: id,
        detalhes: { observacao: parsed.data.observacao },
      })
      return NextResponse.json({ mensagem: 'Solicitação cancelada' })
    }
    case 'concluir': {
      if (sol.status === 'concluida') {
        return NextResponse.json({ mensagem: 'Já estava concluída' }, { status: 409 })
      }
      await pool.query(
        `UPDATE lgpd_solicitacoes
           SET status = 'concluida', concluida_em = NOW()
         WHERE id = $1`,
        [id]
      )
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'LGPD_ADMIN_CONCLUIR',
        entidade: 'lgpd_solicitacoes',
        entidadeId: id,
        detalhes: { observacao: parsed.data.observacao },
      })
      return NextResponse.json({ mensagem: 'Solicitação marcada como concluída' })
    }
    case 'executar_exclusao': {
      if (sol.tipo !== 'exclusao' || sol.status !== 'pendente') {
        return NextResponse.json({ mensagem: 'Só exclusões pendentes podem ser executadas' }, { status: 409 })
      }
      // Apenas marca como concluída; a execução real da exclusão de dados
      // permanece no job/cron (executarExclusoesPendentes). Aqui o admin
      // pode antecipar a marcação para sinalizar atendimento.
      const sufixo = '\n[executada manualmente por admin]' +
        (parsed.data.observacao ? ' — ' + parsed.data.observacao : '')
      await pool.query(
        `UPDATE lgpd_solicitacoes
           SET status = 'concluida', concluida_em = NOW(),
               motivo = COALESCE(motivo, '') || $2
         WHERE id = $1`,
        [id, sufixo]
      )
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'LGPD_ADMIN_EXECUTAR_EXCLUSAO',
        entidade: 'lgpd_solicitacoes',
        entidadeId: id,
        detalhes: { observacao: parsed.data.observacao, titular: sol.usuario_id },
      })
      return NextResponse.json({ mensagem: 'Exclusão marcada como executada. Execute o cron para apagar dados.' })
    }
  }
})
