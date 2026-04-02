import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const enviarMensagemSchema = z.object({
  aluno_id: z.string().uuid(),
  responsavel_id: z.string().uuid(),
  conteudo: z.string().min(1).max(2000),
})

/**
 * GET /api/professor/mensagens
 * Lista threads de conversas do professor com responsaveis
 */
export const GET = withAuth(['professor'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('thread_id')

    // Se tem thread_id, retorna mensagens do thread
    if (threadId) {
      // Verificar que o professor pertence ao thread
      const threadCheck = await pool.query(
        'SELECT id FROM threads_chat WHERE id = $1 AND professor_id = $2',
        [threadId, usuario.id]
      )
      if (threadCheck.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Thread nao encontrado' }, { status: 404 })
      }

      // Marcar mensagens do responsavel como lidas
      await pool.query(
        `UPDATE mensagens_chat SET lido = true, lido_em = NOW()
         WHERE thread_id = $1 AND remetente_tipo = 'responsavel' AND lido = false`,
        [threadId]
      )
      await pool.query(
        'UPDATE threads_chat SET nao_lido_professor = 0 WHERE id = $1',
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

      return NextResponse.json({ mensagens: mensagens.rows })
    }

    // Listar todos os threads do professor
    const threads = await pool.query(
      `SELECT t.id, t.aluno_id, t.responsavel_id,
              t.ultima_mensagem, t.ultima_mensagem_em, t.ultimo_remetente,
              t.nao_lido_professor,
              a.nome AS aluno_nome, a.serie, a.codigo AS aluno_codigo,
              ur.nome AS responsavel_nome,
              ra.tipo_vinculo
       FROM threads_chat t
       INNER JOIN alunos a ON t.aluno_id = a.id
       INNER JOIN usuarios ur ON t.responsavel_id = ur.id
       LEFT JOIN responsaveis_alunos ra ON ra.usuario_id = t.responsavel_id AND ra.aluno_id = t.aluno_id
       WHERE t.professor_id = $1 AND t.ativo = true
       ORDER BY t.ultima_mensagem_em DESC
       LIMIT 50`,
      [usuario.id]
    )

    // Total de nao lidas
    const naoLidoResult = await pool.query(
      'SELECT COALESCE(SUM(nao_lido_professor), 0) AS total FROM threads_chat WHERE professor_id = $1 AND ativo = true',
      [usuario.id]
    )

    return NextResponse.json({
      threads: threads.rows,
      total_nao_lido: parseInt(naoLidoResult.rows[0]?.total) || 0,
    })
  } catch (error: unknown) {
    console.error('Erro ao buscar mensagens professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})

/**
 * POST /api/professor/mensagens
 * Professor envia mensagem para responsavel de um aluno
 */
export const POST = withAuth(['professor'], async (request, usuario) => {
  try {
    const body = await request.json()
    const parsed = enviarMensagemSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ mensagem: 'Dados invalidos' }, { status: 400 })
    }

    const { aluno_id, responsavel_id, conteudo } = parsed.data

    // Buscar ou criar thread
    let threadResult = await pool.query(
      'SELECT id FROM threads_chat WHERE professor_id = $1 AND responsavel_id = $2 AND aluno_id = $3',
      [usuario.id, responsavel_id, aluno_id]
    )

    let threadId: string
    if (threadResult.rows.length === 0) {
      // Criar novo thread
      const newThread = await pool.query(
        `INSERT INTO threads_chat (professor_id, responsavel_id, aluno_id, ultimo_remetente, ultima_mensagem, ultima_mensagem_em, nao_lido_responsavel)
         VALUES ($1, $2, $3, 'professor', $4, NOW(), 1)
         RETURNING id`,
        [usuario.id, responsavel_id, aluno_id, conteudo.substring(0, 100)]
      )
      threadId = newThread.rows[0].id
    } else {
      threadId = threadResult.rows[0].id
      // Atualizar thread
      await pool.query(
        `UPDATE threads_chat SET
          ultimo_remetente = 'professor',
          ultima_mensagem = $1,
          ultima_mensagem_em = NOW(),
          nao_lido_responsavel = nao_lido_responsavel + 1
         WHERE id = $2`,
        [conteudo.substring(0, 100), threadId]
      )
    }

    // Inserir mensagem
    const msgResult = await pool.query(
      `INSERT INTO mensagens_chat (thread_id, remetente_id, remetente_tipo, conteudo)
       VALUES ($1, $2, 'professor', $3)
       RETURNING id, criado_em`,
      [threadId, usuario.id, conteudo]
    )

    return NextResponse.json({
      mensagem_id: msgResult.rows[0].id,
      thread_id: threadId,
      criado_em: msgResult.rows[0].criado_em,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('Erro ao enviar mensagem professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
})
