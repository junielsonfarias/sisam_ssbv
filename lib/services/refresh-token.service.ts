/**
 * Refresh-token service (V8 ideal — 2026-05-31).
 *
 * Modelo:
 * - Access JWT vive 15min (cookie httpOnly path=/).
 * - Refresh JWT vive 7 dias (cookie httpOnly path=/api/auth — só vai no
 *   endpoint de refresh/logout).
 * - Rotação a cada uso: gerar novo refresh, marcar antigo como usado.
 * - Detecção de reuso: se um refresh já usado (used_at != NULL) for
 *   tentado de novo, revogar TODA a familia (sinal de roubo).
 *
 * Tokens brutos NUNCA persistem — armazena apenas SHA-256 + jti.
 */

import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('RefreshToken')

const JWT_SECRET = process.env.JWT_SECRET || ''
const REFRESH_TTL_SEGUNDOS = 7 * 24 * 60 * 60

interface RefreshPayload {
  scope: 'refresh'
  userId: string
  jti: string
  fam: string
}

interface CriarRefreshParams {
  usuarioId: string
  familyId?: string
  parentJti?: string
  ipAddress?: string
  userAgent?: string
}

export interface NovoRefreshToken {
  token: string
  jti: string
  familyId: string
  expiresAt: Date
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function gerarJti(): string {
  return crypto.randomUUID()
}

export async function criarRefreshToken(params: CriarRefreshParams): Promise<NovoRefreshToken> {
  if (!JWT_SECRET) throw new Error('JWT_SECRET nao configurado')

  const jti = gerarJti()
  const familyId = params.familyId ?? crypto.randomUUID()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SEGUNDOS * 1000)

