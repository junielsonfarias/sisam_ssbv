import pool from '@/database/connection'

/**
 * Resolve o avaliacao_id para operações que precisam vincular a uma avaliação.
 *
 * - Se avaliacaoIdParam for fornecido, retorna ele diretamente.
 * - Senão, busca a primeira avaliação do ano (ORDER BY ordem).
 * - Se não existir nenhuma avaliação para o ano, auto-cria uma do tipo 'unica'.
 *
 * Isso garante retrocompatibilidade: chamadas sem avaliacao_id continuam funcionando.
 */
export async function resolverAvaliacaoId(
  avaliacaoIdParam: string | null | undefined,
  anoLetivo: string
): Promise<string> {
  if (avaliacaoIdParam) return avaliacaoIdParam

  // Buscar primeira avaliação do ano
  const result = await pool.query(
    `SELECT id FROM avaliacoes WHERE ano_letivo = $1 AND ativo = true ORDER BY ordem LIMIT 1`,
    [anoLetivo]
  )

  if (result.rows.length > 0) {
    return result.rows[0].id
  }

  // Auto-criar avaliação 'unica' para o ano
  const insert = await pool.query(
    `INSERT INTO avaliacoes (nome, ano_letivo, tipo, ordem)
     VALUES ($1, $2, 'unica', 1)
     ON CONFLICT (ano_letivo, tipo) DO UPDATE SET nome = EXCLUDED.nome
     RETURNING id`,
    [`Avaliação Única ${anoLetivo}`, anoLetivo]
  )

  return insert.rows[0].id
}

/**
 * Lista avaliações para um ano letivo (ou todas se ano não fornecido)
 */
export async function listarAvaliacoes(anoLetivo?: string | null) {
  if (anoLetivo) {
    const result = await pool.query(
      `SELECT id, nome, descricao, ano_letivo, tipo, ordem, data_inicio, data_fim, ativo, criado_em
       FROM avaliacoes
       WHERE ano_letivo = $1 AND ativo = true
       ORDER BY ordem`,
      [anoLetivo]
    )
    return result.rows
  }

  const result = await pool.query(
    `SELECT id, nome, descricao, ano_letivo, tipo, ordem, data_inicio, data_fim, ativo, criado_em
     FROM avaliacoes
     WHERE ativo = true
     ORDER BY ano_letivo DESC, ordem`
  )
  return result.rows
}
