/**
 * POST /api/auth/recuperar-senha
 *
 * Inicia o fluxo de recuperação de senha. Gera token aleatório de 32 bytes,
 * armazena o hash no banco e envia link por e-mail (via Resend).
 *
 * Sempre retorna 200 (mesmo se o e-mail não existir) — não vaza existência
 * de contas. O resultado real chega apenas pelo e-mail.
 *
 * Rate limit: 3 solicitações por e-mail em 1h, 10 por IP em 1h.
 */

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import { z } from 'zod'
import crypto from 'crypto'
import { createLogger } from '@/lib/logger'
import { enviarEmail } from '@/lib/email/sender'
import { recuperacaoSenhaTemplate } from '@/lib/email/templates'
import { checkRateLimitAsync, createRateLimitKeyPorUsuario } from '@/lib/rate-limiter-async'
import { getClientIP } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

const log = createLogger('RecuperarSenha')

const schema = z.object({
  email: z.string().email('E-mail inválido').max(254),
})

// Token: 32 bytes random → 64 hex chars
function gerarToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, hash }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { mensagem: 'E-mail inválido' },
        { status: 400 }
      )
    }

    const email = parsed.data.email.toLowerCase().trim()
    const clientIP = getClientIP(request)

    // Rate limit por usuário (3 em 1h)
    const usuarioKey = `recup:${createRateLimitKeyPorUsuario(email)}`
    const usuarioRate = await checkRateLimitAsync(usuarioKey, 3, 60 * 60 * 1000, 60 * 60 * 1000)
    if (!usuarioRate.allowed) {
      // Não revela que está bloqueado — só responde sucesso
      log.warn(`Rate limit recuperação excedido: ${email}`)
      return successResponse()
    }

    // Rate limit por IP (10 em 1h)
    const ipRate = await checkRateLimitAsync(`recup:ip:${clientIP}`, 10, 60 * 60 * 1000, 60 * 60 * 1000)
    if (!ipRate.allowed) {
      log.warn(`Rate limit IP excedido em recuperação: ${clientIP}`)
      return successResponse()
    }

    // Busca usuário (sem revelar se existe)
    const result = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE email = $1 AND ativo = true LIMIT 1',
      [email]
    )

    if (result.rows.length === 0) {
      // Usuário não existe — resposta genérica para não vazar
      log.info(`Solicitação para e-mail inexistente: ${email}`)
      return successResponse()
    }

    const usuario = result.rows[0]

    // Invalida tokens anteriores ainda não usados deste usuário
    await pool.query(
      `UPDATE tokens_recuperacao_senha
         SET usado_em = NOW()
       WHERE usuario_id = $1 AND usado_em IS NULL AND expira_em > NOW()`,
      [usuario.id]
    )

    // Gera novo token (válido por 1h)
    const { token, hash } = gerarToken()
    const userAgent = request.headers.get('user-agent') || null

    await pool.query(
      `INSERT INTO tokens_recuperacao_senha
         (usuario_id, token_hash, expira_em, ip_solicitacao, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', $3, $4)`,
      [usuario.id, hash, clientIP, userAgent]
    )

    // Monta link
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const link = `${baseUrl}/redefinir-senha?token=${token}`

    // Envia e-mail
    const { subject, html } = recuperacaoSenhaTemplate({
      nome: usuario.nome || 'Usuário',
      linkRedefinicao: link,
      expiracaoMinutos: 60,
    })

    const envio = await enviarEmail({
      to: usuario.email,
      subject,
      html,
    })

    log.info(`Token de recuperação gerado | enviado=${envio.enviado}`, {
      userId: usuario.id,
    })

    return successResponse()
  } catch (error) {
    log.error('Erro inesperado', error)
    // Mantém resposta genérica mesmo em caso de erro
    return successResponse()
  }
}

function successResponse() {
  return NextResponse.json(
    {
      mensagem:
        'Se este e-mail estiver cadastrado, enviaremos um link de redefinição em alguns instantes. Verifique a caixa de entrada e o spam.',
    },
    { status: 200 }
  )
}
