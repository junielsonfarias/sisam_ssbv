import pool from '@/database/connection'
import { PoolClient } from 'pg'

/**
 * Executa uma função dentro de uma transação PostgreSQL.
 * Gerencia BEGIN/COMMIT/ROLLBACK/release automaticamente.
 *
 * Uso:
 * ```ts
 * const resultado = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO ...', [params])
 *   return { salvos: 1 }
 * })
 * ```
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
