/**
 * Service de Avaliações Descritivas.
 *
 * Usado em anos iniciais e Educação Infantil onde a avaliação é qualitativa
 * (sem nota numérica). Cada registro descreve o progresso de um aluno em
 * uma disciplina/período.
 *
 * @module services/avaliacoes-descritivas
 */

import pool from '@/database/connection'

export type Conceito =
  | 'plenamente_satisfatorio'
  | 'satisfatorio'
  | 'em_desenvolvimento'
  | 'insuficiente'
  | 'consolidado'
  | 'em_processo'
  | 'nao_observado'

export const CONCEITO_LABEL: Record<Conceito, string> = {
  plenamente_satisfatorio: 'Plenamente Satisfatório',
  satisfatorio: 'Satisfatório',
  em_desenvolvimento: 'Em Desenvolvimento',
  insuficiente: 'Insuficiente',
  consolidado: 'Consolidado',
  em_processo: 'Em Processo',
  nao_observado: 'Não Observado',
}

export const CONCEITO_COR: Record<Conceito, string> = {
  plenamente_satisfatorio: 'green',
  satisfatorio: 'blue',
  em_desenvolvimento: 'amber',
  insuficiente: 'red',
  consolidado: 'green',
  em_processo: 'amber',
  nao_observado: 'gray',
}

export interface AvaliacaoDescritiva {
  id?: string
  aluno_id: string
  periodo_id?: string | null
  disciplina_id?: string | null
  professor_id: string
  texto_descritivo: string
  conceito?: Conceito | null
  habilidades_avaliadas?: string[]
  status?: 'rascunho' | 'publicada'
}

export async function criarOuAtualizar(av: AvaliacaoDescritiva): Promise<string> {
  const r = await pool.query(
    `INSERT INTO avaliacoes_descritivas
       (aluno_id, periodo_id, disciplina_id, professor_id,
        texto_descritivo, conceito, habilidades_avaliadas, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (aluno_id, periodo_id, disciplina_id, professor_id) DO UPDATE
       SET texto_descritivo = EXCLUDED.texto_descritivo,
           conceito = EXCLUDED.conceito,
           habilidades_avaliadas = EXCLUDED.habilidades_avaliadas,
           status = EXCLUDED.status,
           atualizado_em = NOW()
     RETURNING id`,
    [
      av.aluno_id,
      av.periodo_id || null,
      av.disciplina_id || null,
      av.professor_id,
      av.texto_descritivo,
      av.conceito || null,
      av.habilidades_avaliadas || [],
      av.status || 'rascunho',
    ]
  )
  return r.rows[0].id
}

export async function listarPorAluno(alunoId: string, status?: 'rascunho' | 'publicada') {
  const params: unknown[] = [alunoId]
  let where = `aluno_id = $1`
  if (status) {
    params.push(status)
    where += ` AND status = $${params.length}`
  }
  const r = await pool.query(
    `SELECT a.*, d.nome AS disciplina_nome, p.nome AS periodo_nome,
            u.nome AS professor_nome
       FROM avaliacoes_descritivas a
       LEFT JOIN disciplinas_escolares d ON d.id = a.disciplina_id
       LEFT JOIN periodos_letivos p ON p.id = a.periodo_id
       LEFT JOIN usuarios u ON u.id = a.professor_id
      WHERE ${where}
      ORDER BY a.atualizado_em DESC`,
    params
  )
  return r.rows
}

export async function listarPorTurma(params: {
  turmaId: string
  periodoId?: string
  disciplinaId?: string
}) {
  const conds: string[] = ['a_aluno.turma_id = $1']
  const queryParams: unknown[] = [params.turmaId]
  let i = 2

  if (params.periodoId) { queryParams.push(params.periodoId); conds.push(`av.periodo_id = $${i++}`) }
  if (params.disciplinaId) { queryParams.push(params.disciplinaId); conds.push(`av.disciplina_id = $${i++}`) }

  const r = await pool.query(
    `SELECT av.*, a_aluno.nome AS aluno_nome,
            d.nome AS disciplina_nome
       FROM avaliacoes_descritivas av
       INNER JOIN alunos a_aluno ON a_aluno.id = av.aluno_id
       LEFT JOIN disciplinas_escolares d ON d.id = av.disciplina_id
      WHERE ${conds.join(' AND ')}
      ORDER BY a_aluno.nome, av.atualizado_em DESC`,
    queryParams
  )
  return r.rows
}

export async function buscarPorId(id: string) {
  const r = await pool.query(
    `SELECT av.*, a.nome AS aluno_nome,
            d.nome AS disciplina_nome,
            p.nome AS periodo_nome
       FROM avaliacoes_descritivas av
       INNER JOIN alunos a ON a.id = av.aluno_id
       LEFT JOIN disciplinas_escolares d ON d.id = av.disciplina_id
       LEFT JOIN periodos_letivos p ON p.id = av.periodo_id
      WHERE av.id = $1`,
    [id]
  )
  return r.rows[0] || null
}

export async function publicar(id: string, professorId: string): Promise<boolean> {
  const r = await pool.query(
    `UPDATE avaliacoes_descritivas
       SET status = 'publicada', atualizado_em = NOW()
     WHERE id = $1 AND professor_id = $2 AND status = 'rascunho'`,
    [id, professorId]
  )
  return (r.rowCount ?? 0) > 0
}

export async function deletar(id: string, professorId: string): Promise<boolean> {
  const r = await pool.query(
    `DELETE FROM avaliacoes_descritivas
      WHERE id = $1 AND professor_id = $2 AND status = 'rascunho'`,
    [id, professorId]
  )
  return (r.rowCount ?? 0) > 0
}
