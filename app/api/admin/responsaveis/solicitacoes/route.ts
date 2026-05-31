/**
 * /api/admin/responsaveis/solicitacoes
 *
 * Painel de aprovacao de vinculos responsavel<->aluno feitos por
 * auto-cadastro (pagina publica) ou solicitacao_pai (pai logado pediu
 * mais um filho).
 *
 * GET ?status=pendente|aprovado|rejeitado|todos  -> lista
 * PATCH                                          -> aprova/rejeita
 *
 * Escopo auto-restrito:
 *  - escola: ve so solicitacoes de alunos da sua escola
 *  - polo:   ve so de escolas do seu polo
 *  - admin/tecnico: ve todas
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('RespSolicitacoes')

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador','tecnico','escola','polo'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const statusFiltro = searchParams.get('status') || 'pendente'
  const escolaFiltro = searchParams.get('escola_id') || (usuario.tipo_usuario === 'escola' ? usuario.escola_id : null)
  const poloFiltro = usuario.tipo_usuario === 'polo' ? usuario.polo_id : null

  const where: string[] = []
  const params: any[] = []
  if (statusFiltro !== 'todos') {
    params.push(statusFiltro)
    where.push(`ra.status = $${params.length}`)
  }
  if (escolaFiltro) {
    params.push(escolaFiltro)
    where.push(`a.escola_id = $${params.length}`)
  }
  if (poloFiltro) {
    params.push(poloFiltro)
    where.push(`e.polo_id = $${params.length}`)
  }

  const sql = `
    SELECT ra.id, ra.status, ra.origem, ra.tipo_vinculo,
           ra.solicitado_em, ra.aprovado_em, ra.motivo_rejeicao,
           u.id AS usuario_id, u.nome AS responsavel_nome,
           u.email AS responsavel_email, u.cpf AS responsavel_cpf,
           u.telefone AS responsavel_telefone,
           a.id AS aluno_id, a.nome AS aluno_nome, a.codigo AS aluno_codigo,
           e.id AS escola_id, e.nome AS escola_nome,
           e.polo_id, p.nome AS polo_nome
      FROM responsaveis_alunos ra
      INNER JOIN usuarios u ON u.id = ra.usuario_id
      INNER JOIN alunos a ON a.id = ra.aluno_id
      INNER JOIN escolas e ON e.id = a.escola_id
      LEFT JOIN polos p ON p.id = e.polo_id
     ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY
       CASE ra.status WHEN 'pendente' THEN 0 WHEN 'aprovado' THEN 1 ELSE 2 END,
       ra.solicitado_em DESC
     LIMIT 500`

  try {
    const result = await pool.query(sql, params)
    return NextResponse.json({ solicitacoes: result.rows })
  } catch (err) {
    log.error('Erro ao listar solicitacoes', err)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

const patchSchema = z.object({
  solicitacao_id: z.string().uuid(),
  acao: z.enum(['aprovar','rejeitar']),
  motivo_rejeicao: z.string().max(500).optional().nullable(),
})

export const PATCH = withAuth(['administrador','tecnico','escola','polo'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
  }
  const d = parsed.data

  // Buscar solicitacao + escola do aluno para autorizar
  const solResult = await pool.query(
    `SELECT ra.id, ra.usuario_id, ra.aluno_id, ra.status,
            a.escola_id, u.nome AS responsavel_nome
       FROM responsaveis_alunos ra
       INNER JOIN alunos a ON a.id = ra.aluno_id
       INNER JOIN usuarios u ON u.id = ra.usuario_id
      WHERE ra.id = $1`,
    [d.solicitacao_id]
  )
  if (solResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Solicitação não encontrada' }, { status: 404 })
  }
  const sol = solResult.rows[0]

  if (!(await podeAcessarEscola(usuario, sol.escola_id))) {
    return NextResponse.json({ mensagem: 'Sem permissão para esta escola' }, { status: 403 })
  }

  if (sol.status !== 'pendente') {
    return NextResponse.json({ mensagem: `Solicitação já foi ${sol.status}.` }, { status: 409 })
  }

  const novoStatus = d.acao === 'aprovar' ? 'aprovado' : 'rejeitado'
  await pool.query(
    `UPDATE responsaveis_alunos
        SET status = $2,
            aprovado_por = $3,
            aprovado_em = NOW(),
            motivo_rejeicao = $4,
            atualizado_em = NOW()
      WHERE id = $1`,
    [d.solicitacao_id, novoStatus, usuario.id, d.acao === 'rejeitar' ? (d.motivo_rejeicao ?? null) : null]
  )

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: d.acao === 'aprovar' ? 'RESPONSAVEL_APROVAR_VINCULO' : 'RESPONSAVEL_REJEITAR_VINCULO',
    entidade: 'responsaveis_alunos',
    entidadeId: d.solicitacao_id,
    detalhes: {
      responsavel_id: sol.usuario_id,
      aluno_id: sol.aluno_id,
      escola_id: sol.escola_id,
    },
  })

  return NextResponse.json({
    mensagem: d.acao === 'aprovar'
      ? `Vínculo aprovado. ${sol.responsavel_nome} já pode acessar os dados do aluno.`
      : `Vínculo rejeitado.`,
  })
})
