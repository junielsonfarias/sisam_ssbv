import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { z } from 'zod'
import { validateRequest } from '@/lib/schemas'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { cacheDelPattern } from '@/lib/cache'

export const dynamic = 'force-dynamic'

// Zod schemas
const publicacaoSchema = z.object({
  tipo: z.string().min(1, 'Tipo é obrigatório').max(50),
  numero: z.string().max(50).optional().nullable(),
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().max(5000).optional().nullable(),
  orgao: z.string().min(1, 'Órgão é obrigatório').max(100),
  data_publicacao: z.string().min(1, 'Data de publicação é obrigatória'),
  ano_referencia: z.string().max(10).optional().nullable(),
  url_arquivo: z.string().max(2000).optional().nullable(),
})

const publicacaoUpdateSchema = publicacaoSchema.extend({
  id: z.string().uuid('ID inválido'),
})

/**
 * GET /api/publicador/publicacoes
 * Lista publicações com filtros (tipo, orgao, ano, page, limit)
 */
export const GET = withAuth(['administrador', 'tecnico', 'publicador'], async (request) => {
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const orgao = searchParams.get('orgao')
  const ano = searchParams.get('ano')
  const page = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limite') || '20', 10)))
  const offset = (page - 1) * limit

  const conditions: string[] = []
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM publicacoes ${whereClause}`,
    params
  )
  const total = parseInt(countResult.rows[0].count, 10)

  const result = await pool.query(
    `SELECT * FROM publicacoes ${whereClause} ORDER BY data_publicacao DESC, criado_em DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  )

  return NextResponse.json({
    publicacoes: result.rows,
    total,
    pagina: page,
    totalPaginas: Math.ceil(total / limit),
  })
})

/**
 * POST /api/publicador/publicacoes
 * Cria nova publicação
 */
export const POST = withAuth(['administrador', 'tecnico', 'publicador'], async (request, usuario) => {
  const result = await validateRequest(request, publicacaoSchema)
  if (!result.success) return result.response
  const data = result.data

  const insertResult = await pool.query(
    `INSERT INTO publicacoes (tipo, numero, titulo, descricao, orgao, data_publicacao, ano_referencia, url_arquivo, publicado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.tipo,
      data.numero || null,
      data.titulo,
      data.descricao || null,
      data.orgao,
      data.data_publicacao,
      data.ano_referencia || null,
      data.url_arquivo || null,
      usuario.id,
    ]
  )

  console.log(`[AUDIT] Publicação criada por ${usuario.email}: "${data.titulo}"`)

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'criar',
    entidade: 'publicacao',
    entidadeId: insertResult.rows[0].id,
    detalhes: { titulo: data.titulo, tipo: data.tipo },
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  })

  await cacheDelPattern('publicacoes:*')

  return NextResponse.json(insertResult.rows[0], { status: 201 })
})

/**
 * PUT /api/publicador/publicacoes
 * Atualiza publicação existente
 */
export const PUT = withAuth(['administrador', 'tecnico', 'publicador'], async (request, usuario) => {
  const result = await validateRequest(request, publicacaoUpdateSchema)
  if (!result.success) return result.response
  const data = result.data

  const updateResult = await pool.query(
    `UPDATE publicacoes SET
       tipo = $2, numero = $3, titulo = $4, descricao = $5, orgao = $6,
       data_publicacao = $7, ano_referencia = $8, url_arquivo = $9, atualizado_em = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      data.id,
      data.tipo,
      data.numero || null,
      data.titulo,
      data.descricao || null,
      data.orgao,
      data.data_publicacao,
      data.ano_referencia || null,
      data.url_arquivo || null,
    ]
  )

  if (updateResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Publicação não encontrada' }, { status: 404 })
  }

  console.log(`[AUDIT] Publicação atualizada por ${usuario.email}: "${data.titulo}" (${data.id})`)

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'editar',
    entidade: 'publicacao',
    entidadeId: data.id,
    detalhes: { titulo: data.titulo, tipo: data.tipo },
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  })

  await cacheDelPattern('publicacoes:*')

  return NextResponse.json(updateResult.rows[0])
})

/**
 * DELETE /api/publicador/publicacoes?id=UUID
 * Remove publicação
 */
export const DELETE = withAuth(['administrador', 'tecnico', 'publicador'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ mensagem: 'ID é obrigatório' }, { status: 400 })
  }

  const deleteResult = await pool.query(
    `DELETE FROM publicacoes WHERE id = $1 RETURNING id, titulo`,
    [id]
  )

  if (deleteResult.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Publicação não encontrada' }, { status: 404 })
  }

  console.log(`[AUDIT] Publicação excluída por ${usuario.email}: "${deleteResult.rows[0].titulo}" (${id})`)

  registrarAuditoria({
    usuarioId: usuario.id,
    usuarioEmail: usuario.email,
    acao: 'excluir',
    entidade: 'publicacao',
    entidadeId: id,
    detalhes: { titulo: deleteResult.rows[0].titulo },
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
  })

  await cacheDelPattern('publicacoes:*')

  return new NextResponse(null, { status: 204 })
})
