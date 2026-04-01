import pool from '@/database/connection'
import { forceHealthCheck } from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('Monitoramento')

// ============================================================================
// TIPOS
// ============================================================================

export interface HealthResult {
  status: 'ok' | 'degradado' | 'erro'
  banco: { ok: boolean; latencia_ms?: number; erro?: string }
  redis: { ok: boolean; latencia_ms?: number; erro?: string }
  timestamp: string
}

export interface ConfigMonitoramento {
  emails_alerta: string[]
  webhook_url: string
  intervalo_min: number
  alertar_banco: boolean
  alertar_redis: boolean
  alertar_erro: boolean
}

// ============================================================================
// VERIFICAÇÃO DE SAÚDE
// ============================================================================

/**
 * Verifica a saúde do banco de dados e Redis.
 * Usado por: /api/cron/health-check, /api/admin/monitoramento
 */
export async function verificarSaude(): Promise<HealthResult> {
  const result: HealthResult = {
    status: 'ok',
    banco: { ok: false },
    redis: { ok: false },
    timestamp: new Date().toISOString(),
  }

  // Verificar banco
  try {
    const healthCheck = await forceHealthCheck()
    result.banco = {
      ok: healthCheck.healthy,
      latencia_ms: healthCheck.latency,
      erro: healthCheck.healthy ? undefined : 'Falha na conexão',
    }
  } catch (error) {
    result.banco = { ok: false, erro: (error as Error).message }
  }

  // Verificar Redis (se configurado)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (redisUrl && redisToken) {
    try {
      const inicio = Date.now()
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({ url: redisUrl, token: redisToken })
      await redis.ping()
      result.redis = { ok: true, latencia_ms: Date.now() - inicio }
    } catch (error) {
      result.redis = { ok: false, erro: (error as Error).message }
    }
  } else {
    result.redis = { ok: true } // Sem Redis configurado = não verificar
  }

  // Determinar status geral
  if (!result.banco.ok) {
    result.status = 'erro'
  } else if (!result.redis.ok && redisUrl) {
    result.status = 'degradado'
  }

  return result
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

/**
 * Busca configuração de monitoramento da tabela site_config.
 * Usado por: /api/admin/monitoramento, /api/cron/health-check
 */
export async function buscarConfigMonitoramento(): Promise<ConfigMonitoramento> {
  try {
    const result = await pool.query(
      "SELECT conteudo FROM site_config WHERE secao = 'monitoramento'"
    )
    const conteudo = result.rows[0]?.conteudo
    return {
      emails_alerta: conteudo?.emails_alerta || [],
      webhook_url: conteudo?.webhook_url || '',
      intervalo_min: conteudo?.intervalo_min || 5,
      alertar_banco: conteudo?.alertar_banco !== false,
      alertar_redis: conteudo?.alertar_redis !== false,
      alertar_erro: conteudo?.alertar_erro !== false,
    }
  } catch {
    return {
      emails_alerta: [],
      webhook_url: '',
      intervalo_min: 5,
      alertar_banco: true,
      alertar_redis: true,
      alertar_erro: true,
    }
  }
}

// ============================================================================
// ALERTAS
// ============================================================================

/**
 * Envia alerta por email (Resend) e/ou webhook.
 * Se RESEND_API_KEY não estiver configurada, apenas loga.
 * Usado por: /api/cron/health-check, /api/admin/monitoramento/testar
 */
export async function enviarAlerta(
  assunto: string,
  corpo: string,
  emails: string[]
): Promise<{ enviado: boolean; metodo: string }> {
  const resendKey = process.env.RESEND_API_KEY

  if (!resendKey) {
    log.info('Alerta (simulado — RESEND_API_KEY não configurada)', {
      assunto,
      emails,
      corpo: corpo.substring(0, 200),
    })
    return { enviado: false, metodo: 'log' }
  }

  if (emails.length === 0) {
    log.warn('Nenhum email de alerta configurado')
    return { enviado: false, metodo: 'nenhum_email' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SISAM Monitoramento <noreply@educacaossbv.com.br>',
        to: emails,
        subject: `[SISAM] ${assunto}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">SISAM — Alerta de Monitoramento</h2>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
              ${corpo}
            </div>
            <p style="color: #64748b; font-size: 12px;">
              Enviado automaticamente pelo sistema de monitoramento SISAM em ${new Date().toLocaleString('pt-BR')}
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      log.error('Erro ao enviar email via Resend', { status: response.status, body: errorData })
      return { enviado: false, metodo: 'resend_erro' }
    }

    log.info('Alerta enviado via Resend', { assunto, emails })
    return { enviado: true, metodo: 'resend' }
  } catch (error) {
    log.error('Erro ao enviar alerta', error)
    return { enviado: false, metodo: 'erro' }
  }
}

/**
 * Envia alerta via webhook (se configurado).
 * Usado por: /api/cron/health-check
 */
export async function enviarWebhook(
  webhookUrl: string,
  dados: Record<string, unknown>
): Promise<boolean> {
  if (!webhookUrl) return false

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sistema: 'SISAM',
        timestamp: new Date().toISOString(),
        ...dados,
      }),
    })
    return response.ok
  } catch (error) {
    log.error('Erro ao enviar webhook', error)
    return false
  }
}