  const payload: RefreshPayload = {
    scope: 'refresh',
    userId: params.usuarioId,
    jti,
    fam: familyId,
  }
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TTL_SEGUNDOS })

  await pool.query(
    `INSERT INTO refresh_tokens (jti, usuario_id, token_hash, family_id, parent_jti, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      jti,
      params.usuarioId,
      hashToken(token),
      familyId,
      params.parentJti ?? null,
      expiresAt,
      params.ipAddress ?? null,
      params.userAgent ?? null,
    ]
  )

  return { token, jti, familyId, expiresAt }
}

export interface RefreshValido {
  jti: string
  familyId: string
  usuarioId: string
}

/**
 * Valida e rotaciona um refresh-token.
 * - Verifica assinatura JWT.
 * - Verifica que existe no banco, nao foi revogado, nao expirou.
 * - Se ja foi usado: REUSO DETECTADO → revoga familia inteira, retorna null.
 * - Se ok: marca como usado e retorna dados para emitir novo par.
 */
export async function validarERotacionar(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ antigo: RefreshValido; novo: NovoRefreshToken } | null> {
  if (!JWT_SECRET) return null

  let payload: RefreshPayload
  try {
    payload = jwt.verify(token, JWT_SECRET) as RefreshPayload
  } catch {
    return null
  }
  if (payload.scope !== 'refresh') return null

  const tokenHash = hashToken(token)

  // Buscar registro
  const result = await pool.query(
    `SELECT jti, usuario_id, family_id, token_hash, used_at, revoked_at, expires_at
       FROM refresh_tokens
      WHERE jti = $1
      LIMIT 1`,
    [payload.jti]
  )
  if (result.rows.length === 0) {
    log.warn(`Refresh com jti desconhecido | jti:${payload.jti.slice(0, 8)}`)
    return null
  }
  const row = result.rows[0]

  // Token hash precisa bater (defesa contra forja com JWT_SECRET vazado)
  if (row.token_hash !== tokenHash) {
    log.warn(`Hash do refresh diverge | jti:${row.jti.slice(0, 8)}`)
    await revogarFamilia(row.family_id, 'reuse_detected')
    return null
  }

  if (row.revoked_at) {
    log.warn(`Refresh ja revogado | jti:${row.jti.slice(0, 8)}`)
    return null
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return null
  }

  // REUSO DETECTADO — refresh ja foi usado uma vez. Sinal de roubo.
  if (row.used_at) {
    log.error(`REUSO de refresh-token detectado | jti:${row.jti.slice(0, 8)} | usuario:${row.usuario_id} — revogando familia`)
    await revogarFamilia(row.family_id, 'reuse_detected')
    return null
  }

  // Marcar como usado (transacao garante atomicidade com criacao do novo)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const updateResult = await client.query(
      `UPDATE refresh_tokens
          SET used_at = NOW(), revoked_at = NOW(), revoked_reason = 'used_rotation'
        WHERE jti = $1 AND used_at IS NULL
        RETURNING jti`,
      [row.jti]
    )
    // Se a UPDATE nao afetou 1 linha, outra requisicao ganhou a corrida.
    if (updateResult.rowCount === 0) {
      await client.query('ROLLBACK')
      log.warn(`Corrida em refresh-token | jti:${row.jti.slice(0, 8)} — outro request ja consumiu`)
      return null
    }

    // Criar novo
    const jtiNovo = gerarJti()
    const expiresAtNovo = new Date(Date.now() + REFRESH_TTL_SEGUNDOS * 1000)
    const novoPayload: RefreshPayload = {
      scope: 'refresh',
      userId: row.usuario_id,
      jti: jtiNovo,
      fam: row.family_id,
    }
    const tokenNovo = jwt.sign(novoPayload, JWT_SECRET, { expiresIn: REFRESH_TTL_SEGUNDOS })

    await client.query(
      `INSERT INTO refresh_tokens (jti, usuario_id, token_hash, family_id, parent_jti, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        jtiNovo,
        row.usuario_id,
        hashToken(tokenNovo),
        row.family_id,
        row.jti,
        expiresAtNovo,
        ipAddress ?? null,
        userAgent ?? null,
      ]
    )

    await client.query('COMMIT')

    return {
      antigo: { jti: row.jti, familyId: row.family_id, usuarioId: row.usuario_id },
      novo: { token: tokenNovo, jti: jtiNovo, familyId: row.family_id, expiresAt: expiresAtNovo },
    }
  } catch (err) {
    await client.query('ROLLBACK')
    log.error('Erro ao rotacionar refresh-token', err)
    return null
  } finally {
    client.release()
  }
}

export async function revogarRefreshToken(token: string, motivo: 'logout' | 'admin_revoke' = 'logout'): Promise<void> {
  if (!JWT_SECRET) return
  let payload: RefreshPayload
  try {
    payload = jwt.verify(token, JWT_SECRET) as RefreshPayload
  } catch {
    return
  }
  if (payload.scope !== 'refresh') return

  await pool.query(
    `UPDATE refresh_tokens
        SET revoked_at = NOW(), revoked_reason = $2
      WHERE jti = $1 AND revoked_at IS NULL`,
    [payload.jti, motivo]
  )
}

export async function revogarFamilia(familyId: string, motivo: 'reuse_detected' | 'password_changed' | 'admin_revoke'): Promise<void> {
  await pool.query(
    `UPDATE refresh_tokens
        SET revoked_at = NOW(), revoked_reason = $2
      WHERE family_id = $1 AND revoked_at IS NULL`,
    [familyId, motivo]
  )
}

export async function revogarTodosDoUsuario(usuarioId: string, motivo: 'password_changed' | 'admin_revoke'): Promise<void> {
  await pool.query(
    `UPDATE refresh_tokens
        SET revoked_at = NOW(), revoked_reason = $2
      WHERE usuario_id = $1 AND revoked_at IS NULL`,
    [usuarioId, motivo]
  )
}

export const REFRESH_TOKEN_COOKIE = 'refresh_token'
export const REFRESH_COOKIE_MAX_AGE = REFRESH_TTL_SEGUNDOS
export const REFRESH_COOKIE_PATH = '/api/auth'
