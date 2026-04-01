import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import {
  verificarSaude,
  buscarConfigMonitoramento,
  enviarAlerta,
  enviarWebhook,
} from '@/lib/services/monitoramento.service'

const log = createLogger('CronHealthCheck')

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/health-check
 *
 * Endpoint chamado por cron job (Vercel Cron ou externo).
 * Verifica saúde do sistema e envia alertas se necessário.
 * Protegido por CRON_SECRET no header Authorization.
 */
export async function GET(request: NextRequest) {
  // Verificar autenticação via CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    log.warn('CRON_SECRET não configurado')
    return NextResponse.json({ mensagem: 'CRON_SECRET não configurado' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
  }

  try {
    const saude = await verificarSaude()
    const config = await buscarConfigMonitoramento()

    // Verificar se precisa enviar alerta
    const problemas: string[] = []

    if (!saude.banco.ok && config.alertar_banco) {
      problemas.push(`Banco de dados: ${saude.banco.erro || 'indisponível'}`)
    }

    if (!saude.redis.ok && config.alertar_redis) {
      problemas.push(`Redis: ${saude.redis.erro || 'indisponível'}`)
    }

    // Enviar alertas se há problemas
    if (problemas.length > 0) {
      const corpo = `
        <h3 style="color: #dc2626;">Problemas detectados no SISAM</h3>
        <ul>
          ${problemas.map(p => `<li>${p}</li>`).join('')}
        </ul>
        <p>Status geral: <strong>${saude.status.toUpperCase()}</strong></p>
        <p>Verificação realizada em: ${saude.timestamp}</p>
      `

      // Email
      if (config.emails_alerta.length > 0) {
        await enviarAlerta('Sistema com problemas', corpo, config.emails_alerta)
      }

      // Webhook
      if (config.webhook_url) {
        await enviarWebhook(config.webhook_url, {
          tipo: 'health_check',
          status: saude.status,
          problemas,
        })
      }

      log.warn('Health check com problemas', { problemas, status: saude.status })
    } else {
      log.info('Health check OK', { status: saude.status })
    }

    return NextResponse.json({
      status: saude.status,
      problemas,
      alertas_enviados: problemas.length > 0,
      verificado_em: saude.timestamp,
    })
  } catch (error) {
    log.error('Erro no health check cron', error)
    return NextResponse.json({ mensagem: 'Erro interno' }, { status: 500 })
  }
}
