/**
 * /api/admin/status-page
 *
 * GET: lista incidentes (todos status) + verificacao geral
 * POST ?acao=criar|atualizar
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import {
  atualizarIncidente,
  criarIncidente,
  obterStatusGeral,
} from '@/lib/services/status-page.service'

export const dynamic = 'force-dynamic'

const TIPOS = ['incidente', 'manutencao_planejada', 'degradacao', 'comunicado'] as const
const SEVERIDADES = ['baixa', 'media', 'alta', 'critica'] as const
const STATUS = ['investigando', 'identificado', 'monitorando', 'resolvido'] as const

const criarSchema = z.object({
  tipo: z.enum(TIPOS),
  severidade: z.enum(SEVERIDADES),
  titulo: z.string().min(2).max(255),
  descricao: z.string().min(5).max(5000),
  servicos_afetados: z.array(z.string().max(50)).max(20).optional(),
  primeira_atualizacao: z.string().max(5000).optional(),
})

const atualizarSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUS),
  mensagem: z.string().min(5).max(5000),
})

export const GET = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('saude') === 'true') {
    const saude = await obterStatusGeral()
    return NextResponse.json(saude)
  }

  const apenas_ativos = searchParams.get('apenas_ativos') === 'true'
  const where = apenas_ativos ? `WHERE i.status != 'resolvido'` : ''

  const r = await pool.query(
    `SELECT i.*,
            u.nome AS criado_por_nome,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', a.id,
                'status', a.status,
                'mensagem', a.mensagem,
                'criado_em', a.criado_em,
                'autor_nome', au.nome
              ) ORDER BY a.criado_em DESC)
                FROM status_atualizacoes a
                LEFT JOIN usuarios au ON au.id = a.criado_por
               WHERE a.incidente_id = i.id),
              '[]'::json
            ) AS atualizacoes
       FROM status_incidentes i
       LEFT JOIN usuarios u ON u.id = i.criado_por
       ${where}
      ORDER BY i.inicio_em DESC
      LIMIT 200`
  )
  return NextResponse.json({ incidentes: r.rows })
})

export const POST = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  if (acao === 'criar') {
    const parsed = criarSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })

    const id = await criarIncidente({
      tipo: parsed.data.tipo,
      severidade: parsed.data.severidade,
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      servicos_afetados: parsed.data.servicos_afetados,
      criado_por: usuario.id,
    })

    if (parsed.data.primeira_atualizacao) {
      await atualizarIncidente({
        id,
        status: 'investigando',
        mensagem: parsed.data.primeira_atualizacao,
        criado_por: usuario.id,
      })
    }

    return NextResponse.json({ id, mensagem: 'Incidente criado' }, { status: 201 })
  }

  if (acao === 'atualizar') {
    const parsed = atualizarSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
    await atualizarIncidente({
      id: parsed.data.id,
      status: parsed.data.status,
      mensagem: parsed.data.mensagem,
      criado_por: usuario.id,
    })
    return NextResponse.json({ mensagem: 'Atualização registrada' })
  }

  return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
})
