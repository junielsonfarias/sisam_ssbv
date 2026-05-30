import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { sincronizarSemestres } from '@/lib/services/periodos-letivos.service'
import { cacheDelPattern } from '@/lib/cache'

export const dynamic = 'force-dynamic'

const schema = z.object({
  ano_letivo: z.string().regex(/^\d{4}$/, 'ano_letivo deve ser AAAA'),
})

/**
 * POST /api/admin/periodos-letivos/sincronizar-semestres
 * Body: { ano_letivo: "2026" }
 *
 * Deriva ou atualiza os 2 semestres a partir dos 4 bimestres ativos do ano.
 *   1º Semestre = 1º Bim..2º Bim
 *   2º Semestre = 3º Bim..4º Bim
 *
 * Util quando uma serie usa regra de avaliacao 'semestral' e o sistema
 * precisa de um periodo_id real para vincular notas/frequencia.
 */
export const POST = withAuth(['administrador', 'tecnico'], async (request) => {
  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { mensagem: 'Dados invalidos', erros: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const resultado = await sincronizarSemestres(parsed.data.ano_letivo)

  if (resultado.acao === 'sem_bimestres' || resultado.acao === 'bimestres_incompletos') {
    return NextResponse.json(resultado, { status: 422 })
  }

  await cacheDelPattern('periodos:*')
  return NextResponse.json(resultado)
})
