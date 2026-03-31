import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { cacheDelPattern } from '@/lib/cache'
import { z } from 'zod'
import { uuidSchema, anoLetivoSchema } from '@/lib/schemas'

const metaEscolaSchema = z.object({
  escola_id: uuidSchema,
  ano_letivo: anoLetivoSchema,
  indicador: z.enum(['frequencia', 'media_sisam', 'aprovacao', 'evasao'], {
    errorMap: () => ({ message: 'Indicador inválido. Use: frequencia, media_sisam, aprovacao, evasao' })
  }),
  meta_valor: z.number({ coerce: true, message: 'meta_valor deve ser um número' })
    .min(0, 'meta_valor não pode ser negativo')
    .max(100, 'meta_valor não pode ser maior que 100'),
})

export const dynamic = 'force-dynamic'

export const GET = withAuth(['administrador', 'tecnico'], async (request: NextRequest, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const escola_id = searchParams.get('escola_id')
    const ano_letivo = searchParams.get('ano_letivo') || new Date().getFullYear().toString()

    // Buscar metas
    let metasQuery = `SELECT me.*, e.nome as escola_nome
      FROM metas_escola me
      JOIN escolas e ON me.escola_id = e.id
      WHERE me.ano_letivo = $1`
    const params: string[] = [ano_letivo]

    if (escola_id) {
      metasQuery += ` AND me.escola_id = $2`
      params.push(escola_id)
    }
    metasQuery += ` ORDER BY e.nome, me.indicador`

    const metas = await pool.query(metasQuery, params)

    // Calcular valores atuais por escola
    const escolaFilter = escola_id ? `AND a.escola_id = '${escola_id}'` : ''

    // Frequência média
    const freqResult = await pool.query(
      `SELECT a.escola_id,
        ROUND(AVG(fb.percentual_frequencia)::numeric, 2) as valor_atual
      FROM frequencia_bimestral fb
      JOIN alunos a ON a.id = fb.aluno_id
      WHERE a.ano_letivo = $1 AND a.ativo = true ${escola_id ? 'AND a.escola_id = $2' : ''}
      GROUP BY a.escola_id`,
      escola_id ? [ano_letivo, escola_id] : [ano_letivo]
    )

    // Média SISAM
    const sisamResult = await pool.query(
      `SELECT rc.escola_id,
        ROUND(AVG(rc.media_aluno::decimal), 2) as valor_atual
      FROM resultados_consolidados rc
      WHERE rc.ano_letivo = $1 AND rc.presenca IN ('P','p') ${escola_id ? 'AND rc.escola_id = $2' : ''}
      GROUP BY rc.escola_id`,
      escola_id ? [ano_letivo, escola_id] : [ano_letivo]
    )

    // Aprovação (%)
    const aprovResult = await pool.query(
      `SELECT a.escola_id,
        ROUND(
          (COUNT(*) FILTER (WHERE a.situacao = 'aprovado')::decimal /
          NULLIF(COUNT(*), 0)) * 100, 2
        ) as valor_atual
      FROM alunos a
      WHERE a.ano_letivo = $1 AND a.ativo = true ${escola_id ? 'AND a.escola_id = $2' : ''}
      GROUP BY a.escola_id`,
      escola_id ? [ano_letivo, escola_id] : [ano_letivo]
    )

    // Evasão (%)
    const evasaoResult = await pool.query(
      `SELECT a.escola_id,
        ROUND(
          (COUNT(*) FILTER (WHERE a.situacao IN ('transferido', 'desistente', 'evadido'))::decimal /
          NULLIF(COUNT(*), 0)) * 100, 2
        ) as valor_atual
      FROM alunos a
      WHERE a.ano_letivo = $1 AND a.ativo = true ${escola_id ? 'AND a.escola_id = $2' : ''}
      GROUP BY a.escola_id`,
      escola_id ? [ano_letivo, escola_id] : [ano_letivo]
    )

    // Mapear valores atuais por escola
    const atuaisMap: Record<string, Record<string, number>> = {}
    const addToMap = (rows: any[], indicador: string) => {
      for (const r of rows) {
        if (!atuaisMap[r.escola_id]) atuaisMap[r.escola_id] = {}
        atuaisMap[r.escola_id][indicador] = parseFloat(r.valor_atual || '0')
      }
    }
    addToMap(freqResult.rows, 'frequencia')
    addToMap(sisamResult.rows, 'media_sisam')
    addToMap(aprovResult.rows, 'aprovacao')
    addToMap(evasaoResult.rows, 'evasao')

    // Lista de escolas para referência
    const escolasResult = await pool.query(
      `SELECT id, nome FROM escolas WHERE ativo = true ORDER BY nome`
    )

    return NextResponse.json({
      metas: metas.rows,
      valores_atuais: atuaisMap,
      escolas: escolasResult.rows,
      ano_letivo,
    })
  } catch (error) {
    console.error('[metas-escola GET] Erro:', (error as Error).message)
    return NextResponse.json({ mensagem: 'Erro ao buscar metas' }, { status: 500 })
  }
})

export const POST = withAuth(['administrador', 'tecnico'], async (request: NextRequest, usuario) => {
  try {
    const body = await request.json()
    const parsed = metaEscolaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        mensagem: 'Dados invalidos',
        erros: parsed.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message }))
      }, { status: 400 })
    }
    const { escola_id, ano_letivo, indicador, meta_valor } = parsed.data

    // Upsert
    const result = await pool.query(
      `INSERT INTO metas_escola (escola_id, ano_letivo, indicador, meta_valor)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (escola_id, ano_letivo, indicador)
      DO UPDATE SET meta_valor = $4, atualizado_em = NOW()
      RETURNING *`,
      [escola_id, ano_letivo, indicador, meta_valor]
    )

    try { await cacheDelPattern('metas:*') } catch {}
    try { await cacheDelPattern('dashboard:*') } catch {}

    return NextResponse.json({ mensagem: 'Meta salva com sucesso', meta: result.rows[0] })
  } catch (error) {
    console.error('[metas-escola POST] Erro:', (error as Error).message)
    return NextResponse.json({ mensagem: 'Erro ao salvar meta' }, { status: 500 })
  }
})
