import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/transparencia?ano_letivo=2026
 * API pública — dados agregados por escola para transparência
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anoLetivo = searchParams.get('ano_letivo') || String(new Date().getFullYear())

    const redisKey = cacheKey('transparencia', anoLetivo)
    const data = await withRedisCache(redisKey, 300, async () => {
      const result = await pool.query(
        `SELECT e.id, e.nome, e.codigo, e.endereco, e.codigo_inep,
                e.localizacao, e.situacao_funcionamento,
                e.agua_potavel, e.energia_eletrica, e.internet, e.biblioteca,
                e.quadra_esportiva, e.acessibilidade_deficiente, e.alimentacao_escolar,
                p.nome as polo_nome,
                (SELECT COUNT(*) FROM alunos a WHERE a.escola_id = e.id AND a.ano_letivo = $1 AND a.situacao = 'cursando') as total_alunos,
                (SELECT COUNT(*) FROM turmas t WHERE t.escola_id = e.id AND t.ano_letivo = $1) as total_turmas
         FROM escolas e
         LEFT JOIN polos p ON e.polo_id = p.id
         WHERE e.ativo = true
         ORDER BY e.nome`,
        [anoLetivo]
      )
      return { escolas: result.rows, ano_letivo: anoLetivo }
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar transparência:', error)
    return NextResponse.json({ error: 'Erro ao buscar dados de transparência' }, { status: 500 })
  }
}
