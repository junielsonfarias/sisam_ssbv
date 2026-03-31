import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { cacheDelPattern } from '@/lib/cache'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/cartao-resposta?turma_id=X&avaliacao_id=Y
 * Retorna alunos da turma + configuração de questões
 */
export const GET = withAuth(['administrador', 'tecnico'], async (request) => {
  const { searchParams } = new URL(request.url)
  const turma_id = searchParams.get('turma_id')
  const avaliacao_id = searchParams.get('avaliacao_id')

  if (!turma_id) {
    return NextResponse.json({ mensagem: 'turma_id é obrigatório.' }, { status: 400 })
  }

  // Buscar alunos da turma
  const alunos = await pool.query(
    `SELECT a.id, a.nome, a.codigo
     FROM alunos a
     JOIN matriculas m ON m.aluno_id = a.id
     WHERE m.turma_id = $1 AND m.status = 'ativa'
     ORDER BY a.nome`,
    [turma_id]
  )

  // Buscar info da turma e série
  const turmaRes = await pool.query(
    `SELECT t.id, t.codigo, t.serie, t.escola_id, e.nome AS escola_nome
     FROM turmas t
     JOIN escolas e ON e.id = t.escola_id
     WHERE t.id = $1`,
    [turma_id]
  )

  // Buscar configuração de questões da série (se existir)
  let totalQuestoes = 20
  const serie = turmaRes.rows[0]?.serie
  if (serie) {
    const configRes = await pool.query(
      `SELECT total_questoes FROM config_series WHERE serie = $1 LIMIT 1`,
      [serie]
    )
    if (configRes.rows.length > 0 && configRes.rows[0].total_questoes) {
      totalQuestoes = configRes.rows[0].total_questoes
    }
  }

  // Se avaliação informada, buscar respostas já existentes
  let respostasExistentes: Record<string, any> = {}
  if (avaliacao_id) {
    const respostasRes = await pool.query(
      `SELECT aluno_id, respostas, presenca
       FROM resultados_provas
       WHERE avaliacao_id = $1 AND aluno_id = ANY($2::uuid[])`,
      [avaliacao_id, alunos.rows.map((a: any) => a.id)]
    )
    for (const r of respostasRes.rows) {
      respostasExistentes[r.aluno_id] = { respostas: r.respostas, presenca: r.presenca }
    }
  }

  return NextResponse.json({
    turma: turmaRes.rows[0] || null,
    alunos: alunos.rows,
    totalQuestoes,
    respostasExistentes,
  })
})

const respostaItemSchema = z.object({
  aluno_id: z.string().uuid(),
  respostas: z.record(z.string(), z.string()),
  presenca: z.enum(['P', 'F']),
})

const submitSchema = z.object({
  turma_id: z.string().uuid(),
  avaliacao_id: z.string().uuid(),
  ano_letivo: z.string(),
  dados: z.array(respostaItemSchema),
})

/**
 * POST /api/admin/cartao-resposta — Salvar respostas do cartão digital
 */
export const POST = withAuth(['administrador', 'tecnico'], async (request) => {
  try {
    const body = await request.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: parsed.error.errors[0].message }, { status: 400 })
    }

    const { turma_id, avaliacao_id, ano_letivo, dados } = parsed.data
    let inseridos = 0
    let atualizados = 0

    for (const item of dados) {
      // Upsert: se já existe, atualiza; senão, insere
      const existing = await pool.query(
        `SELECT id FROM resultados_provas WHERE avaliacao_id = $1 AND aluno_id = $2`,
        [avaliacao_id, item.aluno_id]
      )

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE resultados_provas
           SET respostas = $1, presenca = $2, atualizado_em = NOW()
           WHERE avaliacao_id = $3 AND aluno_id = $4`,
          [JSON.stringify(item.respostas), item.presenca, avaliacao_id, item.aluno_id]
        )
        atualizados++
      } else {
        await pool.query(
          `INSERT INTO resultados_provas (avaliacao_id, aluno_id, turma_id, ano_letivo, respostas, presenca)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [avaliacao_id, item.aluno_id, turma_id, ano_letivo, JSON.stringify(item.respostas), item.presenca]
        )
        inseridos++
      }
    }

    try { await cacheDelPattern('resultados:*') } catch {}
    try { await cacheDelPattern('boletim:*') } catch {}

    return NextResponse.json({
      mensagem: `Cartão-resposta salvo! ${inseridos} inserido(s), ${atualizados} atualizado(s).`,
      inseridos,
      atualizados,
    })
  } catch (error: any) {
    console.error('[CARTAO-RESPOSTA POST]', error.message)
    return NextResponse.json({ mensagem: 'Erro ao salvar respostas.' }, { status: 500 })
  }
})
