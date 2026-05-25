/**
 * /api/admin/carga-horaria
 *
 * GET: relatório de carga horária e dias letivos por escola/ano.
 * Validações automáticas LDB Art. 24 (200 dias, 800h).
 *
 * Query params:
 *  - ano: UUID do ano letivo (obrigatório)
 *  - escola: UUID da escola (opcional — sem ele lista todas)
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import {
  gerarRelatorioEscola,
  listarAlertasMunicipio,
} from '@/lib/services/carga-horaria.service'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request) => {
  const { searchParams } = new URL(request.url)
  const anoId = searchParams.get('ano')
  const escolaId = searchParams.get('escola')

  if (!anoId) {
    return NextResponse.json({ mensagem: 'Informe ?ano=<uuid>' }, { status: 400 })
  }

  if (escolaId) {
    try {
      const relatorio = await gerarRelatorioEscola({ anoLetivoId: anoId, escolaId })
      return NextResponse.json({ relatorio })
    } catch (e) {
      return NextResponse.json({ mensagem: (e as Error).message }, { status: 404 })
    }
  }

  const todos = await listarAlertasMunicipio(anoId)
  return NextResponse.json({
    relatorios: todos,
    resumo: {
      total_escolas: todos.length,
      cumprem_200_dias: todos.filter((r) => r.cumpre_200_dias).length,
      cumprem_800_horas: todos.filter((r) => r.cumpre_800_horas).length,
      com_alertas: todos.filter((r) => r.alertas.length > 0).length,
    },
  })
})
