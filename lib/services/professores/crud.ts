import pool from '@/database/connection'
import { hashPassword } from '@/lib/auth'
import {
  createWhereBuilder, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service de Professores — CRUD (usuarios tipo 'professor')
// Extraído de professores.service.ts (decomposição por limite de 400 linhas).
// ============================================================================

/** Retorno da listagem de professores com vinculações */
export interface ProfessorListItem {
  id: string
  nome: string
  email: string
  ativo: boolean
  criado_em: string
  cpf: string | null
  telefone: string | null
  total_turmas: number
  escolas: string[]
}

/** Retorno da criação de professor */
export interface ProfessorCriado {
  id: string
  nome: string
  email: string
  tipo_usuario: string
  criado_em: string
}

/** Retorno da atualização de professor */
export interface ProfessorAtualizado {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  ativo: boolean
}

/** Retorno do toggle ativo */
export interface ProfessorToggle {
  id: string
  nome: string
  email: string
  ativo: boolean
}

/**
 * Busca professores com suas vinculações (turmas, escolas)
 * Usado por: admin/professores GET
 */
export async function buscarProfessores(filtros: {
  escolaId?: string | null
  ativo?: string | null
}): Promise<ProfessorListItem[]> {
  const where = createWhereBuilder()
  addRawCondition(where, "u.tipo_usuario = 'professor'")

  if (filtros.ativo === 'true') {
    addRawCondition(where, 'u.ativo = true')
  } else if (filtros.ativo === 'false') {
    addRawCondition(where, 'u.ativo = false')
  }

  // Filtro de escola: mostra professores da escola OU sem vínculo
  if (filtros.escolaId) {
    addRawCondition(where, `(t.escola_id = $${where.paramIndex} OR pt.id IS NULL)`, [filtros.escolaId])
  }

  const result = await pool.query(
    `SELECT u.id, u.nome, u.email, u.ativo, u.criado_em, u.cpf, u.telefone,
           COUNT(DISTINCT pt.turma_id) as total_turmas,
           ARRAY_AGG(DISTINCT e.nome) FILTER (WHERE e.nome IS NOT NULL) as escolas
    FROM usuarios u
    LEFT JOIN professor_turmas pt ON pt.professor_id = u.id AND pt.ativo = true
    LEFT JOIN turmas t ON t.id = pt.turma_id
    LEFT JOIN escolas e ON e.id = t.escola_id
    WHERE ${buildConditionsString(where)}
    GROUP BY u.id, u.nome, u.email, u.ativo, u.criado_em, u.cpf, u.telefone
    ORDER BY u.ativo ASC, u.nome`,
    where.params
  )

  return result.rows
}

/**
 * Cria um novo professor (usuário tipo 'professor')
 * Usado por: admin/professores POST
 */
export async function criarProfessor(dados: {
  nome: string
  email: string
  senha: string
}): Promise<{ professor: ProfessorCriado } | { erro: string; status: number }> {
  // Verificar se email já existe
  const existeResult = await pool.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [dados.email.toLowerCase()]
  )
  if (existeResult.rows.length > 0) {
    return { erro: 'Email já cadastrado', status: 409 }
  }

  const senhaHash = await hashPassword(dados.senha)

  const result = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo_usuario, ativo)
     VALUES ($1, $2, $3, 'professor', true)
     RETURNING id, nome, email, tipo_usuario, criado_em`,
    [dados.nome.trim(), dados.email.toLowerCase().trim(), senhaHash]
  )

  return { professor: result.rows[0] }
}

/**
 * Atualiza dados do professor (nome, email, cpf, telefone)
 * Usado por: admin/professores PUT
 */
export async function atualizarProfessor(dados: {
  professor_id: string
  nome?: string
  email?: string
  cpf?: string | null
  telefone?: string | null
}): Promise<{ professor: ProfessorAtualizado } | { erro: string; status: number }> {
  const sets: string[] = []
  const params: (string | boolean | null)[] = [dados.professor_id]
  let paramIndex = 2

  if (dados.nome !== undefined) {
    sets.push(`nome = $${paramIndex++}`)
    params.push(dados.nome.trim())
  }

  if (dados.email !== undefined) {
    // Verificar se email já está em uso por outro usuário
    const emailExiste = await pool.query(
      'SELECT id FROM usuarios WHERE email = $1 AND id != $2',
      [dados.email.toLowerCase().trim(), dados.professor_id]
    )
    if (emailExiste.rows.length > 0) {
      return { erro: 'Email já cadastrado por outro usuário', status: 409 }
    }
    sets.push(`email = $${paramIndex++}`)
    params.push(dados.email.toLowerCase().trim())
  }

  if (dados.cpf !== undefined) {
    sets.push(`cpf = $${paramIndex++}`)
    params.push(dados.cpf?.trim() || null)
  }

  if (dados.telefone !== undefined) {
    sets.push(`telefone = $${paramIndex++}`)
    params.push(dados.telefone?.trim() || null)
  }

  if (sets.length === 0) {
    return { erro: 'Nenhum campo para atualizar', status: 400 }
  }

  const result = await pool.query(
    `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $1 AND tipo_usuario = 'professor' RETURNING id, nome, email, cpf, telefone, ativo`,
    params
  )

  if (result.rows.length === 0) {
    return { erro: 'Professor não encontrado', status: 404 }
  }

  return { professor: result.rows[0] }
}

/**
 * Ativa ou desativa professor
 * Usado por: admin/professores PATCH
 */
export async function toggleAtivoProfessor(
  professorId: string,
  ativo: boolean
): Promise<{ professor: ProfessorToggle } | { erro: string; status: number }> {
  const result = await pool.query(
    `UPDATE usuarios SET ativo = $1 WHERE id = $2 AND tipo_usuario = 'professor' RETURNING id, nome, email, ativo`,
    [ativo, professorId]
  )

  if (result.rows.length === 0) {
    return { erro: 'Professor não encontrado', status: 404 }
  }

  return { professor: result.rows[0] }
}

/**
 * Verifica se professor pode ser excluído (inativo + sem vínculos)
 * Usado por: admin/professores DELETE
 */
export async function verificarPodeDeletar(professorId: string): Promise<{ pode: boolean; motivo?: string }> {
  const vinculosResult = await pool.query(
    'SELECT COUNT(*) as total FROM professor_turmas WHERE professor_id = $1',
    [professorId]
  )
  if (parseInt(vinculosResult.rows[0].total) > 0) {
    return { pode: false, motivo: 'Professor possui vínculos. Desative-o ao invés de excluir.' }
  }
  return { pode: true }
}

/**
 * Exclui professor inativo sem vínculos
 * Usado por: admin/professores DELETE
 */
export async function deletarProfessor(
  professorId: string
): Promise<{ sucesso: boolean } | { erro: string; status: number }> {
  // Verificar vínculos antes
  const verificacao = await verificarPodeDeletar(professorId)
  if (!verificacao.pode) {
    return { erro: verificacao.motivo!, status: 400 }
  }

  const result = await pool.query(
    `DELETE FROM usuarios WHERE id = $1 AND tipo_usuario = 'professor' AND ativo = false RETURNING id`,
    [professorId]
  )

  if (result.rows.length === 0) {
    return { erro: 'Professor não encontrado ou já ativo (só é possível excluir cadastros pendentes)', status: 404 }
  }

  return { sucesso: true }
}
