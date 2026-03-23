import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { dispositivoFacialSchema } from '@/lib/schemas'
import { generateApiKey } from '@/lib/device-auth'
import { buildAccessControl } from '@/lib/api-utils'
import pool from '@/database/connection'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dispositivos-faciais
 * Lista dispositivos de reconhecimento facial
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico', 'escola'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const escolaId = searchParams.get('escola_id')

    let query = `
      SELECT d.id, d.nome, d.localizacao, d.status, d.ultimo_ping,
             d.metadata, d.criado_em, d.atualizado_em, d.api_key_prefix,
             e.nome AS escola_nome
      FROM dispositivos_faciais d
      INNER JOIN escolas e ON e.id = d.escola_id
      WHERE 1=1
    `
    const params: (string | number)[] = []
    let paramIndex = 1

    // Filtro por escola específica
    if (escolaId) {
      query += ` AND d.escola_id = $${paramIndex}`
      params.push(escolaId)
      paramIndex++
    }

    // Controle de acesso por tipo de usuário
    const acesso = buildAccessControl(usuario, paramIndex, {
      escolaAlias: 'e',
      escolaIdField: 'id',
    })

    if (acesso.conditions.length > 0) {
      // Adaptar para filtrar por d.escola_id
      if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
        query += ` AND d.escola_id = $${paramIndex}`
        params.push(usuario.escola_id)
      } else if (usuario.tipo_usuario === 'polo' && usuario.polo_id) {
        query += ` AND e.polo_id = $${paramIndex}`
        params.push(usuario.polo_id)
      }
    }

    query += ` ORDER BY d.criado_em DESC`

    const result = await pool.query(query, params)

    return NextResponse.json({ dispositivos: result.rows })
  } catch (error: unknown) {
    console.error('Erro ao listar dispositivos:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST /api/admin/dispositivos-faciais
 * Registra um novo dispositivo. Retorna a API key em texto UMA VEZ.
 */
export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)
    if (!usuario || !verificarPermissao(usuario, ['administrador', 'tecnico'])) {
      return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
    }

    const validacao = await validateRequest(request, dispositivoFacialSchema)
    if (!validacao.success) return validacao.response

    const { nome, escola_id, localizacao } = validacao.data

    // Verificar se escola existe
    const escolaResult = await pool.query(
      'SELECT id, nome FROM escolas WHERE id = $1 AND ativo = true',
      [escola_id]
    )
    if (escolaResult.rows.length === 0) {
      return NextResponse.json({ mensagem: 'Escola não encontrada' }, { status: 404 })
    }

    // Gerar API key
    const { apiKey, apiKeyHash, apiKeyPrefix } = await generateApiKey()

    // Inserir dispositivo
    const result = await pool.query(
      `INSERT INTO dispositivos_faciais (nome, escola_id, localizacao, api_key_hash, api_key_prefix)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, localizacao, status, criado_em`,
      [nome, escola_id, localizacao || null, apiKeyHash, apiKeyPrefix]
    )

    // API key é retornada apenas na criação — mascarar parcialmente no log
    console.log(`Dispositivo facial criado: ${result.rows[0].id}, key prefix: ${apiKeyPrefix}`)
    return NextResponse.json({
      mensagem: 'Dispositivo registrado com sucesso',
      dispositivo: result.rows[0],
      escola: escolaResult.rows[0],
      api_key: apiKey,
      aviso: 'IMPORTANTE: Guarde esta API key em local seguro. Ela não será exibida novamente.',
    }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (error: unknown) {
    console.error('Erro ao registrar dispositivo:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
