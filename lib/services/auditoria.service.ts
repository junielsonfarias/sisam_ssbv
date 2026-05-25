import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('Auditoria')

/**
 * Registra uma ação de auditoria no sistema.
 *
 * Não lança exceção — auditoria nunca deve bloquear a operação principal.
 *
 * **Importante:** os dados gravados em `logs_auditoria` são COMPLETOS
 * (sem mascaramento), pois são necessários para investigação legítima.
 * Apenas o log de erro estruturado mascara PII em produção.
 */
export async function registrarAuditoria(params: {
  usuarioId?: string | null
  usuarioEmail?: string | null
  acao: string
  entidade: string
  entidadeId?: string | null
  detalhes?: Record<string, any> | null
  ip?: string | null
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO logs_auditoria (usuario_id, usuario_email, acao, entidade, entidade_id, detalhes, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.usuarioId || null,
        params.usuarioEmail || null,
        params.acao,
        params.entidade,
        params.entidadeId || null,
        params.detalhes ? JSON.stringify(params.detalhes) : null,
        params.ip || null,
      ]
    )
  } catch (error) {
    log.error('Erro ao registrar auditoria', error, {
      data: { acao: params.acao, entidade: params.entidade, entidadeId: params.entidadeId },
    })
  }
}
