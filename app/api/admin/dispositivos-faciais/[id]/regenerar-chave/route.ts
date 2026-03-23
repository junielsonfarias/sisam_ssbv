import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { generateApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/dispositivos-faciais/[id]/regenerar-chave
 * Regenera a API key de um dispositivo (invalida a anterior imediatamente)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id } = params

    // Verificar se dispositivo existe
    const check = await pool.query(
      'SELECT id, nome FROM dispositivos_faciais WHERE id = $1',
      [id]
    )
    if (check.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    // Gerar nova API key
    const { apiKey, apiKeyHash, apiKeyPrefix } = await generateApiKey()

    // Atualizar no banco
    await pool.query(
      `UPDATE dispositivos_faciais
       SET api_key_hash = $1, api_key_prefix = $2
       WHERE id = $3`,
      [apiKeyHash, apiKeyPrefix, id]
    )

    // Log
    await pool.query(
      `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
       VALUES ($1, 'chave_regenerada', $2)`,
      [id, JSON.stringify({ por: usuario.id, nome_usuario: usuario.nome })]
    )

    return NextResponse.json({
      mensagem: 'API key regenerada com sucesso',
      dispositivo: check.rows[0],
      api_key: apiKey,
      aviso: 'IMPORTANTE: Guarde esta API key. A chave anterior foi invalidada.',
    })
  } catch (error: unknown) {
    console.error('Erro ao regenerar chave:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
