import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { validateRequest, uuidSchema } from '@/lib/schemas'
import { cacheDelPattern } from '@/lib/cache'

const disciplinaSerieItemSchema = z.object({
  disciplina_id: uuidSchema,
  obrigatoria: z.boolean().optional(),
  carga_horaria_semanal: z.number().int().min(0).optional(),
})

const serieEscolarDisciplinasPostSchema = z.object({
  disciplinas: z.array(disciplinaSerieItemSchema).min(1, 'Informe pelo menos uma disciplina'),
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'polo', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const serieId = params.id

    const result = await pool.query(
      `SELECT sd.id, sd.serie_id, sd.disciplina_id, sd.obrigatoria, sd.carga_horaria_semanal, sd.ativo,
              de.nome as disciplina_nome, de.codigo as disciplina_codigo, de.abreviacao as disciplina_abreviacao
       FROM series_disciplinas sd
       JOIN disciplinas_escolares de ON de.id = sd.disciplina_id
       WHERE sd.serie_id = $1
       ORDER BY de.nome ASC`,
      [serieId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar disciplinas da série:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const serieId = params.id
    const validationResult = await validateRequest(request, serieEscolarDisciplinasPostSchema)
    if (!validationResult.success) return validationResult.response
    const { disciplinas } = validationResult.data

    // Verificar se a série existe
    const serieCheck = await pool.query('SELECT id FROM series_escolares WHERE id = $1', [serieId])
    if (serieCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Série não encontrada' }, { status: 404 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Desativar todas as disciplinas existentes para esta série
      await client.query(
        'UPDATE series_disciplinas SET ativo = false WHERE serie_id = $1',
        [serieId]
      )

      // Upsert cada disciplina
      for (const disc of disciplinas) {
        const { disciplina_id, obrigatoria = true, carga_horaria_semanal = 4 } = disc

        await client.query(
          `INSERT INTO series_disciplinas (serie_id, disciplina_id, obrigatoria, carga_horaria_semanal, ativo)
           VALUES ($1, $2, $3, $4, true)
           ON CONFLICT (serie_id, disciplina_id) DO UPDATE SET
             obrigatoria = $3,
             carga_horaria_semanal = $4,
             ativo = true`,
          [serieId, disciplina_id, obrigatoria, carga_horaria_semanal]
        )
      }

      await client.query('COMMIT')

      try { await cacheDelPattern('series-escolares:*') } catch {}
      try { await cacheDelPattern('disciplinas:*') } catch {}

      // Retornar as disciplinas atualizadas
      const result = await pool.query(
        `SELECT sd.*, de.nome as disciplina_nome, de.codigo as disciplina_codigo
         FROM series_disciplinas sd
         JOIN disciplinas_escolares de ON de.id = sd.disciplina_id
         WHERE sd.serie_id = $1 AND sd.ativo = true
         ORDER BY de.nome ASC`,
        [serieId]
      )

      return NextResponse.json(result.rows)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Erro ao salvar disciplinas da série:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
