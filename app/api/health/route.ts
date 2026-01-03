import { NextResponse } from 'next/server'
import pool, { testConnection } from '@/database/connection'

export const dynamic = 'force-dynamic';

export async function GET() {
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
      db_ssl: process.env.DB_SSL || 'not_set',
      jwt_secret: process.env.JWT_SECRET ? (process.env.JWT_SECRET.length > 20 ? 'configured' : 'too_short') : 'missing',
    },
    diagnostics: {
      is_supabase: process.env.DB_HOST?.includes('supabase.co') || 
                   process.env.DB_HOST?.includes('pooler.supabase.com') || false,
      host_type: process.env.DB_HOST?.includes('pooler') ? 'pooler' : 
                 process.env.DB_HOST?.includes('supabase.co') ? 'direct' : 'other',
    },
  }

  // Verificar conexão com banco usando função de teste
  const dbTest = await testConnection();
  if (dbTest.success) {
    health.checks.database = 'ok'
    
    // Tentar obter informações adicionais do pool
    try {
      const poolInfo = pool as any;
      health.database_pool = {
        total: poolInfo.totalCount || 0,
        idle: poolInfo.idleCount || 0,
        waiting: poolInfo.waitingCount || 0,
      }
    } catch (e) {
      // Ignorar erros ao obter informações do pool
    }
  } else {
    health.checks.database = 'error'
    health.database_error = {
      message: dbTest.error,
    }
    health.status = 'error'
    
    // Adicionar sugestões baseadas no tipo de erro
    if (dbTest.error?.includes('ENOTFOUND')) {
      health.suggestions = [
        'Verifique se o DB_HOST está correto',
        'Se estiver usando Supabase, use o Connection Pooler (porta 6543)',
        'Verifique se o projeto Supabase está ativo e não pausado',
      ]
    } else if (dbTest.error?.includes('ECONNREFUSED')) {
      health.suggestions = [
        'Verifique se a porta está correta (5432 ou 6543)',
        'Verifique se o firewall permite conexões',
        'Se estiver usando Supabase, use Connection Pooler (porta 6543)',
      ]
    } else if (dbTest.error?.includes('28P01') || dbTest.error?.includes('authentication')) {
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

  const statusCode = health.status === 'ok' ? 200 : 500

  return NextResponse.json(health, { status: statusCode })
}

