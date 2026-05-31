/**
 * /api/admin/conselhos-tutelares
 *
 * F5 — Cadastro institucional dos Conselhos Tutelares do municipio.
 *
 * GET    -> lista todos (ativo=true por padrao)
 * POST   -> cria novo (admin/tecnico)
 *
 * Acesso: leitura para escola/polo (precisa encaminhar FICAI), escrita
 * apenas admin/tecnico.
 */
import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

export const dynamic = 'force-dynamic'

const ctSchema = z.object({
  nome:           z.string().min(2).max(150),
  telefone:       z.string().max(20).nullable().optional(),
  whatsapp:       z.string().max(20).nullable().optional(),
  email:          z.string().email().max(150).nullable().optional(),
  endereco:       z.string().max(2000).nullable().optional(),
  area_cobertura: z.string().max(2000).nullable().optional(),
  observacoes:    z.string().max(2000).nullable().optional(),
})

export const GET = withAuthModulo(['administrador','tecnico','escola','polo'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const incluirInativos = searchParams.get('incluir_inativos') === 'true'

  const result = await pool.query(
    `SELECT id, nome, telefone, whatsapp, email, endereco, area_cobertura, observacoes, ativo
       FROM conselhos_tutelares
       ${incluirInativos ? '' : 'WHERE ativo = true'}
      ORDER BY nome`
  )

  return NextResponse.json({ conselhos: result.rows })
})

export const POST = withAuthModulo(['administrador','tecnico'], 'semed', async (request, usuario) => {
  const body = await request.json().catch(() => null)
  const parsed = ctSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Dados invalidos', detalhes: parsed.error.format() }, { status: 400 })
  }
  const d = parsed.data

  try {
    const result = await pool.query(
      `INSERT INTO conselhos_tutelares (nome, telefone, whatsapp, email, endereco, area_cobertura, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, criado_em`,
      [d.nome, d.telefone ?? null, d.whatsapp ?? null, d.email ?? null,
       d.endereco ?? null, d.area_cobertura ?? null, d.observacoes ?? null]
    )

    registrarAuditoria({
      usuarioId: usuario.id,
      usuarioEmail: usuario.email,
      acao: 'CT_CADASTRAR',
      entidade: 'conselhos_tutelares',
      entidadeId: result.rows[0].id,
      detalhes: { nome: d.nome },
    })

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (err: any) {
    if (err.code === '23505') {
      return NextResponse.json({ mensagem: 'Conselho Tutelar com este nome ja existe' }, { status: 409 })
    }
    throw err
  }
})
