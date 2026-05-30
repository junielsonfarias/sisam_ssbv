import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { buscarAnoLetivoAtivo } from '@/lib/services/turmas.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/professor/periodos?ano_letivo=2026
 * Lista periodos letivos ativos do ano informado. Default = ano marcado
 * como ativo em anos_letivos (fallback: ano corrente). Isso garante que
 * em virada de ano o professor continua vendo os bimestres corretos
 * enquanto o gestor nao ativa o novo ano.
 */
export const GET = withAuth('professor', async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const anoParam = searchParams.get('ano_letivo')?.trim()
    const anoLetivo = anoParam && /^\d{4}$/.test(anoParam)
      ? anoParam
      : await buscarAnoLetivoAtivo()

    const result = await pool.query(
      `SELECT id, nome, tipo, numero, ano_letivo, data_inicio, data_fim
       FROM periodos_letivos
       WHERE ano_letivo = $1 AND ativo = true
       ORDER BY numero`,
      [anoLetivo]
    )

    return NextResponse.json({ periodos: result.rows, ano_letivo: anoLetivo })
  } catch (error: unknown) {
    console.error('Erro ao listar períodos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
