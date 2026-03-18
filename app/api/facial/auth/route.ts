import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/facial/auth
 * Autentica um dispositivo via API key e retorna info do dispositivo + escola
 */
export async function POST(request: NextRequest) {
  try {
    const dispositivo = await validateDeviceApiKey(request)

    if (!dispositivo) {
      return NextResponse.json(
        { mensagem: 'API key inválida ou dispositivo inativo' },
        { status: 401 }
      )
    }

    // Buscar dados da escola
    const escolaResult = await pool.query(
      'SELECT id, nome, codigo FROM escolas WHERE id = $1 AND ativo = true',
      [dispositivo.escola_id]
    )

    if (escolaResult.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Escola vinculada ao dispositivo não encontrada ou inativa' },
        { status: 404 }
      )
    }

    // Registrar log de autenticação
    await pool.query(
      `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
       VALUES ($1, 'auth', $2)`,
      [dispositivo.id, JSON.stringify({ ip: request.headers.get('x-forwarded-for') || 'unknown' })]
    )

    return NextResponse.json({
      dispositivo: {
        id: dispositivo.id,
        nome: dispositivo.nome,
        localizacao: dispositivo.localizacao,
      },
      escola: escolaResult.rows[0],
      servidor_timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Erro na autenticação do dispositivo:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
