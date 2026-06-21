import pool from '@/database/connection'
import {
  ESQUEMA_RECUPERACAO_PADRAO,
  ESQUEMAS_RECUPERACAO,
  REGRA_RECUPERACAO_PADRAO,
  REGRAS_RECUPERACAO,
} from './types'
import type { ConfigNotas, EsquemaRecuperacao, RegraRecuperacao } from './types'

/** Normaliza valor vindo do banco para uma RegraRecuperacao válida (default 'substituicao'). */
function normalizarRegraRecuperacao(valor: unknown): RegraRecuperacao {
  return REGRAS_RECUPERACAO.includes(valor as RegraRecuperacao)
    ? (valor as RegraRecuperacao)
    : REGRA_RECUPERACAO_PADRAO
}

/** Normaliza valor vindo do banco para um EsquemaRecuperacao válido (default 'por_periodo'). */
function normalizarEsquemaRecuperacao(valor: unknown): EsquemaRecuperacao {
  return ESQUEMAS_RECUPERACAO.includes(valor as EsquemaRecuperacao)
    ? (valor as EsquemaRecuperacao)
    : ESQUEMA_RECUPERACAO_PADRAO
}

/** Converte numeric do PG (string) para number, com fallback quando nulo/indefinido. */
function num(valor: unknown, fallback: number): number {
  const n = valor == null ? NaN : parseFloat(String(valor))
  return Number.isFinite(n) ? n : fallback
}

// ============================================================================
// Cache em memória para dados que não mudam durante lançamento de notas
// (turma, config) — evita queries repetitivas de 70 professores simultâneos
// ============================================================================
export const turmaCache = new Map<string, { data: { escola_id: string; ano_letivo: string; serie?: string; [key: string]: unknown } | null; expiresAt: number }>()
const configCache = new Map<string, { data: ConfigNotas; expiresAt: number }>()
export const CACHE_TTL = 60_000 // 60 segundos

/**
 * Busca config de notas de uma escola/ano (com cache de 60s).
 *
 * Resolução de fonte canônica (ADR-005, passo 1): a configuração por escola+série
 * em `escola_regras_avaliacao` (linha `ativo = true`) tem **prioridade** sobre a
 * config global por escola+ano de `configuracao_notas_escola`. Os campos do override
 * por série são aplicados via COALESCE — campo NULL no override cai para o valor
 * global, e a ausência total de linha de override usa apenas o global (nunca falha).
 *
 * O `esquema_recuperacao` (ADR-005) só existe em `escola_regras_avaliacao`; quando não
 * há override para a série, usa o default 'por_periodo' (comportamento atual).
 *
 * @param escolaId       Escola.
 * @param anoLetivo      Ano letivo.
 * @param serieEscolarId Série canônica (series_escolares.id). Quando informada, busca
 *                       o override escola+série em `escola_regras_avaliacao`.
 */
export async function buscarConfigNotas(
  escolaId: string,
  anoLetivo: string,
  serieEscolarId?: string | null
): Promise<ConfigNotas> {
  const cacheKey = `${escolaId}:${anoLetivo}:${serieEscolarId ?? '-'}`
  const cached = configCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) return cached.data

  // Base global por escola+ano (configuracao_notas_escola).
  const globalResult = await pool.query(
    'SELECT nota_maxima, media_aprovacao, permite_recuperacao, peso_avaliacao, peso_recuperacao, regra_recuperacao FROM configuracao_notas_escola WHERE escola_id = $1 AND ano_letivo = $2',
    [escolaId, anoLetivo]
  )
  const g = globalResult.rows[0] as Record<string, unknown> | undefined

  // Override por escola+série (escola_regras_avaliacao). Pode não existir — fallback global.
  let era: Record<string, unknown> | undefined
  if (serieEscolarId) {
    const eraResult = await pool.query(
      'SELECT media_aprovacao, nota_maxima, permite_recuperacao, esquema_recuperacao FROM escola_regras_avaliacao WHERE escola_id = $1 AND serie_escolar_id = $2 AND ativo = true LIMIT 1',
      [escolaId, serieEscolarId]
    )
    era = eraResult.rows[0] as Record<string, unknown> | undefined
  }

  // COALESCE: override por série > global > default.
  const config: ConfigNotas = {
    nota_maxima: num(era?.nota_maxima ?? g?.nota_maxima, 10),
    media_aprovacao: num(era?.media_aprovacao ?? g?.media_aprovacao, 6),
    permite_recuperacao:
      (era?.permite_recuperacao as boolean | null | undefined) ??
      (g?.permite_recuperacao as boolean | null | undefined) ??
      true,
    peso_avaliacao: g?.peso_avaliacao != null ? parseFloat(String(g.peso_avaliacao)) : undefined,
    peso_recuperacao: g?.peso_recuperacao != null ? parseFloat(String(g.peso_recuperacao)) : undefined,
    regra_recuperacao: normalizarRegraRecuperacao(g?.regra_recuperacao ?? REGRA_RECUPERACAO_PADRAO),
    esquema_recuperacao: normalizarEsquemaRecuperacao(era?.esquema_recuperacao),
  }

  configCache.set(cacheKey, { data: config, expiresAt: Date.now() + CACHE_TTL })
  return config
}

/**
 * Invalida o cache em memória de config de notas. A chave é de 3 segmentos
 * (`${escolaId}:${anoLetivo}:${serieEscolarId ?? '-'}`), pois o resolver passou a
 * honrar override por série (escola_regras_avaliacao). Deve ser chamada após
 * qualquer mutação em `configuracao_notas_escola` ou `escola_regras_avaliacao` —
 * junto com o `cacheDelPattern('config:*')` do Redis — para evitar que professores
 * lancem notas com config antiga dentro da janela de TTL (60s).
 *
 * - Com `escolaId` e `anoLetivo`: remove TODAS as entradas daquela escola+ano
 *   (todas as séries), iterando por prefixo `${escolaId}:${anoLetivo}:`.
 * - Sem argumentos: limpa todo o cache (caso simples e seguro, ex.: DELETE
 *   por id ou alteração de regra por série, onde a chave não é derivável).
 *
 * Usado por: app/api/admin/configuracao-notas (POST/PUT/DELETE),
 *            app/api/admin/escolas/[id]/regras-avaliacao (POST/DELETE)
 */
export function invalidarCacheConfigNotas(escolaId?: string, anoLetivo?: string): void {
  if (escolaId && anoLetivo) {
    const prefixo = `${escolaId}:${anoLetivo}:`
    for (const key of configCache.keys()) {
      if (key.startsWith(prefixo)) configCache.delete(key)
    }
  } else {
    configCache.clear()
  }
}
