import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { withRedisCache, cacheKey } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico', 'polo'], async (request: NextRequest, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const polo_id = searchParams.get('polo_id')
    const serie = searchParams.get('serie')

    // Filtro por polo (se usuário é polo, forçar o polo dele)
    const poloFilter = usuario.tipo_usuario === 'polo' ? usuario.polo_id : polo_id

    const redisKey = cacheKey('evolucao', poloFilter || 'all', serie || 'all')
    const data = await withRedisCache(redisKey, 120, async () => {
    // Construir filtros
    const conditions: string[] = ["rc.presenca IN ('P','p')"]
    const params: (string | null)[] = []
    let paramIdx = 1
    if (poloFilter) {
      conditions.push(`e.polo_id = $${paramIdx}`)
      params.push(poloFilter)
      paramIdx++
    }

    // Filtro por série
    if (serie) {
      conditions.push(`REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') = $${paramIdx}`)
      params.push(serie.replace(/[^0-9]/g, ''))
      paramIdx++
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const result = await pool.query(
      `SELECT e.id, e.nome as escola, rc.ano_letivo,
        ROUND(AVG(CASE
          WHEN REGEXP_REPLACE(rc.serie::text, '[^0-9]', '', 'g') IN ('1','2','3','4','5')
          THEN (COALESCE(rc.nota_lp::decimal,0) + COALESCE(rc.nota_mat::decimal,0) + COALESCE(rc.nota_producao::decimal,0))/3.0
          ELSE (COALESCE(rc.nota_lp::decimal,0) + COALESCE(rc.nota_ch::decimal,0) + COALESCE(rc.nota_mat::decimal,0) + COALESCE(rc.nota_cn::decimal,0))/4.0
        END), 2) as media,
        COUNT(DISTINCT rc.aluno_id) as total_alunos
      FROM resultados_consolidados rc
      JOIN escolas e ON rc.escola_id = e.id
      ${whereClause}
      GROUP BY e.id, e.nome, rc.ano_letivo
      ORDER BY e.nome, rc.ano_letivo`,
      params
    )

    // Processar dados para pivotar por ano
    const escolasMap: Record<string, {
      id: string
      escola: string
      medias: Record<string, number>
      alunos: Record<string, number>
    }> = {}

    const todosAnos = new Set<string>()

    for (const row of result.rows) {
      todosAnos.add(row.ano_letivo)
      if (!escolasMap[row.id]) {
        escolasMap[row.id] = { id: row.id, escola: row.escola, medias: {}, alunos: {} }
      }
      escolasMap[row.id].medias[row.ano_letivo] = parseFloat(row.media)
      escolasMap[row.id].alunos[row.ano_letivo] = parseInt(row.total_alunos)
    }

    const anosOrdenados = [...todosAnos].sort()
    const escolas = Object.values(escolasMap)

    // Calcular variação entre primeiro e último ano
    const escolasComVariacao = escolas.map(e => {
      const mediaAnterior = anosOrdenados.length >= 2 ? e.medias[anosOrdenados[anosOrdenados.length - 2]] : null
      const mediaAtual = anosOrdenados.length >= 1 ? e.medias[anosOrdenados[anosOrdenados.length - 1]] : null
      const variacao = mediaAnterior != null && mediaAtual != null ? parseFloat((mediaAtual - mediaAnterior).toFixed(2)) : null
      const totalAlunos = Object.values(e.alunos).reduce((s, v) => s + v, 0)
      return { ...e, variacao, mediaAnterior, mediaAtual, totalAlunos }
    }).sort((a, b) => {
      if (a.variacao === null && b.variacao === null) return 0
      if (a.variacao === null) return 1
      if (b.variacao === null) return -1
      return b.variacao - a.variacao
    })

    // Top 5 que melhoraram / pioraram
    const comVariacao = escolasComVariacao.filter(e => e.variacao !== null)
    const top5Melhoraram = comVariacao.filter(e => e.variacao! > 0).slice(0, 5)
    const top5Pioraram = comVariacao.filter(e => e.variacao! < 0).slice(-5).reverse()

    // KPIs
    const totalEscolas = escolas.length
    const todasMedias = escolas.flatMap(e => Object.values(e.medias))
    const mediaGeral = todasMedias.length > 0 ? parseFloat((todasMedias.reduce((s, v) => s + v, 0) / todasMedias.length).toFixed(2)) : 0
    const melhoraram = comVariacao.filter(e => e.variacao! > 0).length
    const pioraram = comVariacao.filter(e => e.variacao! < 0).length

    return {
      anos: anosOrdenados,
      escolas: escolasComVariacao,
      top5Melhoraram,
      top5Pioraram,
      kpis: { totalEscolas, mediaGeral, melhoraram, pioraram },
    }
    }) // end withRedisCache

    return NextResponse.json(data)
  } catch (error) {
    console.error('[evolucao-escolas] Erro:', (error as Error).message)
    return NextResponse.json({ mensagem: 'Erro ao buscar evolução das escolas' }, { status: 500 })
  }
})
