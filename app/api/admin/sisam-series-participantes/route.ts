import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { withRedisCache, cacheKey, cacheDelPattern } from '@/lib/cache'
import { CACHE_TTL } from '@/lib/constants'
import { z } from 'zod'
import { anoLetivoSchema, serieSchema } from '@/lib/schemas'

const seriesParticipantesSchema = z.object({
  ano_letivo: anoLetivoSchema,
  series: z.array(serieSchema).min(1, 'Selecione pelo menos uma série'),
})

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico'], async (request) => {
  const anoLetivo = request.nextUrl.searchParams.get('ano_letivo')
  const contagem = request.nextUrl.searchParams.get('contagem') === 'true'

  if (contagem && anoLetivo) {
    const result = await pool.query(
      `SELECT a.serie, COUNT(*) as quantidade
       FROM alunos a
       WHERE a.ano_letivo = $1 AND a.situacao = 'cursando' AND a.serie IN ('1','2','3','4','5','6','7','8','9')
       GROUP BY a.serie ORDER BY a.serie`,
      [anoLetivo]
    )
    const contagemMap: Record<string, number> = {}
    for (const row of result.rows) {
      contagemMap[row.serie] = parseInt(row.quantidade)
    }
    return NextResponse.json({ contagem: contagemMap })
  }

  const redisKey = cacheKey('series-part', anoLetivo || 'all')
  const data = await withRedisCache(redisKey, CACHE_TTL.CONFIGURACAO, async () => {
    let query = `
      SELECT sp.id, sp.ano_letivo, sp.serie, sp.ativo,
             se.nome as serie_nome, se.etapa
      FROM sisam_series_participantes sp
      LEFT JOIN series_escolares se ON se.codigo = sp.serie
    `
    const params: string[] = []

    if (anoLetivo) {
      query += ' WHERE sp.ano_letivo = $1'
      params.push(anoLetivo)
    }

    query += ' ORDER BY sp.ano_letivo DESC, se.ordem, sp.serie'

    const result = await pool.query(query, params)
    return result.rows
  })

  return NextResponse.json(data)
})

export const POST = withAuth(['administrador'], async (request) => {
  const body = await request.json()
  const parsed = seriesParticipantesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({
      mensagem: 'Dados invalidos',
      erros: parsed.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
    }, { status: 400 })
  }
  const { ano_letivo, series } = parsed.data

  await pool.query(
    'UPDATE sisam_series_participantes SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE ano_letivo = $1',
    [ano_letivo]
  )

  for (const serie of series) {
    await pool.query(
      `INSERT INTO sisam_series_participantes (ano_letivo, serie, ativo)
       VALUES ($1, $2, true)
       ON CONFLICT (ano_letivo, serie) DO UPDATE SET ativo = true, atualizado_em = CURRENT_TIMESTAMP`,
      [ano_letivo, serie]
    )
  }

  await cacheDelPattern('series-part:*')
  return NextResponse.json({ mensagem: 'Séries atualizadas com sucesso', total: series.length })
})
