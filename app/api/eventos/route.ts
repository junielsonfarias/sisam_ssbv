import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * GET /api/eventos?mes=3&ano=2026
 * API pública — lista eventos públicos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano') || String(new Date().getFullYear())

    const redisKey = cacheKey('eventos', mes || 'all', ano)
    const data = await withRedisCache(redisKey, CACHE_TTL.PUBLICO, async () => {
      const conditions: string[] = ['publico = true', 'ativo = true']
      const params: string[] = []
      let paramIndex = 1

      if (mes && ano) {
        conditions.push(`EXTRACT(MONTH FROM data_inicio) = $${paramIndex++}`)
        params.push(mes)
        conditions.push(`EXTRACT(YEAR FROM data_inicio) = $${paramIndex++}`)
        params.push(ano)
      } else if (ano) {
        conditions.push(`EXTRACT(YEAR FROM data_inicio) = $${paramIndex++}`)
        params.push(ano)
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`

      const result = await pool.query(
        `SELECT id, titulo, descricao, tipo, data_inicio, data_fim, local
         FROM eventos ${whereClause}
         ORDER BY data_inicio`,
        params
      )

      return { eventos: result.rows }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar eventos:', error)
    return NextResponse.json({ mensagem: 'Erro ao buscar eventos' }, { status: 500 })
  }
}
