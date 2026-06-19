import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dispositivos-faciais/[id]/qrcode
 * Retorna os dados de configuração (URL, IDs, escola) para o QR Code.
 *
 * GET é idempotente: NÃO regenera nem invalida a API key (isso era um efeito
 * colateral perigoso — prefetch/crawler/replay derrubava o dispositivo, e a
 * chave nova sequer era exibida). Para gerar/rotacionar a chave, use o endpoint
 * dedicado POST /regenerar-chave.
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
      dispositivo: {
        id: dispositivo.id,
        nome: dispositivo.nome,
        escola_nome: dispositivo.escola_nome,
      },
      aviso: 'Estes dados não contêm a API key. Para obter/rotacionar a chave do dispositivo, use "Regenerar chave".',
    })
  } catch (error: unknown) {
    console.error('Erro ao gerar QR code:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
