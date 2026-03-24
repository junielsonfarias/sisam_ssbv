import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { parseSearchParams } from '@/lib/api-helpers'
import { validateRequest, filaEsperaPostSchema, filaEsperaPutSchema } from '@/lib/schemas'
import { buscarFilaEspera, adicionarNaFila, atualizarStatusFila, removerDaFila } from '@/lib/services/vagas.service'

export const dynamic = 'force-dynamic'

// Listar fila de espera
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

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
    if (error instanceof Error && (error.message.includes('já está na fila') || error.message.includes('já está matriculado'))) {
      return NextResponse.json({ mensagem: error.message }, { status: 400 })
    }
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

    const validacao = await validateRequest(request, filaEsperaPutSchema)
    if (!validacao.success) return validacao.response
    const { id, status, observacao } = validacao.data

    const result = await atualizarStatusFila(id, status, observacao)

    return NextResponse.json(result)

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({ mensagem: error.message }, { status: 404 })
    }
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

    // Buscar escola_id para validação de acesso
    // removerDaFila já valida existência, mas precisamos checar acesso da escola
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

    return NextResponse.json({ mensagem: 'Aluno removido da fila' })

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('não encontrado')) {
      return NextResponse.json({ mensagem: error.message }, { status: 404 })
    }
    console.error('Erro ao remover da fila:', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
