import pool from '@/database/connection'

/**
 * Registra uma ação de auditoria no sistema.
 * Não lança exceção — auditoria nunca deve bloquear a operação principal.
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
    console.error('[Auditoria] Erro ao registrar:', error)
    // Não lançar erro - auditoria não deve bloquear operações
  }
}
