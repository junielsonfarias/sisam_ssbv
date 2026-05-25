/**
 * Adapter para envio de logs estruturados a destinos externos (Logtail, Axiom, BetterStack...).
 *
 * Versão inicial: estrutura pronta + helper que envia HTTP POST para
 * o webhook definido em `LOG_DRAIN_URL`. Se não configurado, é noop.
 *
 * Para usar com Vercel:
 *  1. Vercel Project → Settings → Integrations → Log Drains
 *  2. Conectar Logtail / Axiom / Datadog
 *  3. Vercel envia automaticamente; este adapter é só para logs custom
 *     (eventos de negócio que não saem como console.log).
 *
 * @module lib/observabilidade/log-drain
 */

import { createLogger } from '@/lib/logger'
import { sanitizePii } from '@/lib/utils/mask-pii'

const log = createLogger('LogDrain')

export interface EventoEstruturado {
  /** Categoria do evento — ex: 'auth', 'matricula', 'importacao', 'ficai' */
  categoria: string
  /** Ação realizada — ex: 'login_sucesso', 'matricula_criada' */
  acao: string
  /** Dados adicionais (serão sanitizados antes de enviar) */
  dados?: Record<string, unknown>
  /** Severidade */
  nivel?: 'debug' | 'info' | 'warn' | 'error'
  /** ID de correlação (request_id, trace_id) */
  correlationId?: string
  /** Tags livres para filtragem */
  tags?: string[]
}

const ENDPOINT = process.env.LOG_DRAIN_URL
const TOKEN = process.env.LOG_DRAIN_TOKEN

/**
 * Envia evento estruturado ao destino configurado.
 * Não bloqueia se não houver configuração ou se o envio falhar.
 */
export async function enviarEvento(evento: EventoEstruturado): Promise<void> {
  // Sempre loga localmente (para console.log do Vercel)
  log.info(`evento:${evento.categoria}/${evento.acao}`, {
    data: evento.dados,
  })

  // Se Log Drain não configurado, para por aqui
  if (!ENDPOINT) return

  const payload = {
    timestamp: new Date().toISOString(),
    service: 'sisam-educatec',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    ...evento,
    dados: evento.dados ? sanitizePii(evento.dados) : undefined,
  }

  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
      body: JSON.stringify(payload),
      // Timeout curto: log drain não deve bloquear request principal
      signal: AbortSignal.timeout(2000),
    })
  } catch (err) {
    // Falha em log drain nunca bloqueia operação
    log.warn(`Falha ao enviar log drain: ${(err as Error).message}`)
  }
}

/**
 * Helper específico para evento de auditoria.
 * Combinado com `lib/services/auditoria.service` que grava no banco —
 * este envia ao destino externo (se configurado).
 */
export function logEvento(params: {
  categoria: string
  acao: string
  dados?: Record<string, unknown>
  nivel?: 'info' | 'warn' | 'error'
}): void {
  // Fire-and-forget — não aguarda
  enviarEvento({
    categoria: params.categoria,
    acao: params.acao,
    dados: params.dados,
    nivel: params.nivel || 'info',
  }).catch(() => { /* silencioso */ })
}
