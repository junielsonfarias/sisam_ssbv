/**
 * Autenticação de Dispositivos de Reconhecimento Facial
 *
 * Fornece autenticação via API key para dispositivos (totens/câmeras)
 * que registram frequência por reconhecimento facial.
 *
 * Diferente da autenticação JWT de usuários, dispositivos usam
 * Bearer token com API key hasheada via bcrypt.
 *
 * @module lib/device-auth
 */

import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import pool from '@/database/connection'
import { FACIAL } from './constants'

// ============================================================================
// TIPOS
// ============================================================================

export interface DispositivoAutenticado {
  id: string
  escola_id: string
  nome: string
  localizacao: string | null
  status: string
}

export interface ApiKeyGerada {
  apiKey: string
  apiKeyHash: string
  apiKeyPrefix: string
}

// ============================================================================
// GERAÇÃO DE API KEY
// ============================================================================

/**
 * Gera uma nova API key para um dispositivo
 *
 * Formato: sisam_dev_ + 32 caracteres hexadecimais
 * Retorna a chave em texto, o hash bcrypt e o prefixo para busca rápida
 *
 * @returns Objeto com apiKey (texto), apiKeyHash (bcrypt) e apiKeyPrefix (8 chars)
 */
export async function generateApiKey(): Promise<ApiKeyGerada> {
  const randomPart = crypto.randomBytes(16).toString('hex')
  const apiKey = `${FACIAL.API_KEY_PREFIX}${randomPart}`
  const apiKeyHash = await bcrypt.hash(apiKey, 10)
  const apiKeyPrefix = apiKey.substring(0, 8)

  return { apiKey, apiKeyHash, apiKeyPrefix }
}

/**
 * Gera hash bcrypt de uma API key
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10)
}

// ============================================================================
// VALIDAÇÃO DE DISPOSITIVO
// ============================================================================

/**
 * Valida a API key de um dispositivo a partir da requisição
 *
 * Extrai o Bearer token do header Authorization, busca o dispositivo
 * pelo prefixo da chave e valida via bcrypt.compare.
 *
 * @param request - Objeto NextRequest da requisição
 * @returns Dados do dispositivo autenticado ou null se inválido
 */
export async function validateDeviceApiKey(
  request: NextRequest
): Promise<DispositivoAutenticado | null> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const apiKey = authHeader.substring(7)

  if (!apiKey || apiKey.length < 10) {
    return null
  }

  const prefix = apiKey.substring(0, 8)

  try {
    const result = await pool.query(
      `SELECT id, escola_id, nome, localizacao, status, api_key_hash
       FROM dispositivos_faciais
       WHERE api_key_prefix = $1 AND status = 'ativo'`,
      [prefix]
    )

    if (result.rows.length === 0) {
      return null
    }

    // Pode haver múltiplos dispositivos com mesmo prefixo (improvável mas possível)
    for (const row of result.rows) {
      const match = await bcrypt.compare(apiKey, row.api_key_hash)
      if (match) {
        return {
          id: row.id,
          escola_id: row.escola_id,
          nome: row.nome,
          localizacao: row.localizacao,
          status: row.status,
        }
      }
    }

    return null
  } catch (error: any) {
    console.error('Erro ao validar API key do dispositivo:', {
      code: error?.code,
      message: error?.message,
    })
    return null
  }
}
