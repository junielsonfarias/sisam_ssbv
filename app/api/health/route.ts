import { NextResponse } from 'next/server'
import pool, { testConnection, getPoolStats, forceHealthCheck } from '@/database/connection'
import { getRequestMetrics } from '@/middleware'

export const dynamic = 'force-dynamic';

export async function GET() {
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'unknown',
      jwt: 'unknown',
    },
  }

  // Verificar conexão com health check completo
  const healthCheckResult = await forceHealthCheck();

  if (healthCheckResult.healthy) {
    health.checks = { ...(health.checks as object), database: 'ok' }
    health.database_latency_ms = healthCheckResult.latency;

    // Estatísticas do pool (sem dados sensíveis)
    const poolStats = getPoolStats();
    health.database_pool = {
      total: poolStats.total,
      idle: poolStats.idle,
      waiting: poolStats.waiting,
      activeQueries: poolStats.activeQueries,
      queuedQueries: poolStats.queuedQueries,
      isHealthy: poolStats.isHealthy,
    }
  } else {
    health.checks = { ...(health.checks as object), database: 'error' }
    health.database_error = 'Falha na conexão com o banco de dados'
    health.status = 'error'

    // Log detalhes no servidor (não expor ao cliente)
    console.error('[Health] Database error:', healthCheckResult.error)
  }

  // Métricas de dispositivos faciais (se tabela existir)
  try {
    const dispositivosResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'ativo') AS ativos,
        COUNT(*) FILTER (WHERE status = 'ativo' AND ultimo_ping > NOW() - INTERVAL '5 minutes') AS online,
        COUNT(*) FILTER (WHERE status = 'ativo' AND (ultimo_ping IS NULL OR ultimo_ping <= NOW() - INTERVAL '60 minutes')) AS offline_longo
       FROM dispositivos_faciais`
    )
    const disp = dispositivosResult.rows[0] || {}
    health.dispositivos_faciais = {
      ativos: parseInt(disp.ativos || '0'),
      online: parseInt(disp.online || '0'),
      offline_longo: parseInt(disp.offline_longo || '0'),
    }
  } catch {
    // Tabela pode não existir ainda
  }

  // Verificar JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
    health.checks = { ...(health.checks as object), jwt: 'ok' }
  } else {
    health.checks = { ...(health.checks as object), jwt: 'error' }
    health.status = 'error'
  }

  // Redis check
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  health.redis = { url_present: !!redisUrl, token_present: !!redisToken }
  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis')
      const r = new Redis({ url: redisUrl, token: redisToken })
      const pong = await r.ping()
      await r.set('sisam:health:ping', 'ok', { ex: 60 })
      const val = await r.get('sisam:health:ping')
      const size = await r.dbsize()
      ;(health.redis as any).connected = true
      ;(health.redis as any).ping = pong
      ;(health.redis as any).test_value = val
      ;(health.redis as any).dbsize = size
    } catch (err: any) {
      ;(health.redis as any).connected = false
      ;(health.redis as any).error = err?.message
      ;(health.redis as any).stack = err?.stack?.split('\n').slice(0, 3)
    }
  }

  // Métricas de request do middleware
  try {
    health.request_metrics = getRequestMetrics()
  } catch {
    // Middleware pode não estar disponível
  }

  const statusCode = health.status === 'ok' ? 200 : 500
  return NextResponse.json(health, { status: statusCode })
}
