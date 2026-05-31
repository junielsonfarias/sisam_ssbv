/**
 * /api/admin/bolsa-familia
 *
 * GET ?recurso=mapas|alertas|csv  — consulta dados
 * POST ?acao=gerar|justificar     — gera/atualiza mapas
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
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

export const GET = withAuthModulo(['administrador', 'tecnico', 'escola', 'polo'], 'semed', async (request) => {
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

export const POST = withAuthModulo(['administrador', 'tecnico'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const acao = searchParams.get('acao')
  const body = await request.json().catch(() => null)

  switch (acao) {
    case 'gerar': {
      const parsed = gerarSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const r = await gerarMapaPeriodo({ ...parsed.data, registrado_por: usuario.id })

      // MEC — geração em lote tem impacto regulatório (Sistema Presença)
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'BOLSA_FAMILIA_GERAR_MAPAS',
        entidade: 'bolsa_familia_mapas',
        detalhes: {
          ano_letivo: parsed.data.ano_letivo,
          periodo: parsed.data.periodo,
          gerados: r.gerados,
          com_alerta: r.com_alerta,
        },
      })

      return NextResponse.json({ ...r, mensagem: `${r.gerados} mapas gerados (${r.com_alerta} com alerta de baixa frequência).` })
    }
    case 'justificar': {
      const parsed = justificarSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ mensagem: 'Dados inválidos', erros: parsed.error.flatten() }, { status: 400 })
      const ok = await registrarJustificativa(parsed.data)
      if (!ok) return NextResponse.json({ mensagem: 'Mapa não encontrado' }, { status: 404 })

      // LGPD art. 11 — justificativa pode conter dados sensíveis (saúde, social, familiar)
      // Detalhes do motivo NÃO são gravados nos logs — só metadados administrativos
      await registrarAuditoria({
        usuarioId: usuario.id,
        acao: 'BOLSA_FAMILIA_JUSTIFICAR',
        entidade: 'bolsa_familia_mapas',
        entidadeId: parsed.data.mapa_id,
        detalhes: {
          tamanho_motivo: parsed.data.motivo.length,
        },
      })

      return NextResponse.json({ mensagem: 'Justificativa registrada' })
    }
    default:
      return NextResponse.json({ mensagem: 'ação inválida' }, { status: 400 })
  }
})
