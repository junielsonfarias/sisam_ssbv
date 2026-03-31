import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'
import { z } from 'zod'
import { validateRequest, statusDispositivoSchema } from '@/lib/schemas'
import { buscarDispositivoDetalhado, excluirDispositivo } from '@/lib/services/facial.service'
import { cacheDelPattern } from '@/lib/cache'

const dispositivoPutSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  localizacao: z.string().max(500).optional().nullable(),
  status: statusDispositivoSchema.optional(),
}).passthrough()

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

    const result = await buscarDispositivoDetalhado(id)

    if (!result) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
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
    const validationResult = await validateRequest(request, dispositivoPutSchema)
    if (!validationResult.success) return validationResult.response
    const { nome, localizacao, status } = validationResult.data

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

    try { await cacheDelPattern('dispositivos:*') } catch {}

    return NextResponse.json({
      mensagem: 'Dispositivo atualizado',
      dispositivo: result.rows[0],
    })
  } catch (error: unknown) {
    console.error('Erro ao atualizar dispositivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/dispositivos-faciais/[id]
 * Sem query param: bloqueia (soft-delete)
 * Com ?permanente=true: exclui permanentemente (só bloqueados)
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
    const { searchParams } = new URL(request.url)
    const permanente = searchParams.get('permanente') === 'true'

    if (permanente) {
      // Exclusão permanente — apenas dispositivos bloqueados
      const check = await pool.query(
        "SELECT id, status FROM dispositivos_faciais WHERE id = $1",
        [id]
      )
      if (check.rows.length === 0) {
        return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
      }
      if (check.rows[0].status !== 'bloqueado') {
        return NextResponse.json(
          { mensagem: 'Apenas dispositivos bloqueados podem ser excluídos. Bloqueie primeiro.' },
          { status: 400 }
        )
      }

      // Verificar se dispositivo pertence à escola do usuário
      if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
        const escolaCheck = await pool.query(
          'SELECT escola_id FROM dispositivos_faciais WHERE id = $1', [id]
        )
        if (escolaCheck.rows[0]?.escola_id !== usuario.escola_id) {
          return NextResponse.json({ mensagem: 'Não autorizado para este dispositivo' }, { status: 403 })
        }
      }

      await excluirDispositivo(id)

      try { await cacheDelPattern('dispositivos:*') } catch {}

      return NextResponse.json({ mensagem: 'Dispositivo excluído permanentemente' })
    }

    // Soft-delete: bloquear
    const result = await pool.query(
      `UPDATE dispositivos_faciais SET status = 'bloqueado'
       WHERE id = $1
       RETURNING id, nome, status`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    try { await cacheDelPattern('dispositivos:*') } catch {}

    return NextResponse.json({
      mensagem: 'Dispositivo bloqueado',
      dispositivo: result.rows[0],
    })
  } catch (error: unknown) {
    console.error('Erro ao processar dispositivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
