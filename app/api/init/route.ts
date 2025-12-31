import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verificar se é ambiente de produção
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        mensagem: 'Esta rota só está disponível em produção'
      }, { status: 403 })
    }

    // Verificar variáveis de ambiente
    if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Variáveis de ambiente do banco não configuradas',
        variaveis_faltando: {
          DB_HOST: !process.env.DB_HOST,
          DB_NAME: !process.env.DB_NAME,
          DB_USER: !process.env.DB_USER,
          DB_PASSWORD: !process.env.DB_PASSWORD,
        }
      }, { status: 500 })
    }

    // Verificar se tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      );
    `)

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Tabela usuarios não encontrada. Execute o schema SQL primeiro.'
      }, { status: 500 })
    }

    // Verificar se já existe admin
    const checkAdmin = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE email = 'admin@sisam.com' OR tipo_usuario = 'administrador' LIMIT 1"
    )

    if (checkAdmin.rows.length > 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Usuário administrador já existe',
        usuario: {
          email: checkAdmin.rows[0].email,
          nome: checkAdmin.rows[0].nome
        }
      })
    }

    // Criar usuário admin
    const senhaHash = await hashPassword('admin123')
    
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha, tipo_usuario = EXCLUDED.tipo_usuario
       RETURNING id, nome, email`,
      ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
    )

    return NextResponse.json({
      sucesso: true,
      mensagem: 'Usuário administrador criado com sucesso!',
      usuario: {
        email: result.rows[0].email,
        nome: result.rows[0].nome
      },
      credenciais: {
        email: 'admin@sisam.com',
        senha: 'admin123'
      },
      aviso: 'ALTERE A SENHA APÓS O PRIMEIRO ACESSO!'
    })
  } catch (error: any) {
    console.error('Erro na inicialização:', error)
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao inicializar sistema',
      detalhes: error.message,
      code: error.code
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar status da inicialização
    const status = {
      ambiente: process.env.NODE_ENV,
      variaveis_configuradas: {
        DB_HOST: !!process.env.DB_HOST,
        DB_NAME: !!process.env.DB_NAME,
        DB_USER: !!process.env.DB_USER,
        DB_PASSWORD: !!process.env.DB_PASSWORD,
      },
      host: process.env.DB_HOST || 'não configurado',
      database: process.env.DB_NAME || 'não configurado',
    }

    // Tentar verificar se admin existe
    try {
      const checkAdmin = await pool.query(
        "SELECT id, nome, email FROM usuarios WHERE email = 'admin@sisam.com' OR tipo_usuario = 'administrador' LIMIT 1"
      )
      
      status.admin_existe = checkAdmin.rows.length > 0
      if (checkAdmin.rows.length > 0) {
        status.admin = {
          email: checkAdmin.rows[0].email,
          nome: checkAdmin.rows[0].nome
        }
      }
    } catch (dbError: any) {
      status.erro_conexao = dbError.message
      status.code_erro = dbError.code
    }

    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({
      erro: true,
      mensagem: error.message
    }, { status: 500 })
  }
}

