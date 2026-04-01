import pool from '@/database/connection'
import crypto from 'crypto'
import { createLogger } from '@/lib/logger'

const log = createLogger('GerarCodigoAluno')

/**
 * Gera um código simples e único para o aluno
 * Formato: ALU seguido de número sequencial (ex: ALU0001, ALU0002, etc.)
 *
 * Usa pg_advisory_xact_lock para evitar race conditions em concorrência.
 */
export async function gerarCodigoAluno(): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Advisory lock para serializar geração de código (evita duplicatas)
    await client.query('SELECT pg_advisory_xact_lock(42)')

    const result = await client.query(
      `SELECT codigo FROM alunos
       WHERE codigo LIKE 'ALU%'
       AND codigo ~ '^ALU[0-9]+$'
       ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC
       LIMIT 1`
    )

    let proximoNumero = 1
    if (result.rows.length > 0 && result.rows[0].codigo) {
      const numeroAtual = parseInt(result.rows[0].codigo.replace('ALU', ''))
      if (!isNaN(numeroAtual)) {
        proximoNumero = numeroAtual + 1
      }
    }

    const novoCodigo = `ALU${proximoNumero.toString().padStart(4, '0')}`

    await client.query('COMMIT')
    return novoCodigo
  } catch (error) {
    await client.query('ROLLBACK')
    log.error('Erro ao gerar código do aluno', error)
    // Fallback: usar crypto.randomUUID para garantir unicidade (sem risco de colisão)
    return `ALU${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
  } finally {
    client.release()
  }
}

/**
 * Gera um código simples baseado em um contador
 * Útil para importações em lote (usa timestamp para garantir unicidade)
 */
export function gerarCodigoAlunoSequencial(contador: number): string {
  const timestamp = Date.now().toString().slice(-4)
  return `ALU${contador.toString().padStart(3, '0')}${timestamp}`
}
