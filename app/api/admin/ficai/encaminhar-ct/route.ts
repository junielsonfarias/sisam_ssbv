/**
 * /api/admin/ficai/encaminhar-ct
 *
 * F5 — encaminha um caso FICAI ao Conselho Tutelar (ECA art. 56).
 *
 * GET  ?ficai_id=     -> lista encaminhamentos do caso
 * POST                -> cria novo encaminhamento
 * PATCH               -> registra retorno do CT
 *
 * Acesso: administrador, tecnico, escola (apenas seus casos).
 */
import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  ficai_id:            z.string().uuid(),
  conselho_tutelar_id: z.string().uuid(),
  data_envio:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  meio_envio:          z.enum(['presencial','whatsapp','email','oficio','plataforma_externa']),
  protocolo:           z.string().max(50).nullable().optional(),
  documento_url:       z.string().url().max(1000).nullable().optional(),
  observacoes:         z.string().max(2000).nullable().optional(),
})

const patchSchema = z.object({
  id:                 z.string().uuid(),
  status:             z.enum(['recebido','em_atendimento','concluido','sem_resposta','devolvido']),
  retorno_recebido_em: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  retorno_parecer:    z.string().max(4000).nullable().optional(),
  retorno_acao:       z.string().max(2000).nullable().optional(),
})

export const GET = withAuthModulo(['administrador','tecnico','escola','polo'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const ficaiId = searchParams.get('ficai_id')
  if (!ficaiId) {
    return NextResponse.json({ mensagem: 'ficai_id obrigatorio' }, { status: 400 })
  }

  // IDOR: POST/PATCH já validam o vínculo caso->escola; o GET não validava e
  // expunha encaminhamentos ao CT (parecer/retorno/protocolo, dados ECA).
  const casoResult = await pool.query('SELECT escola_id FROM ficai_casos WHERE id = $1 LIMIT 1', [ficaiId])
  if (casoResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Caso FICAI nao encontrado' }, { status: 404 })
  }
  if (!(await podeAcessarEscola(usuario, casoResult.rows[0].escola_id))) {
    return NextResponse.json({ mensagem: 'Sem permissao para este caso FICAI' }, { status: 403 })
  }

  const result = await pool.query(
    `SELECT e.id, e.ficai_id, e.conselho_tutelar_id, ct.nome AS conselho_nome,
            e.data_envio, e.meio_envio, e.protocolo, e.status,
            e.retorno_recebido_em, e.retorno_parecer, e.retorno_acao,
            e.criado_em
       FROM ficai_encaminhamentos_ct e
       JOIN conselhos_tutelares ct ON ct.id = e.conselho_tutelar_id
      WHERE e.ficai_id = $1
      ORDER BY e.data_envio DESC, e.criado_em DESC`,
    [ficaiId]
  )

  return NextResponse.json({ encaminhamentos: result.rows })
})

export const POST = withAuthModulo(['administrador','tecnico','escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const d = parsed.data

  // IDOR: garantir que o ficai_caso pertence a uma escola que o usuario
  // tem permissao de acessar (auditoria 31/05/2026).
  const ficaiResult = await pool.query(
    `SELECT escola_id FROM ficai_casos WHERE id = $1 LIMIT 1`,
    [d.ficai_id]
  )
  if (ficaiResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Caso FICAI nao encontrado' }, { status: 404 })
  }
  if (!(await podeAcessarEscola(usuario, ficaiResult.rows[0].escola_id))) {
    return NextResponse.json({ mensagem: 'Sem permissao para este caso FICAI' }, { status: 403 })
  }

  const result = await pool.query(
    `INSERT INTO ficai_encaminhamentos_ct (
       ficai_id, conselho_tutelar_id, data_envio, meio_envio, protocolo,
       documento_url, responsavel_envio_id, observacoes
     ) VALUES ($1,$2,COALESCE($3::date, CURRENT_DATE),$4,$5,$6,$7,$8)
     RETURNING id, criado_em`,
    [d.ficai_id, d.conselho_tutelar_id, d.data_envio ?? null, d.meio_envio,
     d.protocolo ?? null, d.documento_url ?? null, usuario.id, d.observacoes ?? null]
  )

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'FICAI_ENCAMINHAR_CT',
    entidade: 'ficai_encaminhamentos_ct',
    entidadeId: result.rows[0].id,
    detalhes: { ficai_id: d.ficai_id, ct_id: d.conselho_tutelar_id, meio: d.meio_envio },
  })

  return NextResponse.json(result.rows[0], { status: 201 })
})

export const PATCH = withAuthModulo(['administrador','tecnico','escola'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const d = parsed.data

  // IDOR: validar vinculo do encaminhamento -> caso FICAI -> escola
  const escolaResult = await pool.query(
    `SELECT fc.escola_id
       FROM ficai_encaminhamentos_ct enc
       JOIN ficai_casos fc ON fc.id = enc.ficai_id
      WHERE enc.id = $1
      LIMIT 1`,
    [d.id]
  )
  if (escolaResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Encaminhamento nao encontrado' }, { status: 404 })
  }
  if (!(await podeAcessarEscola(usuario, escolaResult.rows[0].escola_id))) {
    return NextResponse.json({ mensagem: 'Sem permissao para este encaminhamento' }, { status: 403 })
  }

  const result = await pool.query(
    `UPDATE ficai_encaminhamentos_ct
        SET status = $2,
            retorno_recebido_em = COALESCE($3::date, retorno_recebido_em),
            retorno_parecer = COALESCE($4, retorno_parecer),
            retorno_acao = COALESCE($5, retorno_acao),
            atualizado_em = NOW()
      WHERE id = $1
      RETURNING id, status, atualizado_em`,
    [d.id, d.status, d.retorno_recebido_em ?? null, d.retorno_parecer ?? null, d.retorno_acao ?? null]
  )

  if (result.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Encaminhamento nao encontrado' }, { status: 404 })
  }

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'FICAI_RETORNO_CT',
    entidade: 'ficai_encaminhamentos_ct',
    entidadeId: d.id,
    detalhes: { status: d.status },
  })

  return NextResponse.json(result.rows[0])
})
