import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { generateApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dispositivos-faciais/[id]/qrcode
 * Gera dados para QR Code de configuração rápida do dispositivo
 * Regenera a API key e retorna dados para o QR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { id } = params

    // Buscar dispositivo
    const result = await pool.query(
      `SELECT d.id, d.nome, d.escola_id, d.localizacao,
              e.nome AS escola_nome
       FROM dispositivos_faciais d
       INNER JOIN escolas e ON e.id = d.escola_id
       WHERE d.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Dispositivo não encontrado' }, { status: 404 })
    }

    const dispositivo = result.rows[0]

    // Gerar nova API key para o QR
    const { apiKey, apiKeyHash, apiKeyPrefix } = await generateApiKey()

    await pool.query(
      `UPDATE dispositivos_faciais SET api_key_hash = $1, api_key_prefix = $2 WHERE id = $3`,
      [apiKeyHash, apiKeyPrefix, id]
    )

    // URL segura via variável de ambiente (evita host header injection)
    const sisamUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

    // Dados para o QR Code — API key retornada separadamente, NÃO no QR
    const qrData = {
      sisam_url: sisamUrl,
      dispositivo_id: dispositivo.id,
      escola_id: dispositivo.escola_id,
      escola_nome: dispositivo.escola_nome,
      nome: dispositivo.nome,
    }

    // Log
    await pool.query(
      `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
       VALUES ($1, 'qrcode_gerado', $2)`,
      [id, JSON.stringify({ por: usuario.id })]
    )

    return NextResponse.json({
      qr_data: JSON.stringify(qrData),
      api_key: apiKey,
      dispositivo: {
        id: dispositivo.id,
        nome: dispositivo.nome,
        escola_nome: dispositivo.escola_nome,
      },
      aviso: 'Uma nova API key foi gerada. A chave anterior foi invalidada.',
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar QR code:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
