/**
 * /api/admin/saude
 *
 * F5 — Saude Escolar (PSE — Programa Saude na Escola).
 *
 * GET   ?aluno_id=    -> lista atendimentos do aluno
 * GET   ?escola_id=   -> lista atendimentos da escola
 * POST                -> registra novo atendimento
 *
 * Acesso: administrador, tecnico, escola, polo (modulo `semed`).
 * Dados sensiveis sob LGPD art. 11 — auditoria registrada.
 */
import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { podeAcessarEscola } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const atendimentoSchema = z.object({
  aluno_id:        z.string().uuid(),
  escola_id:       z.string().uuid(),
  data:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo:            z.enum(['medico','odontologico','psicologico','social','enfermagem','nutricional','fonoaudiologo','fisioterapeutico']),
  profissional:    z.string().max(150).optional().nullable(),
  conselho_classe: z.string().max(50).optional().nullable(),
  motivo:          z.string().max(2000).optional().nullable(),
  procedimentos:   z.string().max(4000).optional().nullable(),
  encaminhamento:  z.string().max(2000).optional().nullable(),
  unidade_sus:     z.string().max(150).optional().nullable(),
})

export const GET = withAuthModulo(['administrador','tecnico','escola','polo'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const alunoId  = searchParams.get('aluno_id')
  const escolaId = searchParams.get('escola_id')

  if (!alunoId && !escolaId) {
    return NextResponse.json({ mensagem: 'Informe aluno_id ou escola_id' }, { status: 400 })
  }

  let escolaConsulta = escolaId
  if (alunoId && !escolaId) {
    const aluno = await pool.query('SELECT escola_id FROM alunos WHERE id = $1', [alunoId])
    if (aluno.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Aluno nao encontrado' }, { status: 404 })
    }
    escolaConsulta = aluno.rows[0].escola_id
  }

  if (escolaConsulta && !(await podeAcessarEscola(usuario, escolaConsulta))) {
    return NextResponse.json({ mensagem: 'Sem permissao para esta escola' }, { status: 403 })
  }

  const where: string[] = []
  const params: any[] = []
  if (alunoId)  { params.push(alunoId);  where.push(`aluno_id = $${params.length}`) }
  if (escolaId) { params.push(escolaId); where.push(`escola_id = $${params.length}`) }

  const result = await pool.query(
    `SELECT id, aluno_id, escola_id, data, tipo, profissional, conselho_classe,
            motivo, encaminhamento, unidade_sus, criado_em
       FROM saude_atendimentos
      WHERE ${where.join(' AND ')}
      ORDER BY data DESC, criado_em DESC
      LIMIT 500`,
    params
  )

  return NextResponse.json({ atendimentos: result.rows })
})

export const POST = withAuthModulo(['administrador','tecnico','escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = atendimentoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const dados = parsed.data

  if (!(await podeAcessarEscola(usuario, dados.escola_id))) {
    return NextResponse.json({ mensagem: 'Sem permissao para esta escola' }, { status: 403 })
  }

  const result = await pool.query(
    `INSERT INTO saude_atendimentos (
       aluno_id, escola_id, data, tipo, profissional, conselho_classe,
       motivo, procedimentos, encaminhamento, unidade_sus, registrado_por
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, criado_em`,
    [
      dados.aluno_id, dados.escola_id, dados.data, dados.tipo,
      dados.profissional, dados.conselho_classe,
      dados.motivo, dados.procedimentos, dados.encaminhamento, dados.unidade_sus,
      usuario.id,
    ]
  )

  // LGPD art. 11: NAO loggar motivo/procedimentos no detalhes (PII medica)
  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'SAUDE_REGISTRAR_ATENDIMENTO',
    entidade: 'saude_atendimentos',
    entidadeId: result.rows[0].id,
    detalhes: { tipo: dados.tipo, aluno_id: dados.aluno_id, escola_id: dados.escola_id, data: dados.data },
  })

  return NextResponse.json({ id: result.rows[0].id, criado_em: result.rows[0].criado_em }, { status: 201 })
})
