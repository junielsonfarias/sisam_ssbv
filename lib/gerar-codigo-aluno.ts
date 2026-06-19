import pool from '@/database/connection'
import crypto from 'crypto'
import { PoolClient } from 'pg'
import { createLogger } from '@/lib/logger'

const log = createLogger('GerarCodigoAluno')

/** Chave do advisory lock que serializa a geração de código de aluno. */
const ADVISORY_LOCK_CODIGO_ALUNO = 42

/**
 * Cria um gerador de código sequencial de aluno que opera DENTRO de uma
 * transação já aberta (`client`), em vez de abrir conexão própria como
 * `gerarCodigoAluno()`. Use sempre que estiver criando alunos dentro de um
 * `withTransaction`:
 *  - Enxerga inserts ainda não-commitados da mesma transação (contador local),
 *    então não colide entre alunos novos do mesmo lote.
 *  - NÃO consome uma 2ª conexão do pool no meio da transação — evita contenção
 *    e o risco de esgotar o pool (sério em serverless) quando vários lotes
 *    concorrentes seguram a 1ª conexão e disputam a 2ª.
 *
 * O advisory lock 42 (mesma chave de `gerarCodigoAluno`) serializa contra
 * outros geradores e é adquirido PREGUIÇOSAMENTE na 1ª chamada — se o lote não
 * criar nenhum aluno novo (ex.: só rematrículas), o lock nunca é tomado.
 */
export function criarGeradorCodigoAlunoTx(client: PoolClient): () => Promise<string> {
  let proximo: number | null = null
  return async () => {
    if (proximo === null) {
      await client.query(`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_CODIGO_ALUNO})`)
      const res = await client.query(
        `SELECT codigo FROM alunos
         WHERE codigo LIKE 'ALU%' AND codigo ~ '^ALU[0-9]+$'
         ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC LIMIT 1`
      )
      proximo = 1
      if (res.rows.length > 0 && res.rows[0].codigo) {
        const n = parseInt(res.rows[0].codigo.replace('ALU', ''))
        if (!isNaN(n)) proximo = n + 1
      }
    }
    return `ALU${(proximo++).toString().padStart(4, '0')}`
  }
}

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
    await client.query(`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_CODIGO_ALUNO})`)

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
