import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const enviarMensagemSchema = z.object({
  thread_id: z.string().uuid(),
  conteudo: z.string().min(1).max(2000),
})

/**
 * GET /api/responsavel/mensagens
 * Lista threads de conversas do responsavel com professores
 */
export const GET = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('thread_id')

    // Se tem thread_id, retorna mensagens do thread
    if (threadId) {
      const threadCheck = await pool.query(
        'SELECT id FROM threads_chat WHERE id = $1 AND responsavel_id = $2',
        [threadId, usuario.id]
      )
      if (threadCheck.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Conversa nao encontrada' }, { status: 404 })
      }

      // Marcar mensagens do professor como lidas
      await pool.query(
        `UPDATE mensagens_chat SET lido = true, lido_em = NOW()
         WHERE thread_id = $1 AND remetente_tipo = 'professor' AND lido = false`,
        [threadId]
      )
      await pool.query(
        'UPDATE threads_chat SET nao_lido_responsavel = 0 WHERE id = $1',
        [threadId]
      )

      const mensagens = await pool.query(
        `SELECT m.id, m.conteudo, m.remetente_tipo, m.lido, m.criado_em,
                u.nome AS remetente_nome
         FROM mensagens_chat m
         INNER JOIN usuarios u ON m.remetente_id = u.id
         WHERE m.thread_id = $1
         ORDER BY m.criado_em ASC
         LIMIT 100`,
        [threadId]
      )

      // Info do thread
      const thread = await pool.query(
        `SELECT t.id, a.nome AS aluno_nome, a.serie,
                up.nome AS professor_nome
         FROM threads_chat t
         INNER JOIN alunos a ON t.aluno_id = a.id
         INNER JOIN usuarios up ON t.professor_id = up.id
         WHERE t.id = $1`,
        [threadId]
      )

      return NextResponse.json({
        mensagens: mensagens.rows,
        thread: thread.rows[0] || null,
      })
    }

    // Listar todos os threads
    const threads = await pool.query(
      `SELECT t.id, t.aluno_id, t.professor_id,
              t.ultima_mensagem, t.ultima_mensagem_em, t.ultimo_remetente,
              t.nao_lido_responsavel,
              a.nome AS aluno_nome, a.serie,
              up.nome AS professor_nome
       FROM threads_chat t
       INNER JOIN alunos a ON t.aluno_id = a.id
       INNER JOIN usuarios up ON t.professor_id = up.id
       WHERE t.responsavel_id = $1 AND t.ativo = true
       ORDER BY t.ultima_mensagem_em DESC
       LIMIT 50`,
      [usuario.id]
    )

    const naoLidoResult = await pool.query(
      'SELECT COALESCE(SUM(nao_lido_responsavel), 0) AS total FROM threads_chat WHERE responsavel_id = $1 AND ativo = true',
      [usuario.id]
    )

    return NextResponse.json({
      threads: threads.rows,
      total_nao_lido: parseInt(naoLidoResult.rows[0]?.total) || 0,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar mensagens responsavel:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/responsavel/mensagens
 * Responsavel responde em um thread existente
 */
export const POST = withAuth(['responsavel'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = enviarMensagemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
    }

    const { thread_id, conteudo } = parsed.data

    // Verificar que o responsavel pertence ao thread
    const threadCheck = await pool.query(
      'SELECT id, professor_id FROM threads_chat WHERE id = $1 AND responsavel_id = $2 AND ativo = true',
      [thread_id, usuario.id]
    )
    if (threadCheck.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Conversa nao encontrada' }, { status: 404 })
    }

    // Inserir mensagem
    const msgResult = await pool.query(
      `INSERT INTO mensagens_chat (thread_id, remetente_id, remetente_tipo, conteudo)
       VALUES ($1, $2, 'responsavel', $3)
       RETURNING id, criado_em`,
      [thread_id, usuario.id, conteudo]
    )

    // Atualizar thread
    await pool.query(
      `UPDATE threads_chat SET
        ultimo_remetente = 'responsavel',
        ultima_mensagem = $1,
        ultima_mensagem_em = NOW(),
        nao_lido_professor = nao_lido_professor + 1
       WHERE id = $2`,
      [conteudo.substring(0, 100), thread_id]
    )

    return NextResponse.json({
      mensagem_id: msgResult.rows[0].id,
      criado_em: msgResult.rows[0].criado_em,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao enviar mensagem responsavel:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
