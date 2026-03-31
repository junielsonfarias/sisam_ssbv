import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { PG_ERRORS } from '@/lib/constants'
import { configuracaoNotasEscolaSchema, configuracaoNotasEscolaBaseSchema, validateRequest, validateId } from '@/lib/schemas'
import { z } from 'zod'
import { DatabaseError } from '@/lib/validation'
import {
  parseSearchParams, createWhereBuilder, addCondition, addAccessControl, buildWhereString,
} from '@/lib/api-helpers'
import { cacheDelPattern } from '@/lib/cache'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminConfiguracaoNotas')

export const dynamic = 'force-dynamic'

const atualizarConfigSchema = configuracaoNotasEscolaBaseSchema.extend({
  id: z.string().uuid('ID inválido'),
}).refine(data => {
  const soma = Math.round((data.peso_avaliacao + data.peso_recuperacao) * 100) / 100
  return soma === 1
}, { message: 'A soma dos pesos deve ser igual a 1.0', path: ['peso_avaliacao'] })
.refine(data => {
  return data.media_recuperacao <= data.media_aprovacao
}, { message: 'Média de recuperação deve ser menor ou igual à média de aprovação', path: ['media_recuperacao'] })

export const GET = withAuth(['administrador', 'tecnico', 'polo', 'escola'], async (request, usuario) => {
    const searchParams = request.nextUrl.searchParams
    const { escola_id, ano_letivo } = parseSearchParams(searchParams, ['escola_id', 'ano_letivo'])

    const where = createWhereBuilder()
    addAccessControl(where, usuario, { escolaIdField: 'c.escola_id', poloIdField: 'e.polo_id' })
    addCondition(where, 'c.escola_id', escola_id)
    addCondition(where, 'c.ano_letivo', ano_letivo)
    addCondition(where, 'c.ativo', true)

    const whereClause = buildWhereString(where)

    const result = await pool.query(
      `SELECT c.*, e.nome as escola_nome
       FROM configuracao_notas_escola c
       INNER JOIN escolas e ON c.escola_id = e.id
       ${whereClause}
       ORDER BY e.nome, c.ano_letivo DESC`,
      where.params
    )

    return NextResponse.json(result.rows)
})

export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
    const validacao = await validateRequest(request, configuracaoNotasEscolaSchema)
    if (!validacao.success) return validacao.response

    const {
      escola_id, ano_letivo, tipo_periodo, nota_maxima,
      media_aprovacao, media_recuperacao, peso_avaliacao,
      peso_recuperacao, permite_recuperacao
    } = validacao.data

    // Usuário escola só pode configurar sua própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO configuracao_notas_escola
       (escola_id, ano_letivo, tipo_periodo, nota_maxima, media_aprovacao, media_recuperacao, peso_avaliacao, peso_recuperacao, permite_recuperacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [escola_id, ano_letivo, tipo_periodo, nota_maxima, media_aprovacao, media_recuperacao, peso_avaliacao, peso_recuperacao, permite_recuperacao]
    )

    log.info(`Config notas criada | escola:${escola_id} ano:${ano_letivo} | por ${usuario.email}`)
    try { await cacheDelPattern('config:*') } catch {}
    try { await cacheDelPattern('boletim:*') } catch {}
    return NextResponse.json(result.rows[0], { status: 201 })
})

export const PUT = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
    const validacao = await validateRequest(request, atualizarConfigSchema)
    if (!validacao.success) return validacao.response

    const {
      id, escola_id, ano_letivo, tipo_periodo, nota_maxima,
      media_aprovacao, media_recuperacao, peso_avaliacao,
      peso_recuperacao, permite_recuperacao
    } = validacao.data

    // Usuário escola só pode configurar sua própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await pool.query(
      `UPDATE configuracao_notas_escola
       SET escola_id = $1, ano_letivo = $2, tipo_periodo = $3, nota_maxima = $4,
           media_aprovacao = $5, media_recuperacao = $6, peso_avaliacao = $7,
           peso_recuperacao = $8, permite_recuperacao = $9
       WHERE id = $10
       RETURNING *`,
      [escola_id, ano_letivo, tipo_periodo, nota_maxima, media_aprovacao, media_recuperacao, peso_avaliacao, peso_recuperacao, permite_recuperacao, id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Configuração não encontrada' }, { status: 404 })
    }

    try { await cacheDelPattern('config:*') } catch {}
    try { await cacheDelPattern('boletim:*') } catch {}

    return NextResponse.json(result.rows[0])
})

export const DELETE = withAuth(['administrador'], async (request, usuario) => {
    const { searchParams } = new URL(request.url)
    const validacaoId = validateId(searchParams.get('id'))
    if (!validacaoId.success) return validacaoId.response
    const id = validacaoId.data

    const result = await pool.query(
      'UPDATE configuracao_notas_escola SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Configuração não encontrada' }, { status: 404 })
    }

    try { await cacheDelPattern('config:*') } catch {}
    try { await cacheDelPattern('boletim:*') } catch {}

    return new NextResponse(null, { status: 204 })
})
