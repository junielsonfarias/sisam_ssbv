import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Diagnóstico: verificar variáveis de ambiente
    const envCheck = {
      DB_HOST: process.env.DB_HOST ? `✅ ${process.env.DB_HOST}` : '❌ Não configurado',
      DB_PORT: process.env.DB_PORT ? `✅ ${process.env.DB_PORT}` : '❌ Não configurado',
      DB_NAME: process.env.DB_NAME ? `✅ ${process.env.DB_NAME}` : '❌ Não configurado',
      DB_USER: process.env.DB_USER ? `✅ ${process.env.DB_USER}` : '❌ Não configurado',
      DB_PASSWORD: process.env.DB_PASSWORD ? '✅ Configurado (oculto)' : '❌ Não configurado',
      NODE_ENV: process.env.NODE_ENV || 'não definido',
    }

    // Tentar verificar se existe admin
    let checkAdmin
    try {
      checkAdmin = await pool.query(
        "SELECT id, nome, email, tipo_usuario, ativo FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
      )
    } catch (dbError: any) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Erro ao conectar com banco de dados',
        detalhes: dbError.message,
        diagnostico: {
          variaveis_ambiente: envCheck,
          host_tentado: process.env.DB_HOST || 'localhost (padrão)',
          porta_tentada: process.env.DB_PORT || '5432 (padrão)',
          database_tentado: process.env.DB_NAME || 'sisam (padrão)',
        },
        instrucoes: 'Verifique se as variáveis de ambiente estão configuradas na Vercel (Settings → Environment Variables)'
      }, { status: 500 })
    }

    if (checkAdmin.rows.length > 0) {
      return NextResponse.json({
        existe: true,
        usuario: checkAdmin.rows[0],
        mensagem: 'Usuário administrador já existe',
        diagnostico: envCheck
      })
    }

    return NextResponse.json({
      existe: false,
      mensagem: 'Usuário administrador não encontrado',
      diagnostico: envCheck
    })
  } catch (error: any) {
    console.error('Erro ao verificar usuário:', error)
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao verificar usuário',
      detalhes: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar variáveis de ambiente primeiro
    const envVars = {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined,
    }

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Variáveis de ambiente não configuradas',
        variaveis_faltando: missingVars,
        instrucoes: 'Configure as variáveis de ambiente na Vercel: Settings → Environment Variables'
      }, { status: 500 })
    }

    // Verificar se já existe
    let checkAdmin
    try {
      checkAdmin = await pool.query(
        "SELECT id FROM usuarios WHERE email = 'admin@sisam.com'"
      )
    } catch (dbError: any) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Erro ao conectar com banco de dados',
        detalhes: dbError.message,
        host_configurado: process.env.DB_HOST || 'não configurado',
        porta_configurada: process.env.DB_PORT || 'não configurada',
        instrucoes: 'Verifique se as credenciais do banco estão corretas na Vercel'
      }, { status: 500 })
    }

    if (checkAdmin.rows.length > 0) {
      return NextResponse.json({
        mensagem: 'Usuário já existe',
        email: 'admin@sisam.com',
        senha: 'admin123'
      })
    }

    const senhaHash = await hashPassword('admin123')

    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario) 
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, email`,
      ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
    )

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Usuário administrador criado com sucesso!',
      email: 'admin@sisam.com',
      senha: 'admin123',
      aviso: 'ALTERE A SENHA APÓS O PRIMEIRO ACESSO!'
    })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao criar usuário',
      detalhes: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

