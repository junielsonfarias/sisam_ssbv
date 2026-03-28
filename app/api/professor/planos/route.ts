import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const planoSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid().nullable().optional(),
  periodo: z.enum(['semanal', 'mensal', 'bimestral']).default('semanal'),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  objetivo: z.string().min(1, 'Objetivo é obrigatório').max(5000),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório').max(5000),
  metodologia: z.string().max(5000).nullable().optional(),
  recursos: z.string().max(5000).nullable().optional(),
  avaliacao: z.string().max(5000).nullable().optional(),
  observacoes: z.string().max(5000).nullable().optional(),
  status: z.enum(['rascunho', 'finalizado']).default('rascunho'),
})

const planoUpdateSchema = planoSchema.extend({
  id: z.string().uuid(),
})

/**
 * GET /api/professor/planos?turma_id=X&periodo=semanal
 */
export const GET = withAuth(['professor', 'administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const periodo = searchParams.get('periodo')
  const disciplinaId = searchParams.get('disciplina_id')

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
  }

  if (usuario.tipo_usuario === 'professor') {
    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }
  }

  let whereExtra = ''
  const params: (string | null)[] = [turmaId]
  let paramIndex = 2

  if (periodo) {
    whereExtra += ` AND p.periodo = $${paramIndex}`
    params.push(periodo)
    paramIndex++
  }

  if (disciplinaId) {
    whereExtra += ` AND p.disciplina_id = $${paramIndex}`
    params.push(disciplinaId)
    paramIndex++
  }

  const result = await pool.query(`
    SELECT p.*, t.nome AS turma_nome, de.nome AS disciplina_nome
    FROM planos_aula p
    JOIN turmas t ON t.id = p.turma_id
    LEFT JOIN disciplinas_escolares de ON de.id = p.disciplina_id
    WHERE p.turma_id = $1 ${whereExtra}
    ORDER BY p.data_inicio DESC
  `, params)

  return NextResponse.json({ planos: result.rows })
})

/**
 * POST /api/professor/planos
 */
export const POST = withAuth('professor', async (request, usuario) => {
  const body = await request.json()
  const validacao = planoSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { turma_id, disciplina_id, periodo, data_inicio, data_fim, objetivo, conteudo, metodologia, recursos, avaliacao, observacoes, status } = validacao.data

  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const result = await pool.query(`
    INSERT INTO planos_aula (professor_id, turma_id, disciplina_id, periodo, data_inicio, data_fim, objetivo, conteudo, metodologia, recursos, avaliacao, observacoes, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [usuario.id, turma_id, disciplina_id || null, periodo, data_inicio, data_fim || null, objetivo, conteudo, metodologia || null, recursos || null, avaliacao || null, observacoes || null, status])

  return NextResponse.json({ plano: result.rows[0], mensagem: 'Plano salvo com sucesso' })
})

/**
 * PUT /api/professor/planos
 */
export const PUT = withAuth('professor', async (request, usuario) => {
  const body = await request.json()
  const validacao = planoUpdateSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { id, turma_id, disciplina_id, periodo, data_inicio, data_fim, objetivo, conteudo, metodologia, recursos, avaliacao, observacoes, status } = validacao.data

  const check = await pool.query('SELECT id FROM planos_aula WHERE id = $1 AND professor_id = $2', [id, usuario.id])
  if (check.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Plano não encontrado' }, { status: 404 })
  }

  const result = await pool.query(`
    UPDATE planos_aula
    SET turma_id = $2, disciplina_id = $3, periodo = $4, data_inicio = $5, data_fim = $6,
        objetivo = $7, conteudo = $8, metodologia = $9, recursos = $10, avaliacao = $11,
        observacoes = $12, status = $13, atualizado_em = NOW()
    WHERE id = $1 AND professor_id = $14
    RETURNING *
  `, [id, turma_id, disciplina_id || null, periodo, data_inicio, data_fim || null, objetivo, conteudo, metodologia || null, recursos || null, avaliacao || null, observacoes || null, status, usuario.id])

  return NextResponse.json({ plano: result.rows[0], mensagem: 'Plano atualizado com sucesso' })
})

/**
 * DELETE /api/professor/planos?id=X
 */
export const DELETE = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ mensagem: 'id é obrigatório' }, { status: 400 })
  }

  const result = await pool.query('DELETE FROM planos_aula WHERE id = $1 AND professor_id = $2 RETURNING id', [id, usuario.id])
  if (result.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Plano não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ mensagem: 'Plano removido com sucesso' })
})
