/**
 * /api/admin/aee/relatorios/horas
 *
 * GET ?ano=&escola=&turma=&inicio=&fim=
 * Relatório de horas AEE: carga horária realizada × prevista (periodicidade do
 * PEI), cobertura e presença por aluno. (Fase 4.3 — ciclo pedagógico LDB.)
 */

import { NextResponse } from 'next/server'
import { withAuthModulo } from '@/lib/auth/with-auth'
import { podeAcessarEscola } from '@/lib/auth'
import { z } from 'zod'
import { gerarRelatorioHorasAee } from '@/lib/services/aee-relatorio-horas'

export const dynamic = 'force-dynamic'

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const querySchema = z.object({
  ano: z.string().regex(/^\d{4}$/),
  escola: z.string().uuid().optional(),
  turma: z.string().uuid().optional(),
  inicio: data.optional(),
  fim: data.optional(),
})

export const GET = withAuthModulo(
  ['administrador', 'tecnico', 'escola', 'polo'],
  'semed',
  async (request, usuario) => {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      ano: searchParams.get('ano') || String(new Date().getFullYear()),
      escola: searchParams.get('escola') || undefined,
      turma: searchParams.get('turma') || undefined,
      inicio: searchParams.get('inicio') || undefined,
      fim: searchParams.get('fim') || undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Parâmetros inválidos', erros: parsed.error.flatten() }, { status: 400 })
    }

    // Escopo: escola só a própria; polo valida a escola informada
    let escolaId = parsed.data.escola
    if (usuario.tipo_usuario === 'escola') {
      escolaId = usuario.escola_id || '00000000-0000-0000-0000-000000000000'
    } else if (usuario.tipo_usuario === 'polo' && escolaId && !(await podeAcessarEscola(usuario, escolaId))) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { linhas, totais } = await gerarRelatorioHorasAee({
      anoLetivo: parsed.data.ano,
      escolaId,
      turmaId: parsed.data.turma,
      inicio: parsed.data.inicio,
      fim: parsed.data.fim,
    })

    return NextResponse.json({ linhas, totais })
  }
)
