import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validateRequest } from '@/lib/schemas'
import { dispositivoFacialSchema } from '@/lib/schemas'
import { generateApiKey } from '@/lib/device-auth'
import pool from '@/database/connection'
import { buscarDispositivos } from '@/lib/services/facial.service'

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

    const escolaId = request.nextUrl.searchParams.get('escola_id')

    const dispositivos = await buscarDispositivos({
      escolaId,
      usuario,
    })

    return NextResponse.json({ dispositivos })
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
