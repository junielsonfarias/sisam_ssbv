import { NextResponse } from 'next/server'
import pool, { testConnection, getPoolStats, forceHealthCheck } from '@/database/connection'

export const dynamic = 'force-dynamic';

export async function GET() {
  const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432;
  const isTransactionMode = port === 6543;

  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {
      database: 'unknown',
      jwt: 'unknown',
    },
    config: {
      db_host: process.env.DB_HOST ? 'configured' : 'missing',
      db_port: process.env.DB_PORT ? 'configured' : 'missing',
      db_name: process.env.DB_NAME ? 'configured' : 'missing',
      db_user: process.env.DB_USER ? 'configured' : 'missing',
      db_password: process.env.DB_PASSWORD ? 'configured' : 'missing',
      db_ssl: process.env.DB_SSL || 'true',
      jwt_secret: process.env.JWT_SECRET ? (process.env.JWT_SECRET.length > 20 ? 'configured' : 'too_short') : 'missing',
    },
    diagnostics: {
      is_supabase: process.env.DB_HOST?.includes('supabase.co') ||
                   process.env.DB_HOST?.includes('pooler.supabase.com') ||
                   process.env.DB_HOST?.includes('aws-0-') || false,
      host_type: process.env.DB_HOST?.includes('pooler') ? 'pooler' :
                 process.env.DB_HOST?.includes('supabase.co') ? 'direct' : 'other',
      connection_mode: isTransactionMode ? 'transaction' : 'session',
      port: port,
    },
  }

  // Verificar conexão com health check completo
  const healthCheckResult = await forceHealthCheck();

  if (healthCheckResult.healthy) {
    health.checks.database = 'ok'
    health.database_latency_ms = healthCheckResult.latency;

    // Obter estatísticas do pool
    const poolStats = getPoolStats();
    health.database_pool = {
      total: poolStats.total,
      idle: poolStats.idle,
      waiting: poolStats.waiting,
      activeQueries: poolStats.activeQueries,
      queuedQueries: poolStats.queuedQueries,
      isHealthy: poolStats.isHealthy,
      consecutiveFailures: poolStats.consecutiveFailures,
      lastHealthCheck: poolStats.lastHealthCheck,
    }
  } else {
    health.checks.database = 'error'
    health.database_error = {
      message: healthCheckResult.error,
      latency_ms: healthCheckResult.latency,
    }
    health.status = 'error'

    // Adicionar sugestões baseadas no tipo de erro
    const errorMsg = healthCheckResult.error || '';
    if (errorMsg.includes('ENOTFOUND')) {
      health.suggestions = [
        'Verifique se o DB_HOST está correto',
        'Se estiver usando Supabase, use o Connection Pooler (porta 6543)',
        'Verifique se o projeto Supabase está ativo e não pausado',
      ]
    } else if (errorMsg.includes('ECONNREFUSED')) {
      health.suggestions = [
        'Verifique se a porta está correta (5432 ou 6543)',
        'Verifique se o firewall permite conexões',
        'Se estiver usando Supabase, use Connection Pooler (porta 6543)',
      ]
    } else if (errorMsg.includes('MaxClientsInSessionMode') || errorMsg.includes('max clients')) {
      health.suggestions = [
        'Muitas conexões simultâneas - use Transaction Mode (porta 6543)',
        'O sistema tentará reconectar automaticamente',
        'Aguarde alguns segundos e tente novamente',
      ]
    } else if (errorMsg.includes('28P01') || errorMsg.includes('authentication')) {
      health.suggestions = [
        'Verifique se DB_USER e DB_PASSWORD estão corretos',
        'Se estiver usando Supabase Pooler, use o formato: postgres.[PROJECT-REF]',
        'Verifique se a senha não tem caracteres especiais que precisam ser escapados',
      ]
    }
  }

  // Verificar JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length > 20) {
    health.checks.jwt = 'ok'
  } else {
    health.checks.jwt = 'error'
    health.status = 'error'
  }

  // Avisos de configuração
  if (!isTransactionMode && health.diagnostics.is_supabase) {
    health.warnings = health.warnings || [];
    health.warnings.push('Usando Session Mode (porta 5432). Para melhor estabilidade com 50+ usuários, use Transaction Mode (porta 6543).');
  }

  const statusCode = health.status === 'ok' ? 200 : 500

  return NextResponse.json(health, { status: statusCode })
}

