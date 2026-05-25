/**
 * Service de 2FA TOTP.
 *
 * Encapsula geração de segredo, validação de códigos TOTP, códigos de backup,
 * e a regra de obrigatoriedade por tipo de usuário.
 *
 * Biblioteca: otplib (RFC 6238 — compatível com Google Authenticator, Authy, 1Password)
 *
 * @module services/dois-fatores
 */

import crypto from 'crypto'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { is2FAGlobalmenteHabilitado } from '@/lib/services/configuracoes-sistema.service'

const log = createLogger('2FA')

// Tolerância: ±1 step (30s antes/depois do horário atual) — total de 90s de janela
const TOTP_EPOCH_TOLERANCE: [number, number] = [30, 30]

/**
 * Tipos de usuario que SAO OBRIGADOS a ativar 2FA quando a flag global esta ON.
 * Vazio = 2FA e opcional para todos (modo atual).
 * Quando o admin liga `dois_fatores_habilitado`, quem ja ativou continua sendo
 * exigido; ninguem e forcado a configurar.
 */
export const TIPOS_OBRIGATORIOS_2FA = new Set<string>()

const NUM_BACKUP_CODES = 10

export interface SetupResponse {
  /** Segredo base32 (necessário caso o usuário não consiga escanear o QR) */
  secret: string
  /** URI otpauth:// para escanear no app */
  otpauthUrl: string
  /** Data URL PNG do QR code */
  qrCodeDataUrl: string
  /** Códigos de backup em texto plano — mostrar AO USUÁRIO UMA VEZ APENAS */
  backupCodes: string[]
}

/**
 * Gera novo segredo TOTP e códigos de backup para o usuário.
 * Sobrescreve qualquer config 2FA anterior — `ativado` volta a false até verificação.
 */
export async function setup2FA(params: {
  usuarioId: string
  email: string
  appName?: string
}): Promise<SetupResponse> {
  const secret = generateSecret()
  const issuer = params.appName || 'SISAM/Educatec'
  const otpauthUrl = generateURI({ issuer, label: params.email, secret })
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

  // Gera 10 códigos de backup de 10 caracteres (5 + - + 5)
  const backupCodes = Array.from({ length: NUM_BACKUP_CODES }, () => gerarCodigoBackup())
  const backupHashes = backupCodes.map(hashCodigo)

  await pool.query(
    `INSERT INTO usuarios_2fa (usuario_id, secret, backup_codes_hashes, ativado, atualizado_em)
       VALUES ($1, $2, $3::jsonb, FALSE, NOW())
     ON CONFLICT (usuario_id) DO UPDATE
       SET secret = EXCLUDED.secret,
           backup_codes_hashes = EXCLUDED.backup_codes_hashes,
           ativado = FALSE,
           ativado_em = NULL,
           atualizado_em = NOW()`,
    [params.usuarioId, secret, JSON.stringify(backupHashes)]
  )

  log.info('Novo segredo 2FA gerado', { userId: params.usuarioId })

  return { secret, otpauthUrl, qrCodeDataUrl, backupCodes }
}

/**
 * Verifica código TOTP e ativa o 2FA do usuário (primeira ativação).
 * Use logo após o setup, quando o usuário escaneia e digita o primeiro código.
 */
export async function ativar2FA(params: {
  usuarioId: string
  codigo: string
}): Promise<{ ok: boolean; mensagem?: string }> {
  const config = await buscar2FA(params.usuarioId)
  if (!config) return { ok: false, mensagem: 'Setup 2FA não encontrado' }

  const resultado = verifySync({ token: params.codigo, secret: config.secret, epochTolerance: TOTP_EPOCH_TOLERANCE })
  if (!resultado.valid) return { ok: false, mensagem: 'Código inválido' }

  await pool.query(
    `UPDATE usuarios_2fa
       SET ativado = TRUE, ativado_em = NOW(), atualizado_em = NOW(), ultimo_uso_em = NOW()
     WHERE usuario_id = $1`,
    [params.usuarioId]
  )

  log.info('2FA ativado', { userId: params.usuarioId })
  return { ok: true }
}

/**
 * Verifica um código TOTP (login subsequente). Também aceita códigos de backup.
 */
