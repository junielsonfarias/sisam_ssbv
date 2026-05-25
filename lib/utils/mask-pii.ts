/**
 * Mascaramento de dados pessoalmente identificáveis (PII) para logs.
 *
 * LGPD Art. 6º, VII (princípio da segurança): adotar medidas técnicas aptas
 * a proteger dados pessoais de acessos não autorizados, vazamento ou
 * compartilhamento indevido — incluindo em logs.
 *
 * **Não use estas funções para mascarar dados no banco.** O banco precisa
 * dos dados completos para investigação legítima. Use apenas em:
 *  - `console.log` / logger estruturado
 *  - Sentry / APM externo
 *  - Auditoria que sai para fora da rede interna
 *
 * @module lib/utils/mask-pii
 */

/** Máscara para CPF. Mantém os 3 dígitos do meio: `***.***.123-**` */
export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return ''
  const digits = String(cpf).replace(/\D/g, '')
  if (digits.length !== 11) return '***'
  return `***.***.${digits.slice(6, 9)}-**`
}

/** Máscara para CNPJ. Mantém últimos 2 dígitos. */
export function maskCnpj(cnpj: string | null | undefined): string {
  if (!cnpj) return ''
  const digits = String(cnpj).replace(/\D/g, '')
  if (digits.length !== 14) return '***'
  return `**.***.***/****-${digits.slice(12, 14)}`
}

/** Máscara para email. Mantém 1ª letra: `j***@gmail.com` */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const str = String(email).trim()
  const at = str.indexOf('@')
  if (at < 0) return '***'
  const local = str.slice(0, at)
  const domain = str.slice(at + 1)
  if (local.length === 0) return `***@${domain}`
  if (local.length === 1) return `${local}***@${domain}`
  return `${local.charAt(0)}***@${domain}`
}

/** Máscara para telefone. Mantém DDD + últimos 4: `(91) ****-1234` */
export function maskTelefone(tel: string | null | undefined): string {
  if (!tel) return ''
  const digits = String(tel).replace(/\D/g, '')
  if (digits.length < 8) return '****'
  const last4 = digits.slice(-4)
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2)
    return `(${ddd}) ****-${last4}`
  }
  return `****-${last4}`
}

/** Máscara para PIS/NIS. `***.****.***-12` */
export function maskPis(pis: string | null | undefined): string {
  if (!pis) return ''
  const digits = String(pis).replace(/\D/g, '')
  if (digits.length !== 11) return '***'
  return `***.****.***-${digits.slice(9, 11)}`
}

/** Máscara para RG. Mantém últimos 2 dígitos: `*****12` */
export function maskRg(rg: string | null | undefined): string {
  if (!rg) return ''
  const digits = String(rg).replace(/\W/g, '')
  if (digits.length < 3) return '***'
  return `${'*'.repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`
}

