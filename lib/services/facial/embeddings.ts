/**
 * Facial — embeddings biométricos para o terminal web.
 *
 * @module services/facial/embeddings
 */

import pool from '@/database/connection'
import {
  createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'
import type { EmbeddingAluno } from './types'

/**
 * Busca embeddings faciais para terminal web.
 * Converte BYTEA para base64 limpo.
 */
export async function buscarEmbeddings(
  escolaId: string,
  anoLetivo: string,
  turmaId?: string | null,
): Promise<{ alunos: EmbeddingAluno[]; total: number }> {
  const where = createWhereBuilder()
  addCondition(where, 'a.escola_id', escolaId)
  addRawCondition(where, 'a.ativo = true')
  addRawCondition(where, "a.situacao = 'cursando'")
  addCondition(where, 'a.ano_letivo', anoLetivo)
  if (turmaId) addCondition(where, 'a.turma_id', turmaId)

  const result = await pool.query(
    `SELECT a.id AS aluno_id, a.nome, a.codigo, a.turma_id, a.serie,
            t.codigo AS turma_codigo, t.nome AS turma_nome,
            ef.embedding_data, ef.qualidade
     FROM alunos a
     INNER JOIN embeddings_faciais ef ON ef.aluno_id = a.id
     INNER JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
       AND cf.consentido = true AND cf.data_revogacao IS NULL
     LEFT JOIN turmas t ON a.turma_id = t.id
     WHERE ${buildConditionsString(where)}
     ORDER BY a.nome LIMIT 2000`,
    where.params,
  )

  // Converter BYTEA para base64 limpo (sem quebras de linha do PostgreSQL)
  const alunos: EmbeddingAluno[] = result.rows.map((row: Record<string, unknown>) => ({
    aluno_id: row.aluno_id as string,
    nome: row.nome as string,
    codigo: row.codigo as string,
    turma_id: row.turma_id as string | null,
    serie: row.serie as string | null,
    turma_codigo: row.turma_codigo as string | null,
    turma_nome: row.turma_nome as string | null,
    qualidade: row.qualidade as number | null,
    embedding_base64: row.embedding_data
      ? Buffer.from(row.embedding_data as Buffer).toString('base64')
      : null,
  }))

  return { alunos, total: alunos.length }
}