export async function verificarCodigo2FA(params: {
  usuarioId: string
  codigo: string
}): Promise<{ ok: boolean; usouBackup: boolean }> {
  const config = await buscar2FA(params.usuarioId)
  if (!config || !config.ativado) return { ok: false, usouBackup: false }

  const codigo = params.codigo.replace(/\s/g, '').toUpperCase()

  // 1. Tenta TOTP normal
  const verifTotp = verifySync({ token: codigo, secret: config.secret, epochTolerance: TOTP_EPOCH_TOLERANCE })
  if (verifTotp.valid) {
    await pool.query(`UPDATE usuarios_2fa SET ultimo_uso_em = NOW() WHERE usuario_id = $1`, [params.usuarioId])
    return { ok: true, usouBackup: false }
  }

  // 2. Tenta códigos de backup
  const hashesAtuais: string[] = Array.isArray(config.backup_codes_hashes) ? config.backup_codes_hashes : []
  const hashTentativa = hashCodigo(codigo)
  const idx = hashesAtuais.indexOf(hashTentativa)

  if (idx >= 0) {
    // Remove o código usado (one-time use)
    const novos = [...hashesAtuais.slice(0, idx), ...hashesAtuais.slice(idx + 1)]
    await pool.query(
      `UPDATE usuarios_2fa
         SET backup_codes_hashes = $1::jsonb,
             ultimo_uso_em = NOW()
       WHERE usuario_id = $2`,
      [JSON.stringify(novos), params.usuarioId]
    )
    log.warn('Código de backup 2FA usado', { userId: params.usuarioId, data: { restantes: novos.length } })
    return { ok: true, usouBackup: true }
  }

  return { ok: false, usouBackup: false }
}

/**
 * Desativa 2FA — só usar após verificação de senha + código atual.
 * Bloqueia desativação para tipos obrigatórios.
 */
export async function desativar2FA(params: {
  usuarioId: string
  tipoUsuario: string
}): Promise<{ ok: boolean; mensagem?: string }> {
  if (TIPOS_OBRIGATORIOS_2FA.has(params.tipoUsuario)) {
    return {
      ok: false,
      mensagem: '2FA é obrigatório para este perfil e não pode ser desativado.',
    }
  }

  await pool.query(`DELETE FROM usuarios_2fa WHERE usuario_id = $1`, [params.usuarioId])
  log.info('2FA desativado', { userId: params.usuarioId })
  return { ok: true }
}

/**
 * Status do 2FA: configurado e ativado? Quantos códigos de backup restam?
 */
export async function status2FA(usuarioId: string): Promise<{
  configurado: boolean
  ativado: boolean
  backupCodesRestantes: number
  ultimoUsoEm: Date | null
}> {
  const config = await buscar2FA(usuarioId)
  if (!config) {
    return { configurado: false, ativado: false, backupCodesRestantes: 0, ultimoUsoEm: null }
  }

  const hashes: string[] = Array.isArray(config.backup_codes_hashes) ? config.backup_codes_hashes : []
  return {
    configurado: true,
    ativado: !!config.ativado,
    backupCodesRestantes: hashes.length,
    ultimoUsoEm: config.ultimo_uso_em ? new Date(config.ultimo_uso_em) : null,
  }
}

/**
 * Indica se o usuario PRECISA passar pelo 2FA (configurado E ativado)
 * para fazer login.
 *
 * Respeita a flag global `dois_fatores_habilitado`: quando OFF, retorna false
 * mesmo para usuarios que ativaram (modo dev/manutencao).
 */
export async function precisaDe2FANoLogin(usuarioId: string): Promise<boolean> {
  const habilitadoGlobal = await is2FAGlobalmenteHabilitado()
  if (!habilitadoGlobal) return false
  const s = await status2FA(usuarioId)
  return s.ativado
}

/**
 * Indica se o tipo de usuario e obrigado a ativar 2FA.
 * Respeita a flag global: se 2FA esta desabilitado globalmente, nenhum tipo e obrigado.
 */
export async function tipoExige2FA(tipo: string): Promise<boolean> {
  if (!TIPOS_OBRIGATORIOS_2FA.has(tipo.toLowerCase())) return false
  return await is2FAGlobalmenteHabilitado()
}

// ============================================================================
// HELPERS
// ============================================================================

async function buscar2FA(usuarioId: string) {
  const result = await pool.query(
    `SELECT secret, backup_codes_hashes, ativado, ativado_em, ultimo_uso_em
       FROM usuarios_2fa
      WHERE usuario_id = $1
      LIMIT 1`,
    [usuarioId]
  )
  return result.rows[0] || null
}

function gerarCodigoBackup(): string {
  // 10 chars alfanuméricos sem caracteres ambíguos (0,O,1,I,l)
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.randomBytes(10)
  let out = ''
  for (let i = 0; i < 10; i++) {
    out += alfabeto[bytes[i] % alfabeto.length]
    if (i === 4) out += '-'
  }
  return out
}

function hashCodigo(codigo: string): string {
  return crypto.createHash('sha256').update(codigo.toUpperCase()).digest('hex')
}
