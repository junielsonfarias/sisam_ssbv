/**
 * /api/admin/analytics-preditiva
 *
 * GET ?aluno=<uuid>            — predição de um aluno
 * GET ?escola=<uuid>&ano=2026  — lista riscos da escola
 * GET ?estatisticas=true&ano   — estatísticas agregadas
 *
 * O escopo do usuário (polo/escola) é propagado aos services para evitar
 * IDOR / vazamento de PII entre unidades.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuthModulo } from '@/lib/auth/with-auth'
import {
  calcularRiscoAluno,
  estatisticasRisco,
  listarRiscosEscola,
} from '@/lib/services/analytics-preditiva.service'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  ano: z.string().optional(),
  estatisticas: z.string().optional(),
  aluno: z.string().uuid().optional(),
  escola: z.string().uuid().optional(),
  nivel: z.enum(['baixo', 'medio', 'alto']).optional(),
  limite: z.coerce.number().int().min(1).max(1000).optional(),
})

export const GET = withAuthModulo(['administrador', 'tecnico', 'polo', 'escola'], 'semed', async (request, usuario) => {
  const { searchParams } = new URL(request.url)

  const parsed = querySchema.safeParse({
    ano: searchParams.get('ano') ?? undefined,
    estatisticas: searchParams.get('estatisticas') ?? undefined,
    aluno: searchParams.get('aluno') ?? undefined,
    escola: searchParams.get('escola') ?? undefined,
    nivel: searchParams.get('nivel') ?? undefined,
    limite: searchParams.get('limite') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ mensagem: 'Parâmetros inválidos' }, { status: 400 })
  }

  const { ano: anoParam, estatisticas, aluno: alunoId, escola: escolaId, nivel, limite } = parsed.data
  const ano = anoParam || String(new Date().getFullYear())

  if (estatisticas === 'true') {
    const stats = await estatisticasRisco(ano, usuario)
    return NextResponse.json({ estatisticas: stats, ano })
  }

  if (alunoId) {
    const p = await calcularRiscoAluno(alunoId, ano, usuario)
    if (!p) return NextResponse.json({ mensagem: 'Aluno não encontrado' }, { status: 404 })
    return NextResponse.json({ predicao: p })
  }

  const riscos = await listarRiscosEscola({
    escolaId: escolaId || undefined,
    anoLetivo: ano,
    nivelMinimo: nivel,
    limite,
  }, usuario)
  return NextResponse.json({ riscos, total: riscos.length })
})
