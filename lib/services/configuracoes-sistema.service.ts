/**
 * Service de configuracoes globais do sistema.
 *
 * Tabela: configuracoes_sistema (key-value JSONB).
 * Cache em memoria curto (60s) para evitar hit no banco a cada request.
 *
 * @module services/configuracoes-sistema
 */

import pool from '@/database/connection'
import { memoryCache } from '@/lib/cache/memory'
import { createLogger } from '@/lib/logger'

const log = createLogger('ConfigSistema')

const CACHE_PREFIX = 'config-sistema:'
const CACHE_TTL_MS = 60 * 1000

export type Chave2FA = 'dois_fatores_habilitado'
export type ChaveConfig = Chave2FA

/**
 * Le uma configuracao do sistema. Retorna o valor padrao se nao houver registro.
 */
export async function getConfig<T = unknown>(chave: ChaveConfig, padrao: T): Promise<T> {
  const cacheKey = `${CACHE_PREFIX}${chave}`
  const cached = memoryCache.get<T>(cacheKey)
  if (cached !== null) return cached

  try {
    const result = await pool.query(
      `SELECT valor FROM configuracoes_sistema WHERE chave = $1 LIMIT 1`,
      [chave]
    )
    const valor = (result.rows[0]?.valor ?? padrao) as T
    memoryCache.set(cacheKey, valor, CACHE_TTL_MS)
    return valor
  } catch (err) {
    log.warn(`Falha ao ler config ${chave}, usando padrao`, { error: String(err) })
    return padrao
  }
}

/**
 * Grava (upsert) uma configuracao e invalida o cache.
 */
export async function setConfig(params: {
  chave: ChaveConfig
  valor: unknown
  usuarioId: string
}): Promise<void> {
  await pool.query(
    `INSERT INTO configuracoes_sistema (chave, valor, atualizado_em, atualizado_por)
       VALUES ($1, $2::jsonb, NOW(), $3)
     ON CONFLICT (chave) DO UPDATE
       SET valor = EXCLUDED.valor,
           atualizado_em = NOW(),
           atualizado_por = EXCLUDED.atualizado_por`,
    [params.chave, JSON.stringify(params.valor), params.usuarioId]
  )
  memoryCache.invalidateByPrefix(`${CACHE_PREFIX}${params.chave}`)
  log.info(`Config ${params.chave} atualizada`, { userId: params.usuarioId })
}

/**
 * Le metadados (valor + auditoria) de uma configuracao.
 */
export async function getConfigDetalhe(chave: ChaveConfig): Promise<{
  valor: unknown
  atualizadoEm: Date | null
  atualizadoPor: string | null
} | null> {
  const result = await pool.query(
    `SELECT valor, atualizado_em, atualizado_por
       FROM configuracoes_sistema
      WHERE chave = $1 LIMIT 1`,
    [chave]
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    valor: row.valor,
    atualizadoEm: row.atualizado_em ? new Date(row.atualizado_em) : null,
    atualizadoPor: row.atualizado_por || null,
  }
}

/**
 * Flag global: 2FA habilitado para o sistema inteiro.
 * Quando false, o login pula 2FA mesmo para usuarios que ativaram.
 */
export async function is2FAGlobalmenteHabilitado(): Promise<boolean> {
  const valor = await getConfig<boolean>('dois_fatores_habilitado', false)
  return valor === true
}
