import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { hashPassword, getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT PROTEGIDO - Apenas administradores autenticados
 * ou primeira inicializacao (quando nao existe admin)
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    // Verificar se existe algum admin
    let adminExiste = false
    try {
      const checkAdmin = await pool.query(
        "SELECT id FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
      )
      adminExiste = checkAdmin.rows.length > 0
    } catch (dbError) {
      adminExiste = false
    }

    // Se ja existe admin, exigir autenticacao
    if (adminExiste && (!usuario || !verificarPermissao(usuario, ['administrador']))) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Acesso negado. Apenas administradores podem acessar este endpoint.',
        codigo: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    // Retornar apenas informacao basica
    return NextResponse.json({
      admin_existe: adminExiste,
      mensagem: adminExiste
        ? 'Usuario administrador ja existe'
        : 'Nenhum administrador encontrado. Use POST para criar.'
    })
  } catch (error: any) {
    console.error('Erro ao verificar usuario:', error)
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao verificar usuario',
      codigo: 'CHECK_ERROR'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await getUsuarioFromRequest(request)

    // Verificar se existe algum admin
    let adminExiste = false
    try {
      const checkAdmin = await pool.query(
        "SELECT id FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
      )
      adminExiste = checkAdmin.rows.length > 0
    } catch (dbError) {
      adminExiste = false
    }

    // Se ja existe admin, exigir autenticacao
    if (adminExiste && (!usuario || !verificarPermissao(usuario, ['administrador']))) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Acesso negado. Apenas administradores podem criar novos usuarios.',
        codigo: 'UNAUTHORIZED'
      }, { status: 401 })
    }

    // Verificar variaveis de ambiente
    if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Variaveis de ambiente do banco nao configuradas',
        codigo: 'DB_CONFIG_ERROR'
      }, { status: 500 })
    }

    // Verificar se ja existe admin com este email
    const checkExistente = await pool.query(
      "SELECT id FROM usuarios WHERE email = 'admin@sisam.com'"
    )

    if (checkExistente.rows.length > 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Usuario administrador ja existe'
      })
    }

    // Gerar senha segura aleatoria
    const senhaTemporaria = crypto.randomBytes(16).toString('hex')
    const senhaHash = await hashPassword(senhaTemporaria)

    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
    )

    // NAO retornar a senha - o admin deve resetar via banco de dados
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Usuario administrador criado. Defina a senha via banco de dados ou processo de recuperacao.',
      aviso: 'Por seguranca, a senha temporaria NAO e exibida.'
    })
  } catch (error: any) {
    console.error('Erro ao criar usuario:', error)
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao criar usuario',
      codigo: 'CREATE_ERROR'
    }, { status: 500 })
  }
}

