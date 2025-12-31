import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { comparePassword, generateToken } from '@/lib/auth'

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (jsonError: any) {
      console.error('Erro ao parsear JSON:', jsonError)
      return NextResponse.json(
        { mensagem: 'Erro ao processar dados da requisição' },
        { status: 400 }
      )
    }
    
    const { email, senha } = body
    
    if (!email || !senha) {
      return NextResponse.json(
        { mensagem: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }
    
    console.log('Tentativa de login para:', email)

    // Verificar conexão com banco
    let result
    try {
      result = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
        [email.toLowerCase()]
      )
    } catch (dbError: any) {
      console.error('Erro ao consultar banco de dados:', dbError)
      return NextResponse.json(
        { 
          mensagem: 'Erro ao conectar com o banco de dados',
          detalhes: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500 }
      )
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { mensagem: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    const usuario = result.rows[0]
    
    // Validar dados do usuário
    if (!usuario.id) {
      console.error('Usuário sem ID:', usuario)
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }

    if (!usuario.email) {
      console.error('Usuário sem email:', usuario)
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }
    
    // Verificar se usuário tem senha
    if (!usuario.senha) {
      console.error('Usuário sem senha cadastrada:', usuario.email)
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }

    let senhaValida
    try {
      senhaValida = await comparePassword(senha, usuario.senha)
    } catch (bcryptError: any) {
      console.error('Erro ao comparar senha:', bcryptError)
      return NextResponse.json(
        { 
          mensagem: 'Erro ao validar senha',
          detalhes: process.env.NODE_ENV === 'development' ? bcryptError.message : undefined
        },
        { status: 500 }
      )
    }

    if (!senhaValida) {
      return NextResponse.json(
        { mensagem: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Validar tipo_usuario
    const tiposValidos = ['administrador', 'tecnico', 'polo', 'escola']
    const tipoUsuario = String(usuario.tipo_usuario || '').toLowerCase()
    
    if (!tipoUsuario || !tiposValidos.includes(tipoUsuario)) {
      console.error('Tipo de usuário inválido:', usuario.tipo_usuario, 'Tipo normalizado:', tipoUsuario)
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }

    // Preparar payload do token
    const tokenPayload = {
      userId: String(usuario.id),
      email: String(usuario.email),
      tipoUsuario: tipoUsuario as 'administrador' | 'tecnico' | 'polo' | 'escola',
      poloId: usuario.polo_id ? String(usuario.polo_id) : null,
      escolaId: usuario.escola_id ? String(usuario.escola_id) : null,
    }

    console.log('Gerando token com payload:', {
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      tipoUsuario: tokenPayload.tipoUsuario,
      poloId: tokenPayload.poloId,
      escolaId: tokenPayload.escolaId,
    })

    let token
    try {
      token = generateToken(tokenPayload)
      console.log('Token gerado com sucesso')
    } catch (tokenError: any) {
      console.error('Erro ao gerar token:', tokenError)
      console.error('Stack trace:', tokenError.stack)
      return NextResponse.json(
        { 
          mensagem: 'Erro ao gerar token de autenticação',
          detalhes: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
        },
        { status: 500 }
      )
    }

    // Criar resposta JSON
    const responseData = {
      mensagem: 'Login realizado com sucesso',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        polo_id: usuario.polo_id,
        escola_id: usuario.escola_id,
      },
    }
    
    console.log('Criando resposta de sucesso')
    
    // Criar resposta
    const response = NextResponse.json(responseData, { status: 200 })
    
    // Definir cookie
    try {
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        path: '/',
      })
      console.log('Cookie definido com sucesso')
    } catch (cookieError: any) {
      console.error('Erro ao definir cookie:', cookieError)
      console.error('Stack trace do cookie:', cookieError.stack)
      // Continuar mesmo com erro no cookie, o token ainda está na resposta
    }

    console.log('Retornando resposta de login')
    return response
  } catch (error: any) {
    console.error('Erro no login:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { 
        mensagem: 'Erro interno do servidor',
        detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

