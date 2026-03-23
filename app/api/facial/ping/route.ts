import { NextRequest, NextResponse } from 'next/server'
import { validateDeviceApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/facial/ping
 * Heartbeat do dispositivo — atualiza ultimo_ping e metadata
 */
export async function POST(request: NextRequest) {
  try {
    // Autenticar dispositivo
    const dispositivo = await validateDeviceApiKey(request)
    if (!dispositivo) {
      return NextResponse.json(
        { mensagem: 'API key inválida ou dispositivo inativo' },
        { status: 401 }
      )
    }

    // Ler metadata opcional do body (com validação de tamanho)
    let metadata: Record<string, unknown> = {}
    try {
      const body = await request.json()
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const json = JSON.stringify(body)
        // Limitar tamanho do metadata a 10KB para evitar bloat
        if (json.length <= 10240) {
          metadata = body as Record<string, unknown>
        }
      }
    } catch {
      // Body vazio é aceitável para ping
    }

    // Atualizar ultimo_ping e metadata
    await pool.query(
      `UPDATE dispositivos_faciais
       SET ultimo_ping = CURRENT_TIMESTAMP,
           metadata = $2::jsonb
       WHERE id = $1`,
      [dispositivo.id, JSON.stringify(metadata)]
    )

    // Log de ping (com frequência reduzida — apenas 1 em cada 10)
    const shouldLog = Math.random() < 0.1
    if (shouldLog) {
      await pool.query(
        `INSERT INTO logs_dispositivos (dispositivo_id, evento, detalhes)
         VALUES ($1, 'ping', $2)`,
        [dispositivo.id, JSON.stringify(metadata)]
      )
    }

    return NextResponse.json({
      sucesso: true,
      servidor_timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('Erro no ping do dispositivo:', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
