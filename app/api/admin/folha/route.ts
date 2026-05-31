/**
 * /api/admin/folha
 *
 * F5 — Folha de pagamento mensal por servidor.
 *
 * GET ?servidor_id= | ?competencia_ano=&competencia_mes=  -> lista folhas
 * POST                                                     -> cria folha (rascunho)
 *
 * Folha so pode ser editada em status='rascunho'. Apos 'fechada', requer admin.
 * Acesso: administrador, tecnico (sempre); escola pode ver as proprias.
 */
import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const eventoSchema = z.object({
  tipo:       z.enum(['provento','desconto']),
  codigo:     z.string().max(30),
  descricao:  z.string().max(150),
  referencia: z.string().max(50).nullable().optional(),
  valor:      z.number().nonnegative(),
})

const folhaSchema = z.object({
  servidor_id:     z.string().uuid(),
  competencia_mes: z.number().int().min(1).max(12),
  competencia_ano: z.number().int().min(2020).max(2100),
  salario_base:    z.number().nonnegative(),
  observacoes:     z.string().max(2000).nullable().optional(),
  eventos:         z.array(eventoSchema).default([]),
})

export const GET = withAuthModulo(['administrador','tecnico','escola'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const servidorId = searchParams.get('servidor_id')
  const ano = parseInt(searchParams.get('competencia_ano') || '0', 10)
  const mes = parseInt(searchParams.get('competencia_mes') || '0', 10)

  const params: any[] = []
  const where: string[] = []
  if (servidorId)            { params.push(servidorId); where.push(`servidor_id = $${params.length}`) }
  if (ano >= 2020)           { params.push(ano);        where.push(`competencia_ano = $${params.length}`) }
  if (mes >= 1 && mes <= 12) { params.push(mes);        where.push(`competencia_mes = $${params.length}`) }

  if (where.length === 0) {
    return NextResponse.json({ mensagem: 'Informe ao menos um filtro' }, { status: 400 })
  }

  const result = await pool.query(
    `SELECT id, servidor_id, competencia_mes, competencia_ano,
            salario_base, total_proventos, total_descontos, total_liquido,
            status, data_pagamento, fechado_em, criado_em
       FROM folha_pagamento
      WHERE ${where.join(' AND ')}
      ORDER BY competencia_ano DESC, competencia_mes DESC
      LIMIT 200`,
    params
  )

  return NextResponse.json({ folhas: result.rows })
})

export const POST = withAuthModulo(['administrador','tecnico'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = folhaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const d = parsed.data

  const totalProventos = d.eventos.filter(e => e.tipo === 'provento').reduce((s, e) => s + e.valor, 0)
  const totalDescontos = d.eventos.filter(e => e.tipo === 'desconto').reduce((s, e) => s + e.valor, 0)
  const totalLiquido = d.salario_base + totalProventos - totalDescontos

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const folhaResult = await client.query(
      `INSERT INTO folha_pagamento (
         servidor_id, competencia_mes, competencia_ano, salario_base,
         total_proventos, total_descontos, total_liquido, status, observacoes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'rascunho',$8)
       RETURNING id`,
      [d.servidor_id, d.competencia_mes, d.competencia_ano, d.salario_base,
       totalProventos, totalDescontos, totalLiquido, d.observacoes ?? null]
    )
    const folhaId = folhaResult.rows[0].id

    for (let i = 0; i < d.eventos.length; i++) {
      const e = d.eventos[i]
      await client.query(
        `INSERT INTO folha_eventos (folha_id, tipo, codigo, descricao, referencia, valor, ordem)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [folhaId, e.tipo, e.codigo, e.descricao, e.referencia ?? null, e.valor, i]
      )
    }

    await client.query('COMMIT')

    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'FOLHA_CRIAR',
      entidade: 'folha_pagamento',
      entidadeId: folhaId,
      detalhes: {
        servidor_id: d.servidor_id,
        competencia: `${d.competencia_mes}/${d.competencia_ano}`,
        total_liquido: totalLiquido,
        qtd_eventos: d.eventos.length,
      },
    })

    return NextResponse.json({ id: folhaId, total_liquido: totalLiquido }, { status: 201 })
  } catch (err: any) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return NextResponse.json({ mensagem: 'Folha ja existe para este servidor nesta competencia' }, { status: 409 })
    }
    throw err
  } finally {
    client.release()
  }
})
