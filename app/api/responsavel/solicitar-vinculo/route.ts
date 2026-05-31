/**
 * /api/responsavel/solicitar-vinculo
 *
 * Responsavel LOGADO solicita vinculo com mais um(a) filho(a).
 * Cria registro em responsaveis_alunos com status='pendente' (escola
 * aprova depois em /admin/responsaveis).
 *
 * POST: { cpf_ou_codigo, tipo_vinculo }
 * GET:  lista solicitacoes do responsavel logado (todos status)
 */
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const schema = z.object({
  cpf_ou_codigo: z.string().min(3).max(20),
  tipo_vinculo: z.enum(['mae','pai','responsavel','avos','outro']).default('responsavel'),
})

export const GET = withAuth(['responsavel'], async (_request, usuario) => {
  const result = await pool.query(
    `SELECT ra.id, ra.aluno_id, ra.tipo_vinculo, ra.status, ra.origem,
            ra.solicitado_em, ra.aprovado_em, ra.motivo_rejeicao,
            a.nome AS aluno_nome, a.codigo AS aluno_codigo,
            e.nome AS escola_nome
       FROM responsaveis_alunos ra
       INNER JOIN alunos a ON a.id = ra.aluno_id
       INNER JOIN escolas e ON e.id = a.escola_id
      WHERE ra.usuario_id = $1
      ORDER BY ra.solicitado_em DESC`,
    [usuario.id]
  )
  return NextResponse.json({ solicitacoes: result.rows })
})

export const POST = withAuth(['responsavel'], async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados inválidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const d = parsed.data
  const termo = d.cpf_ou_codigo.replace(/\D/g, '')
  const buscaCpf = termo.length === 11 ? termo : null

  const alunoResult = await pool.query(
    `SELECT id, nome, escola_id FROM alunos
      WHERE ativo = true
        AND (
          ($1::text IS NOT NULL AND cpf = $1)
          OR codigo = $2
        )
      LIMIT 1`,
    [buscaCpf, d.cpf_ou_codigo.trim()]
  )
  if (alunoResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Aluno não encontrado. Confira CPF ou código de matrícula.' }, { status: 404 })
  }
  const aluno = alunoResult.rows[0]

  try {
    const result = await pool.query(
      `INSERT INTO responsaveis_alunos (
         usuario_id, aluno_id, tipo_vinculo, ativo, status, origem, solicitado_em
       ) VALUES ($1, $2, $3, true, 'pendente', 'solicitacao_pai', NOW())
       RETURNING id`,
      [usuario.id, aluno.id, d.tipo_vinculo]
    )

    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'RESPONSAVEL_SOLICITAR_VINCULO',
      entidade: 'responsaveis_alunos',
      entidadeId: result.rows[0].id,
      detalhes: { aluno_id: aluno.id, escola_id: aluno.escola_id },
    })

    return NextResponse.json({
      mensagem: `Solicitação enviada. Aguarde aprovação da escola para acessar dados de ${aluno.nome}.`,
      solicitacao_id: result.rows[0].id,
    }, { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ mensagem: 'Você já tem vínculo (ou solicitação) com este aluno.' }, { status: 409 })
    }
    throw err
  }
})
