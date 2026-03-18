import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dispositivos-faciais/[id]
 * Detalhes de um dispositivo + logs recentes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id } = params

    const result = await pool.query(
      `SELECT d.*, e.nome AS escola_nome
       FROM dispositivos_faciais d
       INNER JOIN escolas e ON e.id = d.escola_id
       WHERE d.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    // Buscar logs recentes
    const logsResult = await pool.query(
      `SELECT evento, detalhes, criado_em
       FROM logs_dispositivos
       WHERE dispositivo_id = $1
       ORDER BY criado_em DESC
       LIMIT 50`,
      [id]
    )

    // Excluir api_key_hash da resposta
    const dispositivo = result.rows[0]
    delete dispositivo.api_key_hash

    return NextResponse.json({
      dispositivo,
      logs: logsResult.rows,
    })
  } catch (error: any) {
    console.error('Erro ao buscar dispositivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/dispositivos-faciais/[id]
 * Atualiza nome, localização ou status de um dispositivo
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id } = params
    const body = await request.json()
    const { nome, localizacao, status } = body

    // Validar status se fornecido
    if (status && !['ativo', 'inativo', 'bloqueado'].includes(status)) {
      return NextResponse.json({ mensagem: 'Status inválido' }, { status: 400 })
    }

    const sets: string[] = []
    const values: (string | null)[] = []
    let paramIndex = 1

    if (nome !== undefined) {
      sets.push(`nome = $${paramIndex}`)
      values.push(nome)
      paramIndex++
    }
    if (localizacao !== undefined) {
      sets.push(`localizacao = $${paramIndex}`)
      values.push(localizacao)
      paramIndex++
    }
    if (status !== undefined) {
      sets.push(`status = $${paramIndex}`)
      values.push(status)
      paramIndex++
    }

    if (sets.length === 0) {
      return NextResponse.json({ mensagem: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE dispositivos_faciais SET ${sets.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, nome, localizacao, status, atualizado_em`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      mensagem: 'Dispositivo atualizado',
      dispositivo: result.rows[0],
    })
  } catch (error: any) {
    console.error('Erro ao atualizar dispositivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/dispositivos-faciais/[id]
 * Desativa (bloqueia) um dispositivo
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id } = params

    const result = await pool.query(
      `UPDATE dispositivos_faciais SET status = 'bloqueado'
       WHERE id = $1
       RETURNING id, nome, status`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      mensagem: 'Dispositivo bloqueado',
      dispositivo: result.rows[0],
    })
  } catch (error: any) {
    console.error('Erro ao bloquear dispositivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
