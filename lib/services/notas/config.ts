import pool from '@/database/connection'
import type { ConfigNotas } from './types'

// ============================================================================
// Cache em memória para dados que não mudam durante lançamento de notas
// (turma, config) — evita queries repetitivas de 70 professores simultâneos
// ============================================================================
export const turmaCache = new Map<string, { data: { escola_id: string; ano_letivo: string; serie?: string; [key: string]: unknown } | null; expiresAt: number }>()
const configCache = new Map<string, { data: ConfigNotas; expiresAt: number }>()
export const CACHE_TTL = 60_000 // 60 segundos

/**
 * Busca config de notas de uma escola/ano (com cache de 60s)
 */
export async function buscarConfigNotas(escolaId: string, anoLetivo: string): Promise<ConfigNotas> {
  const cacheKey = `${escolaId}:${anoLetivo}`
  const cached = configCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  const result = await pool.query(
    'SELECT nota_maxima, media_aprovacao, permite_recuperacao, peso_avaliacao, peso_recuperacao FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
    [escolaId, anoLetivo]
  )
  let config: ConfigNotas
  if (result.rows.length > 0) {
    config = {
      nota_maxima: parseFloat(result.rows[0].nota_maxima) || 10,
      media_aprovacao: parseFloat(result.rows[0].media_aprovacao) || 6,
      permite_recuperacao: result.rows[0].permite_recuperacao ?? true,
      peso_avaliacao: result.rows[0].peso_avaliacao ? parseFloat(result.rows[0].peso_avaliacao) : undefined,
      peso_recuperacao: result.rows[0].peso_recuperacao ? parseFloat(result.rows[0].peso_recuperacao) : undefined,
    }
  } else {
    config = { nota_maxima: 10, media_aprovacao: 6, permite_recuperacao: true }
  }

  configCache.set(cacheKey, { data: config, expiresAt: Date.now() + CACHE_TTL })
  return config
}

/**
 * Invalida o cache em memória de config de notas (Map por `${escolaId}:${anoLetivo}`).
 * Deve ser chamada após qualquer mutação em `configuracao_notas_escola` — junto
 * com o `cacheDelPattern('config:*')` do Redis — para evitar que professores
 * lancem notas com config antiga dentro da janela de TTL (60s).
 *
 * - Com `escolaId` e `anoLetivo`: remove apenas a chave específica.
 * - Sem argumentos: limpa todo o cache (caso simples e seguro, ex.: DELETE
 *   por id, onde a chave não é derivável diretamente).
 *
 * Usado por: app/api/admin/configuracao-notas (POST/PUT/DELETE)
 */
export function invalidarCacheConfigNotas(escolaId?: string, anoLetivo?: string): void {
  if (escolaId && anoLetivo) {
    configCache.delete(`${escolaId}:${anoLetivo}`)
  } else {
    configCache.clear()
  }
}
