import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const codigoBnccSchema = z.string().regex(/^E[FIM]\d+[A-Z]+\d+$/i, 'Codigo BNCC invalido')

const diarioSchema = z.object({
  turma_id: z.string().uuid(),
  disciplina_id: z.string().uuid().nullable().optional(),
  data_aula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório').max(5000),
  metodologia: z.string().max(2000).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  habilidades_bncc: z.array(codigoBnccSchema).max(30).optional(),
})

/**
 * Substitui os vinculos BNCC do registro de diario por novos codigos.
 * Quando codigos vier vazio, apenas remove os vinculos existentes.
 */
async function sincronizarBnccDiario(diarioId: string, codigos: string[]): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'DELETE FROM diario_classe_bncc_habilidades WHERE diario_id = $1',
      [diarioId]
    )
    for (const codigo of codigos) {
      await client.query(
        `INSERT INTO diario_classe_bncc_habilidades (diario_id, habilidade_codigo)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [diarioId, codigo]
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

interface UpsertDiarioInput {
  professorId: string
  turmaId: string
  disciplinaId: string | null
  dataAula: string
  conteudo: string
  metodologia: string | null
  observacoes: string | null
}

/**
 * Upsert seguro para disciplina_id NULL sem depender da UNIQUE da tabela.
 * Localiza a linha existente com IS NOT DISTINCT FROM (compara NULL = NULL como
 * verdadeiro); se existir, faz UPDATE por id; caso contrário, INSERT. Roda em
 * transação para evitar corrida entre o SELECT e a escrita.
 */
async function upsertDiario(input: UpsertDiarioInput): Promise<any> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existente = await client.query(
      `SELECT id FROM diario_classe
       WHERE professor_id = $1 AND turma_id = $2 AND data_aula = $3
         AND disciplina_id IS NOT DISTINCT FROM $4
       FOR UPDATE`,
      [input.professorId, input.turmaId, input.dataAula, input.disciplinaId]
    )

    let result
    if (existente.rows.length > 0) {
      result = await client.query(
        `UPDATE diario_classe
         SET conteudo = $2, metodologia = $3, observacoes = $4, atualizado_em = NOW()
         WHERE id = $1
         RETURNING *`,
        [existente.rows[0].id, input.conteudo, input.metodologia, input.observacoes]
      )
    } else {
      result = await client.query(
        `INSERT INTO diario_classe (professor_id, turma_id, disciplina_id, data_aula, conteudo, metodologia, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          input.professorId,
          input.turmaId,
          input.disciplinaId,
          input.dataAula,
          input.conteudo,
          input.metodologia,
          input.observacoes,
        ]
      )
    }

    await client.query('COMMIT')
    return result.rows[0]
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

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
    SELECT d.*, t.nome AS turma_nome, de.nome AS disciplina_nome,
           COALESCE(bncc.codigos, '{}') AS habilidades_bncc
    FROM diario_classe d
    JOIN turmas t ON t.id = d.turma_id
    LEFT JOIN disciplinas_escolares de ON de.id = d.disciplina_id
    LEFT JOIN LATERAL (
      SELECT array_agg(db.habilidade_codigo ORDER BY db.habilidade_codigo) AS codigos
      FROM diario_classe_bncc_habilidades db
      WHERE db.diario_id = d.id
    ) bncc ON true
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

  const { turma_id, disciplina_id, data_aula, conteudo, metodologia, observacoes, habilidades_bncc } = validacao.data

  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  // Upsert manual transacional: a UNIQUE(professor_id, turma_id, disciplina_id, data_aula)
  // trata cada NULL de disciplina_id como distinto, então ON CONFLICT nunca dispara para
  // turmas polivalentes/anos iniciais (disciplina vazia) e cada re-salvamento duplicaria a
  // linha. Usamos IS NOT DISTINCT FROM (NULL = NULL → verdadeiro) para localizar a linha
  // existente e fazer UPDATE por id, ou INSERT quando não houver.
  const registro = await upsertDiario({
    professorId: usuario.id,
    turmaId: turma_id,
    disciplinaId: disciplina_id || null,
    dataAula: data_aula,
    conteudo,
    metodologia: metodologia || null,
    observacoes: observacoes || null,
  })
  if (habilidades_bncc !== undefined) {
    await sincronizarBnccDiario(registro.id, habilidades_bncc)
  }

  return NextResponse.json({ registro, mensagem: 'Registro salvo com sucesso' })
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

  const { id, turma_id, disciplina_id, data_aula, conteudo, metodologia, observacoes, habilidades_bncc } = validacao.data

  // Verificar se o registro pertence ao professor
  const check = await pool.query('SELECT id FROM diario_classe WHERE id = $1 AND professor_id = $2', [id, usuario.id])
  if (check.rows.length === 0) {
    return NextResponse.json({ mensagem: 'Registro não encontrado' }, { status: 404 })
  }

  // Revalidar vínculo com a turma de destino (o PUT pode mover o registro para
  // outra turma via SET turma_id — sem este check o professor reatribuiria o
  // diário para turma sem vínculo, poluindo o GET de outros usuários).
  const temVinculo = await verificarVinculoProfessor(usuario.id, turma_id)
  if (!temVinculo) {
    return NextResponse.json({ mensagem: 'Sem vínculo com esta turma' }, { status: 403 })
  }

  const result = await pool.query(`
    UPDATE diario_classe
    SET turma_id = $2, disciplina_id = $3, data_aula = $4, conteudo = $5, metodologia = $6, observacoes = $7, atualizado_em = NOW()
    WHERE id = $1 AND professor_id = $8
    RETURNING *
  `, [id, turma_id, disciplina_id || null, data_aula, conteudo, metodologia || null, observacoes || null, usuario.id])

  if (habilidades_bncc !== undefined) {
    await sincronizarBnccDiario(id, habilidades_bncc)
  }

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
