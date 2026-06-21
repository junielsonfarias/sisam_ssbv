import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'
import { createLogger } from '@/lib/logger'

const log = createLogger('Eventos')

export const dynamic = 'force-dynamic'

/**
 * GET /api/eventos?mes=3&ano=2026
 * API pública — lista eventos públicos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mesParam = searchParams.get('mes')
    const anoParam = searchParams.get('ano')

    // Normaliza ano para inteiro (default: ano corrente)
    const anoNum = anoParam ? parseInt(anoParam, 10) : new Date().getFullYear()
    if (!Number.isInteger(anoNum)) {
      return NextResponse.json({ mensagem: 'Ano inválido' }, { status: 400 })
    }

    // Normaliza mes para inteiro 1-12 (opcional)
    let mesNum: number | null = null
    if (mesParam !== null && mesParam !== '') {
      const parsed = parseInt(mesParam, 10)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) {
        return NextResponse.json({ mensagem: 'Mês inválido' }, { status: 400 })
      }
      mesNum = parsed
    }

    const redisKey = cacheKey('eventos', mesNum !== null ? String(mesNum) : 'all', String(anoNum))
    const data = await withRedisCache(redisKey, CACHE_TTL.PUBLICO, async () => {
      const conditions: string[] = ['publico = true', 'ativo = true']
      const params: number[] = []
      let paramIndex = 1

      // Ano sempre presente (default aplicado acima)
      conditions.push(`EXTRACT(YEAR FROM data_inicio) = $${paramIndex++}::int`)
      params.push(anoNum)

      // Mes apenas quando informado e validado (1-12)
      if (mesNum !== null) {
        conditions.push(`EXTRACT(MONTH FROM data_inicio) = $${paramIndex++}::int`)
        params.push(mesNum)
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`

      const result = await pool.query(
        `SELECT id, titulo, descricao, tipo, data_inicio, data_fim, local
         FROM eventos ${whereClause}
         ORDER BY data_inicio ASC`,
        params
      )

      return { eventos: result.rows }
    })

    return NextResponse.json(data)
  } catch (error) {
    log.error('Erro ao buscar eventos', error)
    return NextResponse.json({ mensagem: 'Erro ao buscar eventos' }, { status: 500 })
  }
}
