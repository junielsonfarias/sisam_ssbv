import { PoolClient } from 'pg'

let savepointSeq = 0

/**
 * Executa `fn` dentro de um SAVEPOINT na transação aberta de `client`.
 *
 * Se `fn` falhar, faz `ROLLBACK TO SAVEPOINT` e relança o erro. Isso preserva
 * o padrão "tenta o item, se falhar continua no próximo" DENTRO de uma única
 * transação: sem o savepoint, o primeiro erro de query (ex.: UNIQUE_VIOLATION)
 * coloca a transação Postgres em estado abortado (25P02) e TODAS as queries
 * seguintes falham — o `COMMIT` no fim vira um ROLLBACK silencioso, descartando
 * tudo enquanto o chamador acha que persistiu.
 *
 * Uso típico (loop tolerante a erro por item, atômico no nível do request):
 * ```ts
 * await withTransaction(async (client) => {
 *   for (const item of itens) {
 *     try {
 *       await withSavepoint(client, () => client.query('INSERT ...', [...]))
 *     } catch (e) {
 *       erros.push(`item ${item}: ${(e as Error).message}`)
 *     }
 *   }
 * })
 * ```
 *
 * Nome do savepoint é único por chamada (evita a armadilha de reuso em chamadas
 * aninhadas, onde um RELEASE/ROLLBACK interno afetaria o savepoint externo).
 */
export async function withSavepoint<T>(client: PoolClient, fn: () => Promise<T>): Promise<T> {
  const nome = `sp_${++savepointSeq}`
  await client.query(`SAVEPOINT ${nome}`)
  try {
    const r = await fn()
    await client.query(`RELEASE SAVEPOINT ${nome}`)
    return r
  } catch (e) {
    await client.query(`ROLLBACK TO SAVEPOINT ${nome}`)
    throw e
  }
}
