import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import pool from '@/database/connection'
import { parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, filaEsperaPostSchema, filaEsperaPutSchema } from '@/lib/schemas'
import { buscarFilaEspera, adicionarNaFila, atualizarStatusFila, removerDaFila } from '@/lib/services/vagas.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('ControleVagasFila')

export const dynamic = 'force-dynamic'

// Listar fila de espera
export const GET = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const { turma_id, escola_id, status } = parseSearchParams(searchParams, ['turma_id', 'escola_id', 'status'])

    const filtroEscola = usuario.tipo_usuario === 'escola' ? usuario.escola_id : escola_id

    const result = await buscarFilaEspera({
      turmaId: turma_id,
      escolaId: filtroEscola,
      poloId: usuario.tipo_usuario === 'polo' ? usuario.polo_id : undefined,
      status,
    })

    return NextResponse.json(result)

  } catch (error: unknown) {
    log.error('Erro ao buscar fila de espera', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

// Adicionar aluno à fila
export const POST = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, filaEsperaPostSchema)
    if (!validacao.success) return validacao.response
    const { aluno_id, turma_id, escola_id, observacao } = validacao.data

    // Escola só pode operar na própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id && escola_id !== usuario.escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    const result = await adicionarNaFila({
      alunoId: aluno_id,
      turmaId: turma_id,
      escolaId: escola_id,
      observacao,
    })

    return NextResponse.json({
      mensagem: `Aluno adicionado à fila na posição ${result.posicao}`,
      id: result.id,
      posicao: result.posicao
    }, { status: 201 })

  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes('já está na fila')) {
        return NextResponse.json({ mensagem: 'Aluno já está na fila de espera' }, { status: 400 })
      }
      if (error.message.includes('já está matriculado')) {
        return NextResponse.json({ mensagem: 'Aluno já está matriculado nesta turma' }, { status: 400 })
      }
    }
    log.error('Erro ao adicionar à fila', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

// Atualizar status na fila (convocar, matricular, desistência)
export const PUT = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const validacao = await validateRequest(request, filaEsperaPutSchema)
    if (!validacao.success) return validacao.response
    const { id, status, observacao } = validacao.data

    const result = await atualizarStatusFila(id, status, observacao)

    return NextResponse.json(result)

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({ mensagem: 'Registro não encontrado na fila' }, { status: 404 })
    }
    log.error('Erro ao atualizar fila', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})

// Remover aluno da fila
export const DELETE = withAuth(['administrador', 'tecnico', 'escola'], async (request, usuario) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ mensagem: 'id é obrigatório' }, { status: 400 })
    }

    // Buscar escola_id para validação de acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      const item = await pool.query(
        `SELECT escola_id FROM fila_espera WHERE id = $1`,
        [id]
      )
      if (item.rows.length > 0 && item.rows[0].escola_id !== usuario.escola_id) {
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
      }
    }

    await removerDaFila(id)

    return new NextResponse(null, { status: 204 })

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({ mensagem: 'Registro não encontrado na fila' }, { status: 404 })
    }
    log.error('Erro ao remover da fila', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
})
