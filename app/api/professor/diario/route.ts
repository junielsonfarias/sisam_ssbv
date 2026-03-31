import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const diarioSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid().nullable().optional(),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório').max(5000),
  metodologia: z.string().max(2000).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
})

const diarioUpdateSchema = diarioSchema.extend({
  id: z.string().uuid(),
})

/**
 * GET /api/professor/diario?turma_id=X&mes=YYYY-MM
 */
export const GET = withAuth(['professor', 'administrador', 'tecnico'], async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const turmaId = searchParams.get('turma_id')
  const mes = searchParams.get('mes') // formato YYYY-MM
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')

  if (!turmaId) {
    return NextResponse.json({ mensagem: 'turma_id é obrigatório' }, { status: 400 })
  }

  // Professor precisa ter vínculo
  if (usuario.tipo_usuario === 'professor') {
    const temVinculo = await verificarVinculoProfessor(usuario.id, turmaId)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }
  }

  let whereExtra = ''
  const params: (string | null)[] = [turmaId]
  let paramIndex = 2

  if (mes) {
    whereExtra += ` AND TO_CHAR(d.data_aula, 'YYYY-MM') = $${paramIndex}`
    params.push(mes)
    paramIndex++
  } else if (dataInicio && dataFim) {
    whereExtra += ` AND d.data_aula BETWEEN $${paramIndex} AND $${paramIndex + 1}`
    params.push(dataInicio, dataFim)
    paramIndex += 2
  }

  const result = await pool.query(`
    SELECT d.*, t.nome AS turma_nome, de.nome AS disciplina_nome
    FROM diario_classe d
    JOIN turmas t ON t.id = d.turma_id
    LEFT JOIN disciplinas_escolares de ON de.id = d.disciplina_id
    WHERE d.turma_id = $1 ${whereExtra}
    ORDER BY d.data_aula DESC
  `, params)

  return NextResponse.json({ registros: result.rows })
})

/**
 * POST /api/professor/diario
 */
export const POST = withAuth('professor', async (request, usuario) => {
  const body = await request.json()
  const validacao = diarioSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { turma_id, disciplina_id, data_aula, conteudo, metodologia, observacoes } = validacao.data

  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const result = await pool.query(`
    INSERT INTO diario_classe (professor_id, turma_id, disciplina_id, data_aula, conteudo, metodologia, observacoes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (professor_id, turma_id, disciplina_id, data_aula)
    DO UPDATE SET conteudo = $5, metodologia = $6, observacoes = $7, atualizado_em = NOW()
    RETURNING *
  `, [usuario.id, turma_id, disciplina_id || null, data_aula, conteudo, metodologia || null, observacoes || null])

  return NextResponse.json({ registro: result.rows[0], mensagem: 'Registro salvo com sucesso' })
})

/**
 * PUT /api/professor/diario
 */
export const PUT = withAuth('professor', async (request, usuario) => {
  const body = await request.json()
  const validacao = diarioUpdateSchema.safeParse(body)
  if (!validacao.success) {
    return NextResponse.json({
      mensagem: 'Dados inválidos',
      erros: validacao.error.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
    }, { status: 400 })
  }

  const { id, turma_id, disciplina_id, data_aula, conteudo, metodologia, observacoes } = validacao.data

  // Verificar se o registro pertence ao professor
  const check = await pool.query('SELECT id FROM diario_classe WHERE id = $1 AND professor_id = $2', [id, usuario.id])
  if (check.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
  }

  const result = await pool.query(`
    UPDATE diario_classe
    SET turma_id = $2, disciplina_id = $3, data_aula = $4, conteudo = $5, metodologia = $6, observacoes = $7, atualizado_em = NOW()
    WHERE id = $1 AND professor_id = $8
    RETURNING *
  `, [id, turma_id, disciplina_id || null, data_aula, conteudo, metodologia || null, observacoes || null, usuario.id])

  return NextResponse.json({ registro: result.rows[0], mensagem: 'Registro atualizado com sucesso' })
})

/**
 * DELETE /api/professor/diario?id=X
 */
export const DELETE = withAuth('professor', async (request, usuario) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ mensagem: 'id é obrigatório' }, { status: 400 })
  }

  const result = await pool.query('DELETE FROM diario_classe WHERE id = $1 AND professor_id = $2 RETURNING id', [id, usuario.id])
  if (result.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
})
