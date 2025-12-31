import { NextRequest, NextResponse } from 'next/server'
import pool, { resetPool } from '@/database/connection'
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
    // Ler valores reais das variáveis (para debug)
    // IMPORTANTE: Na Vercel, variáveis podem estar definidas mas vazias
    // Remover quebras de linha que podem vir das variáveis de ambiente
    const dbHost = process.env.DB_HOST?.trim().replace(/\r\n/g, '').replace(/\n/g, '') || ''
    const dbName = process.env.DB_NAME?.trim().replace(/\r\n/g, '').replace(/\n/g, '') || ''
    const dbUser = process.env.DB_USER?.trim().replace(/\r\n/g, '').replace(/\n/g, '') || ''
    const dbPort = process.env.DB_PORT?.trim().replace(/\r\n/g, '').replace(/\n/g, '') || ''
    const dbPassword = process.env.DB_PASSWORD?.trim().replace(/\r\n/g, '').replace(/\n/g, '') || ''

    // Verificar status da inicialização
    const status: any = {
      ambiente: process.env.NODE_ENV,
      variaveis_configuradas: {
        DB_HOST: !!dbHost && dbHost.length > 0,
        DB_NAME: !!dbName && dbName.length > 0,
        DB_USER: !!dbUser && dbUser.length > 0,
        DB_PASSWORD: !!dbPassword && dbPassword.length > 0,
        DB_PORT: !!dbPort && dbPort.length > 0,
      },
      valores_reais: {
        DB_HOST: dbHost || 'não configurado ou vazio',
        DB_NAME: dbName || 'não configurado ou vazio',
        DB_USER: dbUser || 'não configurado ou vazio',
        DB_PORT: dbPort || 'não configurado ou vazio',
        DB_PASSWORD: dbPassword ? '***' : 'não configurado ou vazio',
      },
      host: dbHost || 'não configurado',
      database: dbName || 'não configurado',
      aviso: dbHost === 'localhost' || dbHost === '' 
        ? '⚠️ DB_HOST está como localhost ou vazio! Configure o host correto na Vercel.'
        : null,
    }

    // Resetar pool para garantir que use as variáveis corretas
    resetPool();
    
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
      
      // Mensagens de ajuda específicas para Supabase
      if (dbError.code === 'ENOTFOUND') {
        status.ajuda = {
          problema: 'Hostname não encontrado (DNS)',
          solucoes: [
            'Verifique se o DB_HOST está correto no Supabase',
            'Use o hostname do Connection Pooler (porta 6543) para aplicações',
            'Use o hostname da Direct Connection (porta 5432) apenas para migrations',
            'No Supabase: Settings → Database → Connection Pooling',
            'Certifique-se de que o projeto está ativo e não pausado'
          ]
        }
      } else if (dbError.code === 'ECONNREFUSED') {
        status.ajuda = {
          problema: 'Conexão recusada',
          solucoes: [
            'Verifique se a porta está correta (5432 ou 6543)',
            'Verifique se o firewall permite conexões',
            'No Supabase, use Connection Pooler (porta 6543) para aplicações'
          ]
        }
      } else if (dbError.code === '28P01') {
        status.ajuda = {
          problema: 'Autenticação falhou',
          solucoes: [
            'Verifique se DB_USER e DB_PASSWORD estão corretos',
            'Use as credenciais do Supabase (geralmente postgres)',
            'Verifique se a senha não tem caracteres especiais que precisam ser escapados'
          ]
        }
      }
    }

    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({
      erro: true,
      mensagem: error.message
    }, { status: 500 })
  }
}

