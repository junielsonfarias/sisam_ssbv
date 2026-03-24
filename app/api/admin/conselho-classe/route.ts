import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { parseSearchParams } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/conselho-classe
 * Busca conselho de classe de uma turma/período
 * Params: turma_id, periodo_id
 */
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  const searchParams = request.nextUrl.searchParams
  const { turma_id: turmaId, periodo_id: periodoId } = parseSearchParams(searchParams, ['turma_id', 'periodo_id'])

  if (!turmaId || !periodoId) {
    return NextResponse.json({ mensagem: 'Informe turma_id e periodo_id' }, { status: 400 })
  }

  // Buscar conselho existente
  const conselhoResult = await pool.query(
    `SELECT c.*, u.nome as registrado_por_nome
     FROM conselho_classe c
     LEFT JOIN usuarios u ON c.registrado_por = u.id
     WHERE c.turma_id = $1 AND c.periodo_id = $2`,
    [turmaId, periodoId]
  )

  if (conselhoResult.rows.length === 0) {
    return NextResponse.json({ conselho: null, pareceres: {} })
  }

  const conselho = conselhoResult.rows[0]

  // Buscar pareceres dos alunos
  const pareceresResult = await pool.query(
    `SELECT cca.aluno_id, cca.parecer, cca.observacao
     FROM conselho_classe_alunos cca
     WHERE cca.conselho_id = $1`,
    [conselho.id]
  )

  const pareceres: Record<string, { parecer: string; observacao: string }> = {}
  for (const p of pareceresResult.rows) {
    pareceres[p.aluno_id] = { parecer: p.parecer, observacao: p.observacao || '' }
  }

  return NextResponse.json({ conselho, pareceres })
})

/**
 * POST /api/admin/conselho-classe
 * Salva conselho de classe (ata + pareceres dos alunos)
 */
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const body = await request.json()
    const { turma_id, periodo_id, data_reuniao, ata_geral, pareceres } = body

    if (!turma_id || !periodo_id) {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    // Buscar escola_id e ano_letivo da turma
    const turmaResult = await pool.query(
      'SELECT escola_id, ano_letivo FROM turmas WHERE id = $1',
      [turma_id]
    )
    if (turmaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Turma não encontrada' }, { status: 404 })
    }

    const { escola_id, ano_letivo } = turmaResult.rows[0]

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Upsert conselho
      const conselhoResult = await client.query(
        `INSERT INTO conselho_classe (turma_id, periodo_id, escola_id, ano_letivo, data_reuniao, ata_geral, registrado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (turma_id, periodo_id) DO UPDATE SET
           data_reuniao = EXCLUDED.data_reuniao,
           ata_geral = EXCLUDED.ata_geral,
           registrado_por = EXCLUDED.registrado_por,
           atualizado_em = CURRENT_TIMESTAMP
         RETURNING id`,
        [turma_id, periodo_id, escola_id, ano_letivo, data_reuniao || null, ata_geral || null, usuario.id]
      )

      const conselhoId = conselhoResult.rows[0].id

      // Salvar pareceres dos alunos
      let salvos = 0
      if (Array.isArray(pareceres)) {
        for (const p of pareceres) {
          if (!p.aluno_id) continue

          await client.query(
            `INSERT INTO conselho_classe_alunos (conselho_id, aluno_id, parecer, observacao)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (conselho_id, aluno_id) DO UPDATE SET
               parecer = EXCLUDED.parecer,
               observacao = EXCLUDED.observacao,
               atualizado_em = CURRENT_TIMESTAMP`,
            [conselhoId, p.aluno_id, p.parecer || 'sem_parecer', p.observacao || null]
          )
          salvos++
        }
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: `Conselho de classe salvo com ${salvos} parecer(es)`,
        conselho_id: conselhoId,
        salvos,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (error: unknown) {
    console.error('Erro ao salvar conselho de classe:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
