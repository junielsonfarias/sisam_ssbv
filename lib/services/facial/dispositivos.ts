/**
 * Facial — dispositivos de reconhecimento (terminais) e seus logs.
 *
 * @module services/facial/dispositivos
 */

import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import {
  createWhereBuilder, addCondition, addAccessControl, buildConditionsString,
} from '@/lib/api-helpers'
import type { DispositivoFacial, DispositivoDetalhado, FiltrosDispositivo } from './types'

/**
 * Busca dispositivos faciais com filtro de acesso (escola/polo/admin).
 */
export async function buscarDispositivos(
  filtros: FiltrosDispositivo,
): Promise<DispositivoFacial[]> {
  const where = createWhereBuilder()
  if (filtros.escolaId) addCondition(where, 'd.escola_id', filtros.escolaId)
  if (filtros.usuario) {
    addAccessControl(where, filtros.usuario as Parameters<typeof addAccessControl>[1], {
      escolaIdField: 'd.escola_id',
      poloIdField: 'e.polo_id',
    })
  }

  const result = await pool.query(
    `SELECT d.id, d.nome, d.localizacao, d.status, d.ultimo_ping,
           d.metadata, d.criado_em, d.atualizado_em, d.api_key_prefix,
           e.nome AS escola_nome
    FROM dispositivos_faciais d
    INNER JOIN escolas e ON e.id = d.escola_id
    WHERE ${buildConditionsString(where)}
    ORDER BY d.criado_em DESC`,
    where.params,
  )

  return result.rows
}

/**
 * Busca detalhes de um dispositivo + logs recentes.
 * Remove api_key_hash da resposta.
 */
export async function buscarDispositivoDetalhado(
  dispositivoId: string,
): Promise<DispositivoDetalhado | null> {
  const result = await pool.query(
    `SELECT d.*, e.nome AS escola_nome
     FROM dispositivos_faciais d
     INNER JOIN escolas e ON e.id = d.escola_id
     WHERE d.id = $1`,
    [dispositivoId],
  )

  if (result.rows.length === 0) return null

  // Buscar logs recentes
  const logsResult = await pool.query(
    `SELECT evento, detalhes, criado_em
     FROM logs_dispositivos
     WHERE dispositivo_id = $1
     ORDER BY criado_em DESC
     LIMIT 50`,
    [dispositivoId],
  )

  // Excluir api_key_hash da resposta
  const dispositivo = result.rows[0]
  delete dispositivo.api_key_hash

  return {
    dispositivo,
    logs: logsResult.rows,
  }
}

/**
 * Exclui dispositivo permanentemente (logs + dispositivo em transação).
 * Apenas dispositivos bloqueados podem ser excluídos.
 */
export async function excluirDispositivo(
  dispositivoId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM logs_dispositivos WHERE dispositivo_id = $1', [dispositivoId])
    await client.query('DELETE FROM dispositivos_faciais WHERE id = $1', [dispositivoId])
  })
}
