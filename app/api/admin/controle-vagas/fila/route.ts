import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

// Listar fila de espera
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turma_id')
    const escolaId = searchParams.get('escola_id')
    const status = searchParams.get('status')

    let query = `
      SELECT fe.id, fe.posicao, fe.status, fe.observacao,
             fe.data_entrada, fe.data_convocacao, fe.data_resolucao,
             a.nome as aluno_nome, a.codigo as aluno_codigo, a.id as aluno_id,
             a.serie as aluno_serie, a.data_nascimento as aluno_nascimento,
             t.codigo as turma_codigo, t.serie as turma_serie, t.id as turma_id,
             e.nome as escola_nome, e.id as escola_id,
             EXTRACT(DAY FROM (CURRENT_TIMESTAMP - fe.data_entrada)) as dias_espera
      FROM fila_espera fe
      JOIN alunos a ON fe.aluno_id = a.id
      JOIN turmas t ON fe.turma_id = t.id
      JOIN escolas e ON fe.escola_id = e.id
      WHERE 1=1
    `
    const params: any[] = []
    let idx = 1

    if (turmaId) {
      query += ` AND fe.turma_id = $${idx}`
      params.push(turmaId)
      idx++
    }

    const filtroEscola = usuario.tipo_usuario === 'escola' ? usuario.escola_id : escolaId
    if (filtroEscola) {
      query += ` AND fe.escola_id = $${idx}`
      params.push(filtroEscola)
      idx++
    }

    if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
      query += ` AND e.polo_id = $${idx}`
      params.push(usuario.polo_id)
      idx++
    }

    if (status) {
      query += ` AND fe.status = $${idx}`
      params.push(status)
      idx++
    }

    query += ` ORDER BY fe.status = 'aguardando' DESC, fe.posicao ASC, fe.data_entrada ASC`

    const result = await pool.query(query, params)

    // Resumo da fila
    const resumoFila = {
      total: result.rows.length,
      aguardando: result.rows.filter(r => r.status === 'aguardando').length,
      convocados: result.rows.filter(r => r.status === 'convocado').length,
      matriculados: result.rows.filter(r => r.status === 'matriculado').length,
      desistentes: result.rows.filter(r => r.status === 'desistente').length
    }

    return NextResponse.json({ itens: result.rows, resumo: resumoFila })

  } catch (error: any) {
    console.error('Erro ao buscar fila de espera:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Adicionar aluno à fila
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { aluno_id, turma_id, escola_id, observacao } = body

    if (!aluno_id || !turma_id || !escola_id) {
      return NextResponse.json({ mensagem: 'aluno_id, turma_id e escola_id são obrigatórios' }, { status: 400 })
    }

    // Escola só pode operar na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Verificar se já está na fila (aguardando ou convocado)
    const existente = await pool.query(
      `SELECT id, status FROM fila_espera WHERE aluno_id = $1 AND turma_id = $2 AND status IN ('aguardando', 'convocado')`,
      [aluno_id, turma_id]
    )
    if (existente.rows.length > 0) {
      return NextResponse.json({ mensagem: 'Aluno já está na fila desta turma' }, { status: 400 })
    }

    // Verificar se aluno já está matriculado nesta turma
    const jaMatriculado = await pool.query(
      `SELECT id FROM alunos WHERE id = $1 AND turma_id = $2 AND ativo = true`,
      [aluno_id, turma_id]
    )
    if (jaMatriculado.rows.length > 0) {
      return NextResponse.json({ mensagem: 'Aluno já está matriculado nesta turma' }, { status: 400 })
    }

    // Próxima posição
    const posResult = await pool.query(
      `SELECT COALESCE(MAX(posicao), 0) + 1 as proxima FROM fila_espera WHERE turma_id = $1 AND status = 'aguardando'`,
      [turma_id]
    )
    const posicao = posResult.rows[0].proxima

    const result = await pool.query(
      `INSERT INTO fila_espera (aluno_id, turma_id, escola_id, posicao, observacao)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [aluno_id, turma_id, escola_id, posicao, observacao || null]
    )

    return NextResponse.json({
      mensagem: `Aluno adicionado à fila na posição ${posicao}`,
      id: result.rows[0].id,
      posicao
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro ao adicionar à fila:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Atualizar status na fila (convocar, matricular, desistência)
export async function PUT(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id, status, observacao } = body

    if (!id || !status) {
      return NextResponse.json({ mensagem: 'id e status são obrigatórios' }, { status: 400 })
    }

    const statusValidos = ['aguardando', 'convocado', 'matriculado', 'desistente']
    if (!statusValidos.includes(status)) {
      return NextResponse.json({ mensagem: `Status inválido. Use: ${statusValidos.join(', ')}` }, { status: 400 })
    }

    // Buscar dados da fila para ações extras
    const filaItem = await pool.query(
      `SELECT fe.aluno_id, fe.turma_id, fe.escola_id, t.serie, t.ano_letivo
       FROM fila_espera fe
       JOIN turmas t ON fe.turma_id = t.id
       WHERE fe.id = $1`,
      [id]
    )

    if (filaItem.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Item não encontrado na fila' }, { status: 404 })
    }

    const item = filaItem.rows[0]

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const updates: string[] = ['status = $1']
      const params: any[] = [status]
      let idx = 2

      if (status === 'convocado') {
        updates.push(`data_convocacao = CURRENT_TIMESTAMP`)
      }
      if (status === 'matriculado' || status === 'desistente') {
        updates.push(`data_resolucao = CURRENT_TIMESTAMP`)
      }
      if (observacao !== undefined) {
        updates.push(`observacao = $${idx}`)
        params.push(observacao)
        idx++
      }

      params.push(id)

      await client.query(
        `UPDATE fila_espera SET ${updates.join(', ')} WHERE id = $${idx}`,
        params
      )

      // Se matriculado, vincular aluno à turma automaticamente
      if (status === 'matriculado') {
        await client.query(
          `UPDATE alunos
           SET turma_id = $1, escola_id = $2, serie = $3, ano_letivo = $4,
               situacao = 'cursando', ativo = true, atualizado_em = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [item.turma_id, item.escola_id, item.serie, item.ano_letivo, item.aluno_id]
        )

        // Reordenar posições dos que ficaram na fila
        await client.query(
          `WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY posicao) as nova_posicao
            FROM fila_espera
            WHERE turma_id = $1 AND status = 'aguardando'
          )
          UPDATE fila_espera SET posicao = ranked.nova_posicao
          FROM ranked WHERE fila_espera.id = ranked.id`,
          [item.turma_id]
        )
      }

      // Se desistente, reordenar posições
      if (status === 'desistente') {
        await client.query(
          `WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY posicao) as nova_posicao
            FROM fila_espera
            WHERE turma_id = $1 AND status = 'aguardando'
          )
          UPDATE fila_espera SET posicao = ranked.nova_posicao
          FROM ranked WHERE fila_espera.id = ranked.id`,
          [item.turma_id]
        )
      }

      await client.query('COMMIT')

      return NextResponse.json({
        mensagem: status === 'matriculado'
          ? 'Aluno matriculado e vinculado à turma com sucesso'
          : `Status atualizado para ${status}`
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Erro ao atualizar fila:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}

// Remover aluno da fila
export async function DELETE(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'id é obrigatório' }, { status: 400 })
    }

    // Buscar turma para reordenar
    const item = await pool.query(
      `SELECT turma_id, escola_id FROM fila_espera WHERE id = $1`,
      [id]
    )

    if (item.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Item não encontrado' }, { status: 404 })
    }

    // Escola só pode remover da própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && item.rows[0].escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(`DELETE FROM fila_espera WHERE id = $1`, [id])

      // Reordenar posições
      await client.query(
        `WITH ranked AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY posicao) as nova_posicao
          FROM fila_espera
          WHERE turma_id = $1 AND status = 'aguardando'
        )
        UPDATE fila_espera SET posicao = ranked.nova_posicao
        FROM ranked WHERE fila_espera.id = ranked.id`,
        [item.rows[0].turma_id]
      )

      await client.query('COMMIT')

      return NextResponse.json({ mensagem: 'Aluno removido da fila' })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

  } catch (error: any) {
    console.error('Erro ao remover da fila:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
