import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar se existe admin
    const checkAdmin = await pool.query(
      "SELECT id, nome, email, tipo_usuario, ativo FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
    )

    if (checkAdmin.rows.length > 0) {
      return NextResponse.json({
        existe: true,
        usuario: checkAdmin.rows[0],
        mensagem: 'Usuário administrador já existe'
      })
    }

    return NextResponse.json({
      existe: false,
      mensagem: 'Usuário administrador não encontrado'
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
    // Verificar se já existe
    const checkAdmin = await pool.query(
      "SELECT id FROM usuarios WHERE email = 'admin@sisam.com'"
    )

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

