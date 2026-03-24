import pool from '@/database/connection'
import { PoolClient } from 'pg'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 100

/**
 * Verifica se o erro é transiente e vale retry (deadlock, serialization failure).
 */
function isRetryableError(err: unknown): boolean {
  const code = (err as any)?.code
  // 40001 = serialization_failure, 40P01 = deadlock_detected
  return code === '40001' || code === '40P01'
}

/**
 * Executa uma função dentro de uma transação PostgreSQL.
 * Gerencia BEGIN/COMMIT/ROLLBACK/release automaticamente.
 *
 * Se ocorrer deadlock ou serialization failure, tenta novamente
 * até 3x com backoff exponencial (100ms, 200ms, 400ms).
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
  fn: (client: PoolClient) => Promise<T>,
  options?: { maxRetries?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      try { await client.query('ROLLBACK') } catch { /* ignore rollback error */ }
      lastError = err

      if (isRetryableError(err) && attempt < maxRetries - 1) {
        // Backoff exponencial: 100ms, 200ms, 400ms
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        console.warn(`[withTransaction] Deadlock/serialization (tentativa ${attempt + 1}/${maxRetries}), retry em ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw err
    } finally {
      client.release()
    }
  }

  throw lastError
}
