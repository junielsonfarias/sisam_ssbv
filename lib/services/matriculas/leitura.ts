import pool from '@/database/connection'
import type { AnoLetivoCorrente, MatriculaRow } from './types'

// ============================================================================
// Leitura da tabela dedicada `matriculas` (ADR-002) — fase aditiva.
//
// Estas funções consultam a tabela `matriculas` como fonte do vínculo
// aluno<->turma por ano letivo, derivando o ano corrente. São ADITIVAS:
// não substituem as leituras existentes de `alunos.turma_id` (que segue como
// atalho derivado durante a transição), apenas oferecem a nova fonte.
// ============================================================================

/**
 * Deriva o ano letivo corrente de `anos_letivos`, tolerante a duas convenções
 * de status presentes na base:
 *   1) status = 'ativo'  (convenção do CRUD de anos letivos);
 *   2) na ausência de 'ativo', o ano mais recente que não esteja 'fechado'
 *      (cobre a base demo, que usa 'em_andamento'/'fechado');
 *   3) fallback final: o ano mais recente registrado.
 * Retorna null se não houver nenhum ano letivo cadastrado.
 */
export async function obterAnoLetivoCorrente(): Promise<AnoLetivoCorrente | null> {
  const result = await pool.query(
    `SELECT id, ano, status
       FROM anos_letivos
      ORDER BY
        (status = 'ativo') DESC,
        (status <> 'fechado') DESC,
        ano DESC
      LIMIT 1`
  )
  return (result.rows[0] as AnoLetivoCorrente) ?? null
}

/**
 * Busca a matrícula de um aluno em um ano letivo específico.
 * Quan­do `anoLetivoId` é omitido, usa o ano corrente derivado.
 * Retorna null se o aluno não tiver matrícula no ano.
 */
export async function buscarMatriculaDoAluno(
  alunoId: string,
  anoLetivoId?: string
): Promise<MatriculaRow | null> {
  const anoId = anoLetivoId ?? (await obterAnoLetivoCorrente())?.id
  if (!anoId) return null

  const result = await pool.query(
    `SELECT id, aluno_id, turma_id, ano_letivo_id, serie_id, situacao,
            data_matricula, criado_em, atualizado_em
       FROM matriculas
      WHERE aluno_id = $1 AND ano_letivo_id = $2
      LIMIT 1`,
    [alunoId, anoId]
  )
  return (result.rows[0] as MatriculaRow) ?? null
}

/**
 * Lista as matrículas de uma turma em um ano letivo.
 * Quando `anoLetivoId` é omitido, usa o ano corrente derivado.
 */
export async function listarMatriculasDaTurma(
  turmaId: string,
  anoLetivoId?: string
): Promise<MatriculaRow[]> {
  const anoId = anoLetivoId ?? (await obterAnoLetivoCorrente())?.id
  if (!anoId) return []

  const result = await pool.query(
    `SELECT id, aluno_id, turma_id, ano_letivo_id, serie_id, situacao,
            data_matricula, criado_em, atualizado_em
       FROM matriculas
      WHERE turma_id = $1 AND ano_letivo_id = $2
      ORDER BY data_matricula ASC`,
    [turmaId, anoId]
  )
  return result.rows as MatriculaRow[]
}
