import { NextResponse } from 'next/server'
import pool from '@/database/connection'
import { withAuth } from '@/lib/auth/with-auth'
import { cacheDelPattern } from '@/lib/cache'
import { resolverAvaliacaoId } from '@/lib/avaliacoes'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('AdminCartaoResposta')

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

  // Buscar alunos da turma. A fonte de verdade é alunos.turma_id (a tabela
  // `matriculas` não existe no schema) — ativos e cursando, igual ao resto do
  // sistema (lib/services/turmas.service buscarAlunosDaTurma).
  const alunos = await pool.query(
    `SELECT a.id, a.nome, a.codigo
     FROM alunos a
     WHERE a.turma_id = $1 AND a.ativo = true AND a.situacao = 'cursando'
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
      `SELECT total_questoes_objetivas AS total_questoes FROM configuracao_series WHERE serie = $1 LIMIT 1`,
      [serie]
    )
    if (configRes.rows.length > 0 && configRes.rows[0].total_questoes) {
      totalQuestoes = configRes.rows[0].total_questoes
    }
  }

  // Se avaliação informada, buscar respostas já existentes.
  // resultados_provas guarda UMA linha por questão (questao_codigo / resposta_aluno),
  // não um campo JSON — então reagregamos as linhas em { Q1: 'A', Q2: 'B', ... } por aluno.
  const respostasExistentes: Record<string, { respostas: Record<string, string>; presenca: string }> = {}
  if (avaliacao_id) {
    const respostasRes = await pool.query(
      `SELECT aluno_id, questao_codigo, resposta_aluno, presenca
       FROM resultados_provas
       WHERE avaliacao_id = $1 AND aluno_id = ANY($2::uuid[])`,
      [avaliacao_id, alunos.rows.map((a: any) => a.id)]
    )
    for (const r of respostasRes.rows) {
      if (!respostasExistentes[r.aluno_id]) {
        respostasExistentes[r.aluno_id] = { respostas: {}, presenca: r.presenca || 'P' }
      }
      // presenca é a mesma para todas as linhas do aluno; mantém a última lida
      respostasExistentes[r.aluno_id].presenca = r.presenca || 'P'
      if (r.questao_codigo && r.resposta_aluno) {
        respostasExistentes[r.aluno_id].respostas[r.questao_codigo] = r.resposta_aluno
      }
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
 *
 * Grava UMA linha por questão em resultados_provas (modelo real do schema:
 * questao_codigo / resposta_aluno), upsert via índice único
 * (aluno_id, questao_codigo, avaliacao_id). Todo o lote roda em UMA transação
 * (BEGIN/COMMIT/ROLLBACK) — espelha cartao-resposta/ler.
 */
export const POST = withAuth(['administrador', 'tecnico'], async (request) => {
  const body = await request.json()
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ mensagem: parsed.error.errors[0].message }, { status: 400 })
  }

  const { turma_id, avaliacao_id, ano_letivo, dados } = parsed.data
  const avaliacaoId = await resolverAvaliacaoId(avaliacao_id, ano_letivo)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // escola_id é NOT NULL em resultados_provas — resolver a partir da turma.
    const turmaRes = await client.query(
      `SELECT escola_id, serie FROM turmas WHERE id = $1`,
      [turma_id]
    )
    if (turmaRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return NextResponse.json({ mensagem: 'Turma não encontrada.' }, { status: 404 })
    }
    const escolaId = turmaRes.rows[0].escola_id
    const serieTurma = turmaRes.rows[0].serie || null

    let questoesGravadas = 0
    let alunos = 0

    for (const item of dados) {
      alunos++
      for (const [questaoCodigo, resposta] of Object.entries(item.respostas)) {
        if (!resposta) continue // questão sem marcação não grava linha
        await client.query(
          `INSERT INTO resultados_provas
             (escola_id, aluno_id, turma_id, questao_codigo, resposta_aluno,
              presenca, ano_letivo, serie, avaliacao_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (aluno_id, questao_codigo, avaliacao_id)
           DO UPDATE SET
             resposta_aluno = EXCLUDED.resposta_aluno,
             presenca = EXCLUDED.presenca,
             atualizado_em = NOW()`,
          [escolaId, item.aluno_id, turma_id, questaoCodigo, resposta, item.presenca, ano_letivo, serieTurma, avaliacaoId]
        )
        questoesGravadas++
      }
    }

    await client.query('COMMIT')

    try { await cacheDelPattern('resultados:*') } catch {}
    try { await cacheDelPattern('boletim:*') } catch {}

    return NextResponse.json({
      mensagem: `Cartão-resposta salvo! ${alunos} aluno(s), ${questoesGravadas} questão(ões) gravada(s).`,
      alunos,
      questoesGravadas,
    })
  } catch (error: any) {
    await client.query('ROLLBACK')
    log.error('Erro ao salvar respostas', error)
    return NextResponse.json({ mensagem: 'Erro ao salvar respostas.' }, { status: 500 })
  } finally {
    client.release()
  }
})
