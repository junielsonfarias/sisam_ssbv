/**
 * Templates HTML para e-mails do sistema.
 *
 * Cada template recebe parâmetros tipados e devolve uma string HTML
 * com fallback de texto plano gerado automaticamente pelo sender.
 *
 * @module lib/email/templates
 */

const COLOR_PRIMARY = '#4f46e5' // indigo-600
const COLOR_TEXT = '#1f2937' // gray-800
const COLOR_MUTED = '#6b7280' // gray-500

/**
 * Wrapper padrão com header + footer institucional.
 */
function layout(conteudo: string, titulo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f3f4f6;color:${COLOR_TEXT};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);">
          <tr>
            <td style="background:${COLOR_PRIMARY};padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">SISAM / Educatec</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px;">Secretaria Municipal de Educação</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">${conteudo}</td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:${COLOR_MUTED};font-size:12px;text-align:center;">
              Este é um e-mail automático. Não responda esta mensagem.<br>
              Em caso de dúvidas, contate a Secretaria de Educação do seu município.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================================================
// TEMPLATE: Recuperação de senha
// ============================================================================

export interface RecuperacaoSenhaParams {
  nome: string
  linkRedefinicao: string
  /** Minutos até o link expirar (default: 60) */
  expiracaoMinutos?: number
}

export function recuperacaoSenhaTemplate(params: RecuperacaoSenhaParams): {
  subject: string
  html: string
} {
  const expiracao = params.expiracaoMinutos ?? 60
  const conteudo = `
    <h2 style="margin:0 0 16px;color:${COLOR_TEXT};font-size:20px;">Recuperar senha</h2>
    <p style="margin:0 0 16px;line-height:1.6;">Olá, <strong>${escapeHtml(params.nome)}</strong>.</p>
    <p style="margin:0 0 16px;line-height:1.6;">
      Recebemos uma solicitação para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha:
    </p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${escapeAttr(params.linkRedefinicao)}"
         style="display:inline-block;padding:14px 28px;background:${COLOR_PRIMARY};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Redefinir senha
      </a>
    </p>
    <p style="margin:0 0 12px;line-height:1.6;font-size:13px;color:${COLOR_MUTED};">
      Ou copie e cole este link no navegador:<br>
      <span style="color:${COLOR_PRIMARY};word-break:break-all;">${escapeHtml(params.linkRedefinicao)}</span>
    </p>
    <p style="margin:24px 0 0;padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:13px;line-height:1.5;">
      <strong>Atenção:</strong> este link expira em ${expiracao} minutos.
      Se você não solicitou a redefinição de senha, ignore este e-mail — sua senha continua a mesma.
    </p>
  `

  return {
    subject: 'Recuperação de senha — SISAM/Educatec',
    html: layout(conteudo, 'Recuperar senha'),
  }
}

// ============================================================================
// TEMPLATE: Confirmação de troca de senha
// ============================================================================

export interface SenhaAlteradaParams {
  nome: string
  data: string
  ipParcial: string
}

export function senhaAlteradaTemplate(params: SenhaAlteradaParams): {
  subject: string
  html: string
} {
  const conteudo = `
    <h2 style="margin:0 0 16px;color:${COLOR_TEXT};font-size:20px;">Senha alterada com sucesso</h2>
    <p style="margin:0 0 16px;line-height:1.6;">Olá, <strong>${escapeHtml(params.nome)}</strong>.</p>
    <p style="margin:0 0 16px;line-height:1.6;">
      A sua senha foi alterada em <strong>${escapeHtml(params.data)}</strong>.
    </p>
    <p style="margin:0 0 16px;line-height:1.6;font-size:13px;color:${COLOR_MUTED};">
      Origem aproximada: ${escapeHtml(params.ipParcial)}
    </p>
    <p style="margin:24px 0 0;padding:12px;background:#fee2e2;border-left:4px solid #ef4444;border-radius:4px;font-size:13px;line-height:1.5;">
      <strong>Você não fez essa alteração?</strong>
      Entre em contato com a Secretaria de Educação imediatamente para proteger a sua conta.
    </p>
  `

  return {
    subject: 'Sua senha foi alterada — SISAM/Educatec',
    html: layout(conteudo, 'Senha alterada'),
  }
}

// ============================================================================
// TEMPLATE: Código 2FA (usado em fluxos futuros)
// ============================================================================

export interface Codigo2FAParams {
  nome: string
  codigo: string
  /** Minutos até expirar (default: 10) */
  expiracaoMinutos?: number
}

export function codigo2FATemplate(params: Codigo2FAParams): {
  subject: string
  html: string
} {
  const expiracao = params.expiracaoMinutos ?? 10
  const conteudo = `
    <h2 style="margin:0 0 16px;color:${COLOR_TEXT};font-size:20px;">Código de verificação</h2>
    <p style="margin:0 0 16px;line-height:1.6;">Olá, <strong>${escapeHtml(params.nome)}</strong>.</p>
    <p style="margin:0 0 16px;line-height:1.6;">Use o código abaixo para concluir o login:</p>
    <p style="text-align:center;margin:32px 0;">
      <span style="display:inline-block;padding:16px 32px;background:#f3f4f6;color:${COLOR_PRIMARY};font-size:32px;font-weight:700;letter-spacing:8px;border-radius:8px;font-family:'Courier New',monospace;">
        ${escapeHtml(params.codigo)}
      </span>
    </p>
    <p style="margin:0 0 16px;line-height:1.6;font-size:13px;color:${COLOR_MUTED};text-align:center;">
      Código válido por ${expiracao} minutos.
    </p>
    <p style="margin:24px 0 0;padding:12px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;font-size:13px;line-height:1.5;">
      <strong>Nunca compartilhe este código.</strong> Nenhum servidor ou colaborador irá pedir o seu código.
    </p>
  `

  return {
    subject: 'Seu código de verificação — SISAM/Educatec',
    html: layout(conteudo, 'Código de verificação'),
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(str: string): string {
  return escapeHtml(str)
}
