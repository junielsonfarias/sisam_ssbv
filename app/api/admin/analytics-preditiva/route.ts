/**
 * /api/admin/analytics-preditiva
 *
 * GET ?aluno=<uuid>            — predição de um aluno
 * GET ?escola=<uuid>&ano=2026  — lista riscos da escola
 * GET ?estatisticas=true&ano   — estatísticas agregadas
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import {
  calcularRiscoAluno,
  estatisticasRisco,
  listarRiscosEscola,
} from '@/lib/services/analytics-preditiva.service'

export const dynamic = 'force-dynamic'

export const GET = withAuthModulo(['administrador', 'tecnico', 'polo', 'escola'], 'semed', async (request) => {
  const { searchParams } = new URL(request.url)
  const ano = searchParams.get('ano') || String(new Date().getFullYear())

  if (searchParams.get('estatisticas') === 'true') {
    const stats = await estatisticasRisco(ano)
    return NextResponse.json({ estatisticas: stats, ano })
  }

  const alunoId = searchParams.get('aluno')
  if (alunoId) {
    const p = await calcularRiscoAluno(alunoId, ano)
    if (!p) return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    return NextResponse.json({ predicao: p })
  }

  const escolaId = searchParams.get('escola')
  const nivel = searchParams.get('nivel') as any || undefined
  const riscos = await listarRiscosEscola({
    escolaId: escolaId || undefined,
    anoLetivo: ano,
    nivelMinimo: nivel,
    limite: searchParams.get('limite') ? parseInt(searchParams.get('limite')!, 10) : undefined,
  })
  return NextResponse.json({ riscos, total: riscos.length })
})
