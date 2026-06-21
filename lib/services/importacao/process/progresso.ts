/**
 * Atualizacao de progresso e verificacao de cancelamento durante a Fase 5.
 *
 * @module services/importacao/process/progresso
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'

const log = createLogger('Importacao')

/**
 * Reconsulta o status da importacao e atualiza o progresso (linhas processadas).
 * Retorna `true` quando o usuario cancelou (status='cancelado'), caso em que ja
 * persiste a finalizacao do cancelamento; o chamador deve interromper a Fase 5.
 */
export async function atualizarProgresso(
  importacaoId: string,
  linhasProcessadas: number,
  linhasComErro: number,
  totalLinhas: number
): Promise<boolean> {
  const statusCheck = await pool.query(
    'SELECT status FROM importacoes WHERE id = $1',
    [importacaoId]
  )

  if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'cancelado') {
    await pool.query(
      'UPDATE importacoes SET linhas_processadas = $1, linhas_com_erro = $2, status = \'cancelado\', concluido_em = CURRENT_TIMESTAMP WHERE id = $3',
      [linhasProcessadas, linhasComErro, importacaoId]
    )
    log.info(`[IMPORTACAO ${importacaoId}] Cancelada pelo usuario`)
    return true
  }

  await pool.query(
    'UPDATE importacoes SET linhas_processadas = $1, linhas_com_erro = $2 WHERE id = $3',
    [linhasProcessadas, linhasComErro, importacaoId]
  )

  const progresso = Math.round((linhasProcessadas / totalLinhas) * 100)
  log.info(`[FASE 5] Progresso: ${progresso}% (${linhasProcessadas}/${totalLinhas} linhas)`)
  return false
}
