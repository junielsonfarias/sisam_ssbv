/**
 * Serviço de envio de e-mail.
 *
 * Usa Resend (https://resend.com) como provedor principal.
 *
 * Variáveis de ambiente:
 *  - RESEND_API_KEY — chave da API (obrigatória em produção)
 *  - EMAIL_FROM — remetente padrão (ex: "SEMED <noreply@educatec.gov.br>")
 *  - EMAIL_FROM_NAME — nome amigável (opcional)
 *
 * Em desenvolvimento, se `RESEND_API_KEY` não estiver setada, o serviço
 * apenas loga o e-mail no console (modo dry-run) — não falha.
 *
 * @module lib/email/sender
 */

import { createLogger } from '@/lib/logger'

const log = createLogger('Email')

export interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  /** Versão texto plano. Se omitido, é gerado a partir do HTML. */
  text?: string
  /** Override do remetente padrão */
  from?: string
  /** ReplyTo opcional */
  replyTo?: string
}

export interface EmailResult {
  /** ID gerado pelo provedor (Resend) ou marcador local de dry-run */
  id: string
  /** True se foi enviado de fato, false se foi modo dry-run (sem provedor) */
  enviado: boolean
}

/**
 * Strip HTML para gerar versão texto fallback.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getDefaultFrom(): string {
  return process.env.EMAIL_FROM || 'SISAM/Educatec <onboarding@resend.dev>'
}

/**
 * Envia e-mail via Resend (se configurado) ou faz log (dry-run em dev).
 *
 * **Não lança exceção** — retorna `{ enviado: false }` em caso de falha
 * e o erro é logado. Cabe ao chamador decidir se quer rejeitar a operação.
 */
export async function enviarEmail(params: EmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const to = Array.isArray(params.to) ? params.to : [params.to]
  const text = params.text || htmlToText(params.html)

  // Modo dry-run: sem chave, apenas loga
  if (!apiKey) {
    log.warn('RESEND_API_KEY não configurada — modo dry-run (apenas log)', {
      data: {
        to: to.length,
        subject: params.subject,
        preview: text.slice(0, 200),
      },
    })
    return { id: `dryrun-${Date.now()}`, enviado: false }
  }

  try {
    // Import dinâmico para não quebrar se o pacote não estiver instalado em CI sem env
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const result = await resend.emails.send({
      from: params.from || getDefaultFrom(),
      to,
      subject: params.subject,
      html: params.html,
      text,
      replyTo: params.replyTo,
    })

    if (result.error) {
      log.error('Resend retornou erro', result.error, {
        data: { subject: params.subject, to: to.length },
      })
      return { id: `error-${Date.now()}`, enviado: false }
    }

    const id = result.data?.id || `unknown-${Date.now()}`
    log.info(`E-mail enviado (id=${id})`, {
      data: { subject: params.subject, destinatarios: to.length },
    })
    return { id, enviado: true }
  } catch (error) {
    log.error('Falha ao enviar e-mail', error, {
      data: { subject: params.subject },
    })
    return { id: `failed-${Date.now()}`, enviado: false }
  }
}