/** Máscara para nome completo. Mantém o primeiro nome: `João S***` */
export function maskNome(nome: string | null | undefined): string {
  if (!nome) return ''
  const parts = String(nome).trim().split(/\s+/)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[1].charAt(0)}***`
}

/** Máscara para token / api key. Mantém prefixo e 4 últimos: `abcd…wxyz` */
export function maskToken(token: string | null | undefined): string {
  if (!token) return ''
  const str = String(token)
  if (str.length <= 8) return '***'
  return `${str.slice(0, 4)}…${str.slice(-4)}`
}

/** Máscara para data de nascimento. Mantém só o ano: `****-**-1990` */
export function maskDataNascimento(data: string | Date | null | undefined): string {
  if (!data) return ''
  const d = data instanceof Date ? data : new Date(String(data))
  if (Number.isNaN(d.getTime())) return '***'
  return `****-**-${d.getFullYear()}`
}

/** Máscara para endereço. Mantém só cidade/UF se detectável: `*** — Belém/PA` */
export function maskEndereco(end: string | null | undefined): string {
  if (!end) return ''
  const str = String(end)
  // Procura padrão de UF no final (2 letras maiúsculas)
  const match = str.match(/([A-Za-zÀ-ÿ\s]+)\s*[/-]\s*([A-Z]{2})\s*$/)
  if (match) {
    return `*** — ${match[1].trim()}/${match[2]}`
  }
  return '***'
}

/** Máscara para IP. Mantém apenas a /24: `192.168.1.***` (IPv4) */
export function maskIp(ip: string | null | undefined): string {
  if (!ip) return ''
  const str = String(ip).trim()
  // IPv4
  const v4 = str.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/)
  if (v4) return `${v4[1]}.***`
  // IPv6 simplificado: mantém os 2 primeiros grupos
  if (str.includes(':')) {
    const parts = str.split(':')
    return `${parts.slice(0, 2).join(':')}:****`
  }
  return '***'
}

// ============================================================================
// MASCARAMENTO RECURSIVO POR NOME DE CAMPO
// ============================================================================

/**
 * Padrões de nomes de campos sensíveis. Match case-insensitive como substring.
 * Para cada padrão, define a função de mascaramento a aplicar.
 */
const FIELD_PATTERNS: Array<{ pattern: RegExp; mask: (v: any) => string }> = [
  { pattern: /senha|password|secret|token|api_?key|auth/i, mask: maskToken },
  { pattern: /\bcpf\b/i, mask: (v) => maskCpf(String(v ?? '')) },
  { pattern: /\bcnpj\b/i, mask: (v) => maskCnpj(String(v ?? '')) },
  { pattern: /e?[-_]?mail/i, mask: (v) => maskEmail(String(v ?? '')) },
  { pattern: /telefone|celular|whatsapp|fone/i, mask: (v) => maskTelefone(String(v ?? '')) },
  { pattern: /\b(pis|nis)\b/i, mask: (v) => maskPis(String(v ?? '')) },
  { pattern: /\brg\b/i, mask: (v) => maskRg(String(v ?? '')) },
  { pattern: /nome[_-]?completo|nome[_-]?aluno|nome[_-]?responsavel|nome[_-]?pai|nome[_-]?mae/i, mask: (v) => maskNome(String(v ?? '')) },
  { pattern: /endereco|logradouro|rua|bairro|cep/i, mask: (v) => maskEndereco(String(v ?? '')) },
  { pattern: /data[_-]?nascimento|nascimento|birth/i, mask: (v) => maskDataNascimento(v) },
  { pattern: /\bip\b|ip[_-]?(address|origem|registro)/i, mask: (v) => maskIp(String(v ?? '')) },
]

const MAX_DEPTH = 8

/**
 * Sanitiza recursivamente um objeto/array mascarando campos PII pelo nome.
 *
 * Preserva chaves; substitui apenas valores. Campos não sensíveis passam
 * intactos. Profundidade limitada para evitar ciclos infinitos.
 *
 * @example
 * sanitizePii({ nome: 'João Silva', cpf: '12345678900', idade: 30 })
 * // → { nome: 'João S***', cpf: '***.***.789-**', idade: 30 }
 */
export function sanitizePii(input: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || input == null) return input
  if (typeof input !== 'object') return input

  if (Array.isArray(input)) {
    return input.map((item) => sanitizePii(item, depth + 1))
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const matcher = FIELD_PATTERNS.find((p) => p.pattern.test(key))
    if (matcher && (typeof value === 'string' || typeof value === 'number')) {
      result[key] = matcher.mask(value)
    } else if (value && typeof value === 'object') {
      result[key] = sanitizePii(value, depth + 1)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Versão de sanitizePii para strings — útil para mensagens livres.
 * Detecta e mascara CPF, email e telefone em texto corrido.
 */
export function sanitizePiiString(text: string): string {
  if (!text) return text
  return text
    // CPF (000.000.000-00 ou 00000000000)
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, (m) => maskCpf(m))
    // Email
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, (m) => maskEmail(m))
    // Telefone brasileiro (com ou sem DDD)
    .replace(/\(?\d{2}\)?\s*9?\d{4}-?\d{4}\b/g, (m) => maskTelefone(m))
}
