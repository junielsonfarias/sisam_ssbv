import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import pool from '@/database/connection'
import { checkRateLimit, getClientIP, createRateLimitKey } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/cadastro-professor
 * Cadastro público de professor (cria com ativo = false, aguardando ativação)
 * Body: { nome, email, senha, cpf?, telefone? }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 tentativas por 15 min
    const clientIP = getClientIP(request)
    const rateLimitKey = createRateLimitKey(clientIP, 'cadastro-professor')
    const rateLimitResult = checkRateLimit(rateLimitKey, 3, 15 * 60 * 1000)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { mensagem: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
        { status: 429 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ mensagem: 'Dados inválidos' }, { status: 400 })
    }

    const { nome, email, senha, cpf, telefone } = body

    // Validações
    if (!nome || !email || !senha) {
      return NextResponse.json({ mensagem: 'Nome, email e senha são obrigatórios' }, { status: 400 })
    }

    if (typeof nome !== 'string' || nome.trim().length < 3) {
      return NextResponse.json({ mensagem: 'Nome deve ter pelo menos 3 caracteres' }, { status: 400 })
    }

    if (typeof email !== 'string' || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json({ mensagem: 'Email inválido' }, { status: 400 })
    }

    if (typeof senha !== 'string' || senha.length < 8) {
      return NextResponse.json({ mensagem: 'Senha deve ter pelo menos 8 caracteres' }, { status: 400 })
    }

    // Validar CPF se fornecido (formato básico)
    const cpfLimpo = cpf ? String(cpf).replace(/\D/g, '') : null
    if (cpfLimpo && cpfLimpo.length !== 11) {
      return NextResponse.json({ mensagem: 'CPF inválido (deve ter 11 dígitos)' }, { status: 400 })
    }

    const emailNorm = email.toLowerCase().trim()

    // Verificar se email já existe
    const existeEmail = await pool.query(
      'SELECT id, ativo, tipo_usuario FROM usuarios WHERE email = $1',
      [emailNorm]
    )
    if (existeEmail.rows.length > 0) {
      const existing = existeEmail.rows[0]
      if (existing.tipo_usuario === 'professor' && !existing.ativo) {
        return NextResponse.json(
          { mensagem: 'Este email já possui um cadastro pendente de ativação. Aguarde o administrador ativar sua conta.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ mensagem: 'Este email já está cadastrado no sistema' }, { status: 409 })
    }

    // Verificar CPF duplicado se fornecido
    if (cpfLimpo) {
      const existeCpf = await pool.query(
        "SELECT id FROM usuarios WHERE cpf = $1",
        [cpfLimpo]
      )
      if (existeCpf.rows.length > 0) {
        return NextResponse.json({ mensagem: 'Este CPF já está cadastrado no sistema' }, { status: 409 })
      }
    }

    const senhaHash = await hashPassword(senha)

    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo, cpf, telefone)
       VALUES ($1, $2, $3, 'professor', false, $4, $5)
       RETURNING id, nome, email, criado_em`,
      [nome.trim(), emailNorm, senhaHash, cpfLimpo, telefone?.trim() || null]
    )

    console.log(`Novo cadastro de professor pendente: ${emailNorm}`)

    return NextResponse.json({
      mensagem: 'Cadastro realizado com sucesso! Aguarde a ativação pelo administrador da sua escola.',
      professor: {
        id: result.rows[0].id,
        nome: result.rows[0].nome,
        email: result.rows[0].email,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Erro no cadastro de professor:', error)
    return NextResponse.json({ mensagem: 'Erro interno do servidor' }, { status: 500 })
  }
}
