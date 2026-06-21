/**
 * Facial — consentimentos LGPD e anonimização de dados biométricos.
 *
 * @module services/facial/consentimentos
 */

import { PoolClient } from 'pg'
import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import {
  createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'
import type { ConsentimentoAluno, RevogarConsentimentoResult } from './types'

/**
 * Busca status de consentimento facial dos alunos de uma escola
 */
export async function buscarConsentimentos(
  escolaId: string,
  anoLetivo: string,
  turmaId?: string | null,
): Promise<ConsentimentoAluno[]> {
  const where = createWhereBuilder()
  addCondition(where, 'a.escola_id', escolaId)
  addRawCondition(where, 'a.ativo = true')
  addCondition(where, 'a.ano_letivo', anoLetivo)
  if (turmaId) addCondition(where, 'a.turma_id', turmaId)

  const result = await pool.query(
    `SELECT
      a.id AS aluno_id, a.nome AS aluno_nome, a.codigo AS aluno_codigo,
      cf.id AS consentimento_id, cf.responsavel_nome, cf.consentido,
      cf.data_consentimento, cf.data_revogacao,
      CASE WHEN ef.id IS NOT NULL THEN true ELSE false END AS tem_embedding
    FROM alunos a
    LEFT JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
    LEFT JOIN embeddings_faciais ef ON ef.aluno_id = a.id
    WHERE ${buildConditionsString(where)}
    ORDER BY a.nome`,
    where.params,
  )

  return result.rows
}

/**
 * Busca consentimento de um aluno específico
 */
export async function buscarConsentimentoAluno(
  alunoId: string,
): Promise<ConsentimentoAluno[]> {
  const result = await pool.query(
    `SELECT
      a.id AS aluno_id,
      a.nome AS aluno_nome,
      cf.responsavel_nome,
      cf.responsavel_cpf,
      cf.consentido,
      cf.data_consentimento,
      cf.data_revogacao,
      CASE WHEN ef.id IS NOT NULL THEN true ELSE false END AS tem_embedding
    FROM alunos a
    LEFT JOIN consentimentos_faciais cf ON cf.aluno_id = a.id
    LEFT JOIN embeddings_faciais ef ON ef.aluno_id = a.id
    WHERE a.id = $1`,
    [alunoId],
  )

  return result.rows
}

/**
 * Revoga consentimento e remove dados faciais (LGPD).
 * Executa em transação: update consentimento + delete embedding + update frequência.
 */
export async function revogarConsentimento(
  alunoId: string,
): Promise<void> {
  await withTransaction(async (client) => {
    // Revogar consentimento
    await client.query(
      `UPDATE consentimentos_faciais
       SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
       WHERE aluno_id = $1`,
      [alunoId],
    )

    // Remover embedding
    await client.query(
      'DELETE FROM embeddings_faciais WHERE aluno_id = $1',
      [alunoId],
    )

    // Manter frequências mas remover vínculo facial
    await client.query(
      `UPDATE frequencia_diaria SET metodo = 'manual', dispositivo_id = NULL, confianca = NULL
       WHERE aluno_id = $1 AND metodo = 'facial'`,
      [alunoId],
    )
  })
}

/**
 * Núcleo da exclusão LGPD facial, executado dentro de uma transação EXISTENTE
 * (recebe o `client`). Deleta embeddings, revoga consentimento e anonimiza a
 * frequência facial (mantém o registro de presença, remove o vínculo biométrico).
 * Reusado pela exclusão manual (purgarDadosFaciaisLGPD) e pela exclusão
 * automática ao transferir/evadir (alterarSituacao — Fase 4.4).
 */
export async function anonimizarDadosFaciaisTx(
  client: PoolClient,
  alunoId: string,
): Promise<RevogarConsentimentoResult> {
  const embeddingResult = await client.query(
    'DELETE FROM embeddings_faciais WHERE aluno_id = $1',
    [alunoId],
  )

  const consentimentoResult = await client.query(
    `UPDATE consentimentos_faciais
     SET consentido = false, data_revogacao = CURRENT_TIMESTAMP
     WHERE aluno_id = $1`,
    [alunoId],
  )

  const frequenciaResult = await client.query(
    `UPDATE frequencia_diaria
     SET metodo = 'manual', dispositivo_id = NULL, confianca = NULL
     WHERE aluno_id = $1 AND metodo = 'facial'`,
    [alunoId],
  )

  return {
    embeddings: embeddingResult.rowCount || 0,
    consentimentos_revogados: consentimentoResult.rowCount || 0,
    frequencias_anonimizadas: frequenciaResult.rowCount || 0,
  }
}

/**
 * Exclusão LGPD completa — retorna contadores de registros afetados.
 * Mesma lógica de revogarConsentimento, mas retorna quantidades.
 */
export async function purgarDadosFaciaisLGPD(
  alunoId: string,
): Promise<RevogarConsentimentoResult> {
  return withTransaction((client) => anonimizarDadosFaciaisTx(client, alunoId))
}
