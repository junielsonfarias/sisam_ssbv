import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { comparePassword, generateToken } from '@/lib/auth'
import { checkRateLimit, resetRateLimit, getClientIP, createRateLimitKey } from '@/lib/rate-limiter'
import { SESSAO, PG_ERRORS } from '@/lib/constants'
import { DatabaseError } from '@/lib/validation'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import crypto from 'crypto'

const log = createLogger('AuthLogin')

const loginBodySchema = z.object({
  email: z.string().min(1, 'Email é obrigatório').max(254),
  senha: z.string().min(1, 'Senha é obrigatória'),
})

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    // Obter IP do cliente para rate limiting
    const clientIP = getClientIP(request)

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      log.error('Erro ao parsear JSON', jsonError)
      return NextResponse.json(
        { mensagem: 'Erro ao processar dados da requisição' },
        { status: 400 }
      )
    }

    const parsed = loginBodySchema.safeParse(body)
    if (!parsed.success) {
      const errors = parsed.error.errors.map(err => ({
        campo: err.path.join('.'),
        mensagem: err.message
      }))
      return NextResponse.json(
        { mensagem: 'Dados inválidos', erros: errors },
        { status: 400 }
      )
    }

    const { email, senha } = parsed.data

    // Verificar rate limit ANTES de processar login
    // Usar combinacao de IP + email para evitar ataques distribuidos
    const rateLimitKey = createRateLimitKey(clientIP, email)
    const rateLimitResult = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000) // 5 tentativas em 15 min

    if (!rateLimitResult.allowed) {
      log.warn(`Rate limit excedido para ${rateLimitKey}`)
      return NextResponse.json(
        {
          mensagem: rateLimitResult.message || 'Muitas tentativas de login. Tente novamente mais tarde.',
          erro: 'RATE_LIMIT_EXCEEDED',
          tentativas_restantes: 0,
          bloqueado_ate: rateLimitResult.blockedUntil
        },
        { status: 429 }
      )
    }

    // Log com IP mascarado para privacidade
    const maskedIP = clientIP.split('.').slice(0, 2).join('.') + '.*.*'
    log.info(`Tentativa de login para: ${email} (IP: ${maskedIP})`)

    // Verificar se JWT_SECRET está configurado
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 20) {
      log.error('JWT_SECRET não configurado ou muito curto')
      return NextResponse.json(
        { mensagem: 'Erro na configuração do servidor' },
        { status: 500 }
      )
    }

    // Verificar conexão com banco
    let result
    try {
      // Verificar se as variáveis de ambiente estão configuradas antes de tentar conectar
      const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
      
      if (missingVars.length > 0) {
        log.error(`Variáveis de ambiente não configuradas: ${missingVars.join(', ')}`)
        return NextResponse.json(
          { mensagem: 'Erro na configuração do servidor' },
          { status: 500 }
        )
      }
      
      result = await pool.query(
        'SELECT id, nome, email, senha, tipo_usuario, polo_id, escola_id, ativo, acesso_sisam, acesso_gestor FROM usuarios WHERE email = $1 AND ativo = true',
        [email.toLowerCase()]
      )
    } catch (dbError: any) {
      const err = dbError as Error & { code?: string }
      // Log detalhado apenas no servidor
      log.error(`Erro ao consultar banco: ${(err as Error).message} | código: ${(err as DatabaseError).code}`, err)

      // Resposta genérica ao cliente — NUNCA expor detalhes da infra
      return NextResponse.json(
        { mensagem: 'Erro ao conectar com o banco de dados' },
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
      log.error('Usuário sem ID')
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }

    if (!usuario.email) {
      log.error('Usuário sem email')
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }
    
    // Verificar se usuário tem senha
    if (!usuario.senha) {
      log.error(`Usuário sem senha cadastrada: ${usuario.email}`)
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }

    let senhaValida
    try {
      senhaValida = await comparePassword(senha, usuario.senha)
    } catch (bcryptError) {
      log.error(`Erro ao comparar senha: ${(bcryptError as Error).message}`, bcryptError)
      return NextResponse.json(
        { mensagem: 'Erro ao validar credenciais' },
        { status: 500 }
      )
    }

    if (!senhaValida) {
      log.warn(`Login falhou (senha incorreta) | usuario:${email} | IP:${maskedIP}`)
      return NextResponse.json(
        { mensagem: 'Email ou senha incorretos' },
        { status: 401 }
      )
    }

    // Validar tipo_usuario
    const tiposValidos = ['administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador', 'responsavel']
    const tipoUsuario = String(usuario.tipo_usuario || '').toLowerCase()

    if (!tipoUsuario || !tiposValidos.includes(tipoUsuario)) {
      log.error(`Tipo de usuário inválido: ${usuario.tipo_usuario} (normalizado: ${tipoUsuario})`)
      return NextResponse.json(
        { mensagem: 'Erro na configuração da conta. Entre em contato com o administrador.' },
        { status: 500 }
      )
    }

    // Preparar payload do token
    const tokenPayload = {
      userId: String(usuario.id),
      email: String(usuario.email),
      tipoUsuario: tipoUsuario as 'administrador' | 'tecnico' | 'polo' | 'escola' | 'professor' | 'editor' | 'publicador' | 'responsavel',
      poloId: usuario.polo_id ? String(usuario.polo_id) : null,
      escolaId: usuario.escola_id ? String(usuario.escola_id) : null,
    }

    // Login bem sucedido - resetar rate limit para este usuario
    resetRateLimit(rateLimitKey)

    log.info(`Login bem-sucedido | usuario:${tokenPayload.email} (${tokenPayload.tipoUsuario}) | IP:${maskedIP}`)

    // Registrar log de acesso (em background para nao impactar performance)
    // Email hasheado e sem nome para anonimização (LGPD)
    const userAgent = request.headers.get('user-agent') || 'Desconhecido'
    const emailHash = crypto.createHash('sha256').update(usuario.email).digest('hex').slice(0, 16)
    registrarLogAcesso({
      usuarioId: usuario.id,
      email: emailHash,
      tipoUsuario: usuario.tipo_usuario,
      ipAddress: maskedIP,
      userAgent: userAgent
    }).catch(err => {
      log.error('Erro ao registrar log de acesso', err)
    })

    let token
    try {
      token = generateToken(tokenPayload)
      log.info('Token gerado com sucesso')
    } catch (tokenError) {
      log.error(`Erro ao gerar token: ${(tokenError as Error).message}`, tokenError)
      return NextResponse.json(
        { mensagem: 'Erro ao processar autenticação' },
        { status: 500 }
      )
    }

    // Para usuários tipo escola, buscar se o Gestor Escolar está habilitado
    let gestorEscolarHabilitado = true // admin/tecnico sempre têm acesso
    if (usuario.tipo_usuario === 'escola' && usuario.escola_id) {
      try {
        const escolaResult = await pool.query(
          'SELECT gestor_escolar_habilitado FROM escolas WHERE id = $1',
          [usuario.escola_id]
        )
        gestorEscolarHabilitado = escolaResult.rows[0]?.gestor_escolar_habilitado ?? false
      } catch {
        gestorEscolarHabilitado = false
      }
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
        gestor_escolar_habilitado: gestorEscolarHabilitado,
        acesso_sisam: usuario.acesso_sisam !== false,
        acesso_gestor: usuario.acesso_gestor === true,
      },
    }
    
    log.info('Criando resposta de sucesso')
    
    // Criar resposta
    const response = NextResponse.json(responseData, { status: 200 })
    
    // Definir cookie
    try {
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' || (process.env.VERCEL_URL || '').includes('https'),
        sameSite: 'lax',
        maxAge: SESSAO.COOKIE_MAX_AGE,
        path: '/',
      })
      log.info('Cookie definido com sucesso')
    } catch (cookieError) {
      log.error(`Erro ao definir cookie: ${(cookieError as Error).message}`, cookieError)
    }

    log.info('Retornando resposta de login')
    return response
  } catch (error: unknown) {
    log.error('Erro inesperado', error)
    return NextResponse.json(
      { mensagem: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Funcao para registrar log de acesso no banco de dados
interface LogAcessoParams {
  usuarioId: string
  /** Email hasheado (SHA-256, 16 chars) para anonimização LGPD */
  email: string
  tipoUsuario: string
  ipAddress: string
  userAgent: string
}

async function registrarLogAcesso(params: LogAcessoParams): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO logs_acesso (usuario_id, email, tipo_usuario, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.usuarioId,
        params.email,
        params.tipoUsuario,
        params.ipAddress,
        params.userAgent
      ]
    )
    log.info(`Log de acesso registrado para: ${params.email}`)
  } catch (error) {
    // Nao propagar erro - log de acesso nao deve impedir login
    log.error('Falha ao registrar log de acesso', error)
  }
}
