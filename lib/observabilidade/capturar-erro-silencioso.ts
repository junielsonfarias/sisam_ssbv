import * as Sentry from '@sentry/nextjs'

/**
 * Reporta ao Sentry um erro de query que foi ENGOLIDO por um wrapper "seguro"
 * (`safeQuery`, `executarQuerySegura`, `.catch(() => fallback)`).
 *
 * POR QUE EXISTE (auditoria 17/06/2026):
 * Esses wrappers capturam o erro, logam e retornam um fallback vazio — a tela
 * não quebra, mas o bug fica INVISÍVEL. Como o erro é capturado (não propagado),
 * a instrumentação automática do Sentry nunca o vê. Foi assim que os bugs de
 * coluna inexistente (`presenca`, `serie_numero`) viveram escondidos: só
 * apareciam no log do servidor, nunca como alerta. Este helper restaura a
 * visibilidade — sem alterar o comportamento de fallback.
 *
 * - No-op se o Sentry não estiver configurado (SENTRY_DSN ausente em dev).
 * - Nunca lança: observabilidade jamais deve quebrar o fluxo de negócio.
 * - NÃO envia `params` (podem conter PII/LGPD) — apenas a origem, a descrição
 *   e o SQL template (com placeholders $1, $2... sem dados).
 *
 * Filtre no Sentry por `tags.silenciado = true` para ver toda esta classe.
 */
export function reportarErroSilencioso(
  error: unknown,
  contexto: { origem: string; descricao?: string; sql?: string }
): void {
  try {
    Sentry.captureException(error, {
      level: 'error',
      tags: { silenciado: true, origem: contexto.origem },
      extra: {
        descricao: contexto.descricao ?? null,
        // Apenas o template do SQL (sem params) — evita vazar PII.
        sql: contexto.sql ? contexto.sql.replace(/\s+/g, ' ').trim().slice(0, 500) : null,
      },
    })
  } catch {
    // Observabilidade nunca deve derrubar o fluxo principal.
  }
}
