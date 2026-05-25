/**
 * POST /api/auth/redefinir-senha
 *
 * Conclui o fluxo de recuperação: recebe token + nova senha, valida o token,
 * troca a senha do usuário e marca o token como usado.
 *
 * Aplica a política de força de senha (lib/utils/senha-forca).
 * Envia e-mail de confirmação após sucesso.
 */

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/database/connection'
import crypto from 'crypto'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'
import { senhaSchema } from '@/lib/schemas/base'
import { createLogger } from '@/lib/logger'
import { enviarEmail } from '@/lib/email/sender'
import { senhaAlteradaTemplate } from '@/lib/email/templates'
import { getClientIP } from '@/lib/rate-limiter'
import { resetRateLimitAsync, createRateLimitKeyPorUsuario } from '@/lib/rate-limiter-async'

export const dynamic = 'force-dynamic'

const log = createLogger('RedefinirSenha')

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, 'Token inválido'),
  novaSenha: senhaSchema,
  confirmarSenha: z.string(),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const erros = parsed.error.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      }))
      return NextResponse.json(
        { mensagem: 'Dados inválidos', erros },
        { status: 400 }
      )
    }

    const { token, novaSenha } = parsed.data
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const clientIP = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || null

    // Busca token válido (não usado, não expirado)
    const tokenResult = await pool.query(
      `SELECT t.id, t.usuario_id, t.expira_em, u.email, u.nome
         FROM tokens_recuperacao_senha t
         INNER JOIN usuarios u ON u.id = t.usuario_id
        WHERE t.token_hash = $1
          AND t.usado_em IS NULL
          AND t.expira_em > NOW()
          AND u.ativo = true
        LIMIT 1`,
      [tokenHash]
    )

    if (tokenResult.rows.length === 0) {
      log.warn('Tentativa de redefinição com token inválido/expirado')
      return NextResponse.json(
        { mensagem: 'Link inválido ou expirado. Solicite um novo.' },
        { status: 400 }
      )
    }

    const { id: tokenId, usuario_id, email, nome } = tokenResult.rows[0]

    // Atualiza senha + marca token como usado (transação)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const senhaHash = await hashPassword(novaSenha)
      await client.query(
        'UPDATE usuarios SET senha = $1 WHERE id = $2',
        [senhaHash, usuario_id]
      )

      await client.query(
        `UPDATE tokens_recuperacao_senha
           SET usado_em = NOW(), ip_uso = $1, user_agent_uso = $2
         WHERE id = $3`,
        [clientIP, userAgent, tokenId]
      )

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }

    // Desbloqueia rate limit por usuário (caso estivesse bloqueado por brute-force)
    await resetRateLimitAsync(createRateLimitKeyPorUsuario(email))

    // E-mail de confirmação (não-bloqueante)
    const { subject, html } = senhaAlteradaTemplate({
      nome: nome || 'Usuário',
      data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Belem' }),
      ipParcial: maskarIp(clientIP),
    })
    enviarEmail({ to: email, subject, html }).catch((err) => {
      log.error('Falha ao enviar confirmação de troca de senha', err)
    })

    log.info('Senha redefinida com sucesso', { userId: usuario_id })

    return NextResponse.json(
      { mensagem: 'Senha alterada com sucesso. Você já pode fazer login.' },
      { status: 200 }
    )
  } catch (error) {
    log.error('Erro inesperado', error)
    return NextResponse.json(
      { mensagem: 'Erro ao redefinir senha. Tente novamente.' },
      { status: 500 }
    )
  }
}

function maskarIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'desconhecido'
  const v4 = ip.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/)
  if (v4) return `${v4[1]}.***`
  return ip.slice(0, 8) + '...'
}
