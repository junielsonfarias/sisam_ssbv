import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { generateApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/dispositivos-faciais/auto-registro
 * Auto-registra o terminal web como dispositivo
 * O terminal se registra automaticamente ao iniciar
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { escola_id, nome, localizacao, tipo_dispositivo } = body

    if (!escola_id || !nome) {
      return NextResponse.json({ mensagem: 'escola_id e nome são obrigatórios' }, { status: 400 })
    }

    // Verificar permissão de escola: só pode registrar para sua própria escola
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id !== escola_id) {
      return NextResponse.json({ mensagem: 'Não autorizado para esta escola' }, { status: 403 })
    }

    // Validar tipo_dispositivo
    const tiposValidos = ['terminal_web', 'kiosk', 'totem', 'tablet']
    const tipo = tiposValidos.includes(tipo_dispositivo || '') ? tipo_dispositivo : 'terminal_web'

    // Upsert atômico — evita race condition de registros simultâneos
    const { apiKey, apiKeyHash, apiKeyPrefix } = await generateApiKey()

    const result = await pool.query(
      `INSERT INTO dispositivos_faciais
        (nome, escola_id, localizacao, api_key_hash, api_key_prefix, ultimo_ping, metadata)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
       ON CONFLICT ON CONSTRAINT dispositivos_faciais_escola_id_nome_key DO UPDATE SET
        ultimo_ping = CURRENT_TIMESTAMP,
        metadata = jsonb_build_object('tipo', $7::text, 'localizacao', $3::text, 'auto_registro', true)
       RETURNING id, (xmax = 0) AS is_new`,
      [
        nome,
        escola_id,
        localizacao || null,
        apiKeyHash,
        apiKeyPrefix,
        JSON.stringify({ tipo, auto_registro: true }),
        tipo,
      ]
    )

    const row = result.rows[0]
    const isNew = row.is_new

    return NextResponse.json({
      dispositivo_id: row.id,
      ja_existia: !isNew,
      api_key: isNew ? apiKey : undefined,
      mensagem: isNew ? 'Terminal registrado automaticamente' : 'Terminal já registrado',
    }, { status: isNew ? 201 : 200 })
  } catch (error: unknown) {
    console.error('Erro no auto-registro:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
