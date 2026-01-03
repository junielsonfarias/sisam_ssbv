import { NextRequest, NextResponse } from 'next/server'
import { getUsuarioFromRequest } from '@/lib/auth'
import pool, { testConnection } from '@/database/connection'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar conexão com banco antes de processar
    const dbTest = await testConnection();
    if (!dbTest.success) {
      console.error('Erro de conexão com banco de dados:', dbTest.error);
      return NextResponse.json(
        { 
          mensagem: 'Erro ao conectar com o banco de dados',
          erro: 'DB_CONNECTION_ERROR',
          detalhes: process.env.NODE_ENV === 'development' ? dbTest.error : undefined
        },
        { status: 503 } // Service Unavailable
      )
    }

    const usuario = await getUsuarioFromRequest(request)

    if (!usuario) {
      return NextResponse.json(
        { mensagem: 'Não autorizado' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        polo_id: usuario.polo_id,
        escola_id: usuario.escola_id,
      },
    })
  } catch (error: any) {
    console.error('Erro ao verificar autenticação:', {
      message: error?.message,
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    })
    
    // Verificar se é erro de banco de dados
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ETIMEDOUT') {
      return NextResponse.json(
        { 
          mensagem: 'Erro ao conectar com o banco de dados',
          erro: 'DB_CONNECTION_ERROR',
          detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        mensagem: 'Erro interno do servidor',
        erro: 'INTERNAL_ERROR',
        detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

