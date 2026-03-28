import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/publicacoes
 * API pública (sem auth) para listar publicações ativas
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const orgao = searchParams.get('orgao')
    const ano = searchParams.get('ano')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const offset = (page - 1) * limit

    const redisKey = cacheKey('publicacoes', tipo || '', orgao || '', ano || '', String(page))
    const data = await withRedisCache(redisKey, 120, async () => {
      const conditions: string[] = ['ativo = true']
      const params: any[] = []
      let paramIndex = 1

      if (tipo) {
        conditions.push(`tipo = $${paramIndex++}`)
        params.push(tipo)
      }
      if (orgao) {
        conditions.push(`orgao = $${paramIndex++}`)
        params.push(orgao)
      }
      if (ano) {
        conditions.push(`ano_referencia = $${paramIndex++}`)
        params.push(ano)
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM publicacoes ${whereClause}`,
        params
      )
      const total = parseInt(countResult.rows[0].count, 10)

      const result = await pool.query(
        `SELECT id, tipo, numero, titulo, descricao, orgao, data_publicacao, ano_referencia, url_arquivo, criado_em
         FROM publicacoes ${whereClause}
         ORDER BY data_publicacao DESC, criado_em DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      )

      return {
        publicacoes: result.rows,
        total,
        pagina: page,
        totalPaginas: Math.ceil(total / limit),
      }
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[API] Erro ao buscar publicações:', error.message)
    return NextResponse.json({ erro: 'Erro ao buscar publicações' }, { status: 500 })
  }
}
