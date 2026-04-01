/**
 * Módulo de criptografia para dados sensíveis (CPF, etc.)
 * Usa AES-256-GCM para criptografia autenticada.
 *
 * A chave de criptografia DEVE vir de variável de ambiente ENCRYPTION_KEY.
 * Formato: string hexadecimal de 64 caracteres (32 bytes).
 *
 * Para gerar uma chave segura:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * @module lib/crypto
 */

import crypto from 'crypto'

const ALGORITMO = 'aes-256-gcm'
const IV_TAMANHO = 12 // 96 bits — recomendado para GCM
const TAG_TAMANHO = 16 // 128 bits — padrão GCM

/**
 * Obtém a chave de criptografia do ambiente.
 * Lança erro se não estiver configurada ou for inválida.
 */
function obterChave(): Buffer {
  const chaveHex = process.env.ENCRYPTION_KEY
  if (!chaveHex) {
    throw new Error('ENCRYPTION_KEY não configurada. Defina no .env com 64 caracteres hex (32 bytes).')
  }
  if (chaveHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (32 bytes).')
  }
  return Buffer.from(chaveHex, 'hex')
}

/**
 * Criptografa um CPF (ou qualquer string curta) usando AES-256-GCM.
 *
 * @param cpf - CPF em texto plano (com ou sem formatação)
 * @returns String base64 no formato: iv:tag:ciphertext (separados por ':')
 *
 * @example
 * const cifrado = encryptCPF('123.456.789-00')
 * // Retorna algo como "YWJjZGVm...:Z2hpams...:bG1ub3Bx..."
 */
export function encryptCPF(cpf: string): string {
  const chave = obterChave()
  const iv = crypto.randomBytes(IV_TAMANHO)

  const cipher = crypto.createCipheriv(ALGORITMO, chave, iv)
  const cifrado = Buffer.concat([cipher.update(cpf, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Formato: base64(iv):base64(tag):base64(ciphertext)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${cifrado.toString('base64')}`
}

/**
 * Descriptografa um CPF criptografado com encryptCPF.
 *
 * @param dados - String no formato base64 "iv:tag:ciphertext"
 * @returns CPF em texto plano
 * @throws Error se os dados estiverem corrompidos ou a chave for diferente
 *
 * @example
 * const cpf = decryptCPF(dadosCifrados)
 * // Retorna "123.456.789-00"
 */
export function decryptCPF(dados: string): string {
  const chave = obterChave()
  const partes = dados.split(':')

  if (partes.length !== 3) {
    throw new Error('Formato de dados criptografados inválido. Esperado: iv:tag:ciphertext')
  }

  const [ivB64, tagB64, cifradoB64] = partes
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const cifrado = Buffer.from(cifradoB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITMO, chave, iv)
  decipher.setAuthTag(tag)

  const texto = Buffer.concat([decipher.update(cifrado), decipher.final()])
  return texto.toString('utf8')
}

/**
 * Verifica se uma string parece ser um CPF criptografado (formato iv:tag:ciphertext base64).
 * Útil para migração gradual de dados já existentes.
 */
export function isCPFCriptografado(valor: string): boolean {
  if (!valor) return false
  const partes = valor.split(':')
  if (partes.length !== 3) return false
  // Verificar se todas as partes são base64 válido
  try {
    for (const parte of partes) {
      Buffer.from(parte, 'base64')
    }
    return true
  } catch {
    return false
  }
}

/**
 * Descriptografa CPF se estiver criptografado, senão retorna como está.
 * Útil durante período de migração onde dados antigos ainda estão em texto plano.
 */
export function decryptCPFSeguro(valor: string): string {
  if (!valor) return valor
  if (isCPFCriptografado(valor)) {
    try {
      return decryptCPF(valor)
    } catch {
      // Se falhar a descriptografia, retornar valor original
      return valor
    }
  }
  return valor
}
