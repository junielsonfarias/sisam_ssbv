import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { cacheDelPattern } from '@/lib/cache'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const filaSchema = z.object({
  aluno_nome: z.string().min(1, 'Nome do aluno é obrigatório').max(255),
  responsavel_nome: z.string().max(255).nullable().optional(),
  telefone: z.string().max(20).nullable().optional(),
  escola_id: z.string().uuid(),
  serie: z.string().min(1, 'Série é obrigatória').max(50),
  ano_letivo: z.string().min(4).max(10),
  observacao: z.string().max(2000).nullable().optional(),
})

const filaUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['aguardando', 'aprovado', 'rejeitado', 'matriculado']),
  observacao: z.string().max(2000).nullable().optional(),
})

/**
 * GET /api/admin/fila-espera?escola_id=X&serie=Y&status=Z&ano_letivo=W
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const escolaId = searchParams.get('escola_id')
  const serie = searchParams.get('serie')
  const status = searchParams.get('status')
  const anoLetivo = searchParams.get('ano_letivo')

  let where = 'WHERE 1=1'
  const params: string[] = []
  let paramIndex = 1

  // Escola só vê sua própria fila
  if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
    where += ` AND f.escola_id = $${paramIndex}`
    params.push(usuario.escola_id)
    paramIndex++
  } else if (escolaId) {
    where += ` AND f.escola_id = $${paramIndex}`
    params.push(escolaId)
    paramIndex++
  }

  if (serie) {
    where += ` AND f.serie = $${paramIndex}`
    params.push(serie)
    paramIndex++
  }

  if (status) {
    where += ` AND f.status = $${paramIndex}`
    params.push(status)
    paramIndex++
  }

  if (anoLetivo) {
    where += ` AND f.ano_letivo = $${paramIndex}`
    params.push(anoLetivo)
    paramIndex++
  }

  const result = await pool.query(`
    SELECT f.*, e.nome AS escola_nome
    FROM fila_espera f
    LEFT JOIN escolas e ON e.id = f.escola_id
    ${where}
    ORDER BY f.data_entrada ASC NULLS LAST, f.criado_em ASC
  `, params)

  // KPIs
  const kpiResult = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'aguardando') AS total_aguardando,
      COUNT(*) FILTER (WHERE status = 'aprovado') AS total_aprovados,
      COUNT(*) FILTER (WHERE status = 'rejeitado') AS total_rejeitados,
      COUNT(*) FILTER (WHERE status = 'matriculado') AS total_matriculados,
      COUNT(*) AS total
    FROM fila_espera f
    ${where}
  `, params)

  return NextResponse.json({
    registros: result.rows,
    kpis: kpiResult.rows[0] || { total_aguardando: 0, total_aprovados: 0, total_rejeitados: 0, total_matriculados: 0, total: 0 },
  })
})

/**
 * POST /api/admin/fila-espera — adicionar na fila
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const body = await request.json()
  const validacao = filaSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { aluno_nome, responsavel_nome, telefone, escola_id, serie, ano_letivo, observacao } = validacao.data

  // Escola só pode adicionar na sua própria fila
  if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
    return NextResponse.json({ mensagem: 'Sem permissão para esta escola' }, { status: 403 })
  }

  // Calcular próxima posição
  const posResult = await pool.query(
    'SELECT COALESCE(MAX(posicao), 0) + 1 AS proxima FROM fila_espera WHERE escola_id = $1 AND serie = $2 AND ano_letivo = $3 AND status = $4',
    [escola_id, serie, ano_letivo, 'aguardando']
  )
  const posicao = posResult.rows[0].proxima

  const result = await pool.query(`
    INSERT INTO fila_espera (aluno_nome, responsavel_nome, telefone, escola_id, serie, ano_letivo, observacao, posicao, status, data_entrada)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aguardando', NOW())
    RETURNING *
  `, [aluno_nome, responsavel_nome || null, telefone || null, escola_id, serie, ano_letivo, observacao || null, posicao])

  try { await cacheDelPattern('fila-espera:*') } catch {}

  return NextResponse.json({ registro: result.rows[0], mensagem: 'Adicionado à fila de espera' })
})

/**
 * PUT /api/admin/fila-espera — atualizar status
 */
export const PUT = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const body = await request.json()
  const validacao = filaUpdateSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { id, status, observacao } = validacao.data

  // Verificar se existe
  const check = await pool.query('SELECT id, escola_id FROM fila_espera WHERE id = $1', [id])
  if (check.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
  }

  // Escola só pode alterar sua própria fila
  if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== check.rows[0].escola_id) {
    return NextResponse.json({ mensagem: 'Sem permissão' }, { status: 403 })
  }

  const dateField = status === 'aprovado' ? ', data_convocacao = NOW()' : status === 'rejeitado' || status === 'matriculado' ? ', data_resolucao = NOW()' : ''

  const result = await pool.query(`
    UPDATE fila_espera SET status = $2, observacao = COALESCE($3, observacao), atualizado_em = NOW() ${dateField}
    WHERE id = $1 RETURNING *
  `, [id, status, observacao || null])

  try { await cacheDelPattern('fila-espera:*') } catch {}

  return NextResponse.json({ registro: result.rows[0], mensagem: `Status atualizado para ${status}` })
})

/**
 * DELETE /api/admin/fila-espera?id=X
 */
export const DELETE = withAuth(['administrador', 'tecnico'], async (request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ mensagem: 'id é obrigatório' }, { status: 400 })
  }

  const result = await pool.query('DELETE FROM fila_espera WHERE id = $1 RETURNING id', [id])
  if (result.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
  }

  try { await cacheDelPattern('fila-espera:*') } catch {}

  return NextResponse.json({ mensagem: 'Registro removido da fila' })
})
