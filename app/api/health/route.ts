import { NextResponse } from 'next/server'
import pool from '@/database/connection'

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
      jwt_secret: process.env.JWT_SECRET ? (process.env.JWT_SECRET.length > 20 ? 'configured' : 'too_short') : 'missing',
    },
  }

  // Verificar conexão com banco
  try {
    await pool.query('SELECT 1')
    health.checks.database = 'ok'
  } catch (error: any) {
    health.checks.database = 'error'
    health.database_error = {
      code: error.code,
      message: error.message,
    }
    health.status = 'error'
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

