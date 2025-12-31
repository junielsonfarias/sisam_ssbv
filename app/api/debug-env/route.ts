import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  // Endpoint de debug para verificar variáveis de ambiente em produção
  const envInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    variables: {
      DB_HOST: {
        exists: !!process.env.DB_HOST,
        value: process.env.DB_HOST ? `${process.env.DB_HOST.substring(0, 10)}...` : 'VAZIO',
        length: process.env.DB_HOST?.length || 0,
        raw: process.env.DB_HOST || 'undefined',
      },
      DB_PORT: {
        exists: !!process.env.DB_PORT,
        value: process.env.DB_PORT || 'VAZIO',
      },
      DB_NAME: {
        exists: !!process.env.DB_NAME,
        value: process.env.DB_NAME || 'VAZIO',
      },
      DB_USER: {
        exists: !!process.env.DB_USER,
        value: process.env.DB_USER ? `${process.env.DB_USER.substring(0, 5)}...` : 'VAZIO',
        length: process.env.DB_USER?.length || 0,
      },
      DB_PASSWORD: {
        exists: !!process.env.DB_PASSWORD,
        hasValue: !!process.env.DB_PASSWORD && process.env.DB_PASSWORD.length > 0,
        length: process.env.DB_PASSWORD?.length || 0,
      },
      DB_SSL: {
        exists: !!process.env.DB_SSL,
        value: process.env.DB_SSL || 'VAZIO',
      },
      JWT_SECRET: {
        exists: !!process.env.JWT_SECRET,
        hasValue: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length > 20,
        length: process.env.JWT_SECRET?.length || 0,
      },
    },
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.startsWith('DB_') || key.startsWith('JWT_') || key === 'NODE_ENV'
    ),
  }

  return NextResponse.json(envInfo, { status: 200 })
}

