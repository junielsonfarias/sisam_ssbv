import { NextRequest, NextResponse } from 'next/server'
import pool, { resetPool } from '@/database/connection'
import { hashPassword, getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import crypto from 'crypto'

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT DE INICIALIZACAO PROTEGIDO
 *
 * Este endpoint so pode ser usado:
 * 1. Em desenvolvimento (para testes)
 * 2. Por administradores autenticados
 * 3. Quando nao existe nenhum admin no sistema (primeira execucao)
 *
 * Credenciais NUNCA sao retornadas na resposta.
 */
export async function POST(request: NextRequest) {
  try {
    // Em producao, verificar se usuario esta autenticado como admin
    // EXCETO se for primeira inicializacao (nenhum admin existe)
    const usuario = await getUsuarioFromRequest(request)

    // Verificar se ja existe algum admin no sistema
    let adminExiste = false
    try {
      const checkAdmin = await pool.query(
        "SELECT id FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
      )
      adminExiste = checkAdmin.rows.length > 0
    } catch (dbError) {
      // Se der erro de conexao, assumir que nao existe admin ainda
      adminExiste = false
    }

    // Se ja existe admin, exigir autenticacao
    if (adminExiste) {
      if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
        return NextResponse.json({
          erro: true,
          mensagem: 'Acesso negado. Apenas administradores podem usar este endpoint.',
          codigo: 'UNAUTHORIZED'
        }, { status: 401 })
      }
    }

    // Verificar variaveis de ambiente
    if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      return NextResponse.json({
        erro: true,
        mensagem: 'Variaveis de ambiente do banco nao configuradas',
        codigo: 'DB_CONFIG_ERROR'
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
        mensagem: 'Tabela usuarios nao encontrada. Execute o schema SQL primeiro.',
        codigo: 'TABLE_NOT_FOUND'
      }, { status: 500 })
    }

    // Verificar se ja existe admin
    const checkAdminFinal = await pool.query(
      "SELECT id, nome, email FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
    )

    if (checkAdminFinal.rows.length > 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Usuario administrador ja existe',
        usuario: {
          nome: checkAdminFinal.rows[0].nome
        }
      })
    }

    // Gerar senha segura aleatoria (o admin precisara resetar via banco ou outro meio)
    const senhaTemporaria = crypto.randomBytes(16).toString('hex')
    const senhaHash = await hashPassword(senhaTemporaria)

    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, nome, email`,
      ['Administrador', 'admin@sisam.com', senhaHash, 'administrador']
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        sucesso: true,
        mensagem: 'Usuario administrador ja existe ou conflito de email'
      })
    }

    // NAO retornar a senha - o admin deve resetar via banco de dados ou email
    return NextResponse.json({
      sucesso: true,
      mensagem: 'Usuario administrador criado. Acesse o banco de dados para definir a senha ou use o processo de recuperacao.',
      aviso: 'Por seguranca, a senha temporaria NAO e exibida. Resete via banco de dados.'
    })
  } catch (error: any) {
    console.error('Erro na inicializacao:', error)
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao inicializar sistema',
      codigo: 'INIT_ERROR'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticacao - apenas administradores podem ver status
    const usuario = await getUsuarioFromRequest(request)

    // Permitir acesso nao autenticado APENAS para verificar se sistema esta inicializado
    // (se existe algum admin)
    let adminExiste = false
    let conexaoOk = false

    try {
      const checkAdmin = await pool.query(
        "SELECT id FROM usuarios WHERE tipo_usuario = 'administrador' LIMIT 1"
      )
      adminExiste = checkAdmin.rows.length > 0
      conexaoOk = true
    } catch (dbError: any) {
      // Erro de conexao
      conexaoOk = false
    }

    // Se nao esta autenticado, retornar apenas info basica
    if (!usuario || !verificarPermissao(usuario, ['administrador'])) {
      return NextResponse.json({
        sistema_inicializado: adminExiste,
        conexao_banco: conexaoOk,
        mensagem: adminExiste
          ? 'Sistema ja inicializado. Faca login como administrador para mais detalhes.'
          : 'Sistema nao inicializado. Use POST para criar o primeiro administrador.'
      })
    }

    // Usuario autenticado como admin - retornar mais detalhes (mas sem expor sensiveis)
    const status: any = {
      ambiente: process.env.NODE_ENV,
      variaveis_configuradas: {
        DB_HOST: !!process.env.DB_HOST,
        DB_NAME: !!process.env.DB_NAME,
        DB_USER: !!process.env.DB_USER,
        DB_PASSWORD: !!process.env.DB_PASSWORD,
        DB_PORT: !!process.env.DB_PORT,
        JWT_SECRET: !!process.env.JWT_SECRET,
      },
      conexao_banco: conexaoOk,
      admin_existe: adminExiste,
    }

    return NextResponse.json(status)
  } catch (error: any) {
    return NextResponse.json({
      erro: true,
      mensagem: 'Erro ao verificar status',
      codigo: 'STATUS_ERROR'
    }, { status: 500 })
  }
}

