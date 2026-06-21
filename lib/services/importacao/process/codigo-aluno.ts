/**
 * Sequencia de codigos de aluno (ALU####) para a Fase 5.
 *
 * @module services/importacao/process/codigo-aluno
 */

import pool from '@/database/connection'

/**
 * Descobre o proximo numero sequencial de codigo de aluno (ALU####) a partir
 * do maior codigo ja existente no banco. Retorna 1 quando nao ha nenhum.
 */
export async function proximoNumeroCodigoAluno(): Promise<number> {
  const maxCodigoResult = await pool.query(
    `SELECT codigo FROM alunos
     WHERE codigo LIKE 'ALU%'
     AND codigo ~ '^ALU[0-9]+$'
     ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC
     LIMIT 1`
  )
  if (maxCodigoResult.rows.length > 0 && maxCodigoResult.rows[0].codigo) {
    return parseInt(maxCodigoResult.rows[0].codigo.replace('ALU', '')) + 1
  }
  return 1
}
