import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { verificarVinculoProfessor } from '@/lib/professor-auth'

const log = createLogger('ProfessorTarefas')

export const dynamic = 'force-dynamic'

// Schemas compartilhados POST/PUT. `disciplina_id` (UUID) substitui o input
// livre `disciplina` (VARCHAR) — disciplina continua aceito por compat e
// vira fallback quando disciplina_id e null.
const baseTarefaSchema = z.object({
  titulo: z.string().min(3).max(255),
  descricao: z.string().max(2000).nullable().optional(),
  disciplina_id: z.string().uuid().nullable().optional(),
  disciplina: z.string().max(100).nullable().optional(),
  data_entrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(['atividade', 'trabalho', 'prova', 'pesquisa', 'leitura']).default('atividade'),
})

const criarTarefaSchema = baseTarefaSchema.extend({
  turma_id: z.string().uuid(),
})

const editarTarefaSchema = baseTarefaSchema.extend({
  id: z.string().uuid(),
})

/**
 * GET /api/professor/tarefas?turma_id=UUID
 * Lista tarefas do professor (todas ou por turma) com nome da disciplina
 * resolvido via JOIN (quando disciplina_id presente) ou fallback no
 * VARCHAR legado.
 */
export const GET = withAuth(['professor'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')

    let query = `
      SELECT t.id, t.turma_id, t.professor_id, t.titulo, t.descricao,
             t.disciplina_id, t.disciplina,
             COALESCE(de.nome, t.disciplina) AS disciplina_nome,
             t.data_entrega, t.tipo, t.ativo, t.criado_em, t.atualizado_em,
             tu.codigo AS turma_codigo, tu.nome AS turma_nome, tu.serie
      FROM tarefas_turma t
      INNER JOIN turmas tu ON t.turma_id = tu.id
      LEFT JOIN disciplinas_escolares de ON de.id = t.disciplina_id
      WHERE t.professor_id = $1 AND t.ativo = true`
    const params: string[] = [usuario.id]

    if (turmaId) {
      params.push(turmaId)
      query += ` AND t.turma_id = $${params.length}`
    }

    query += ` ORDER BY t.data_entrega DESC LIMIT 200`

    const result = await pool.query(query, params)
    return NextResponse.json({ tarefas: result.rows })
  } catch (error: unknown) {
    log.error('Erro ao buscar tarefas', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

/**
 * POST /api/professor/tarefas
 * Criar nova tarefa
 */
export const POST = withAuth(['professor'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = criarTarefaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos', erros: parsed.error.errors }, { status: 400 })
    }

    const { turma_id, titulo, descricao, disciplina_id, disciplina, data_entrega, tipo } = parsed.data

    const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
    if (!temVinculo) {
      return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
    }

    const result = await pool.query(
      `INSERT INTO tarefas_turma
         (turma_id, professor_id, titulo, descricao, disciplina_id, disciplina, data_entrega, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [turma_id, usuario.id, titulo, descricao || null, disciplina_id || null, disciplina || null, data_entrega, tipo]
    )

    // Push notification para pais (fire-and-forget) — nao bloqueia resposta
    import('@/lib/services/push.service').then(({ notificarComunicadoTurma }) => {
      notificarComunicadoTurma(turma_id, `Nova tarefa: ${titulo}`, 'Professor')
    }).catch(() => {})

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    log.error('Erro ao criar tarefa', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

/**
 * PUT /api/professor/tarefas
 * Editar tarefa existente (so o professor dono pode editar).
 * turma_id NAO e editavel — mover entre turmas exigiria invalidar push
 * envios anteriores e tornar a operacao mais complexa que delete+create.
 */
export const PUT = withAuth(['professor'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = editarTarefaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos', erros: parsed.error.errors }, { status: 400 })
    }

    const { id, titulo, descricao, disciplina_id, disciplina, data_entrega, tipo } = parsed.data

    const result = await pool.query(
      `UPDATE tarefas_turma
          SET titulo = $1,
              descricao = $2,
              disciplina_id = $3,
              disciplina = $4,
              data_entrega = $5,
              tipo = $6,
              atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $7 AND professor_id = $8 AND ativo = true
        RETURNING *`,
      [titulo, descricao || null, disciplina_id || null, disciplina || null, data_entrega, tipo, id, usuario.id]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ mensagem: 'Tarefa nao encontrada ou sem permissao' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error: unknown) {
    log.error('Erro ao editar tarefa', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

/**
 * DELETE /api/professor/tarefas?id=UUID
 * Soft-delete tarefa
 */
export const DELETE = withAuth(['professor'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ mensagem: 'id obrigatorio' }, { status: 400 })

    await pool.query(
      'UPDATE tarefas_turma SET ativo = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 AND professor_id = $2',
      [id, usuario.id]
    )

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    log.error('Erro ao deletar tarefa', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
