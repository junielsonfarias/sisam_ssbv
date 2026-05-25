/**
 * /api/admin/bolsa-familia
 *
 * GET ?recurso=mapas|alertas|csv  — consulta dados
 * POST ?acao=gerar|justificar     — gera/atualiza mapas
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import {
  exportarCsvSistemaPresenca,
  gerarMapaPeriodo,
  listarMapas,
  registrarJustificativa,
  PERIODO_LABEL,
} from '@/lib/services/bolsa-familia.service'

export const dynamic = 'force-dynamic'

const PERIODOS = ['fev_abr', 'mai_jun', 'ago_set', 'out_nov', 'dez'] as const

const gerarSchema = z.object({
  ano_letivo: z.string().regex(/^\d{4}$/),
  periodo: z.enum(PERIODOS),
})

const justificarSchema = z.object({
  mapa_id: z.string().uuid(),
  motivo: z.string().min(10).max(2000),
})

export const GET = withAuth(['administrador', 'tecnico', 'escola', 'polo'], async (request) => {
  const { searchParams } = new URL(request.url)
  const recurso = searchParams.get('recurso') || 'mapas'

  const ano_letivo = searchParams.get('ano') || String(new Date().getFullYear())
  const periodo = (searchParams.get('periodo') as any) || undefined
  const escola_id = searchParams.get('escola') || undefined

  switch (recurso) {
    case 'mapas': {
      const mapas = await listarMapas({ ano_letivo, periodo, escola_id })
      return NextResponse.json({ mapas, total: mapas.length })
    }
    case 'alertas': {
      const mapas = await listarMapas({ ano_letivo, periodo, apenas_alertas: true, escola_id })
      return NextResponse.json({ alertas: mapas, total: mapas.length })
    }
    case 'csv': {
      if (!periodo) {
        return NextResponse.json({ mensagem: 'Informe ?periodo=' }, { status: 400 })
      }
      const csv = await exportarCsvSistemaPresenca({ ano_letivo, periodo, escola_id })
      const filename = `bolsa-familia-${ano_letivo}-${periodo}.csv`
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }
    case 'periodos': {
      return NextResponse.json({
        periodos: Object.entries(PERIODO_LABEL).map(([id, label]) => ({ id, label })),
      })
    }
    default:
      return NextResponse.json({ mensagem: 'recurso inválido' }, { status: 400 })
  }
})

export const POST = withAuth(['administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'gerar': {
      const parsed = gerarSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      const r = await gerarMapaPeriodo({ ...parsed.data, registrado_por: usuario.id })
      return NextResponse.json({ ...r, mensagem: `${r.gerados} mapas gerados (${r.com_alerta} com alerta de baixa frequência).` })
    }
    case 'justificar': {
      const parsed = justificarSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
      const ok = await registrarJustificativa(parsed.data)
      if (!ok) return NextResponse.json({ mensagem: 'Mapa não encontrado' }, { status: 404 })
      return NextResponse.json({ mensagem: 'Justificativa registrada' })
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
