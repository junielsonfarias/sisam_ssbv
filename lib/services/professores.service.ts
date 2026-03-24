import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import { hashPassword } from '@/lib/auth'
import {
  createWhereBuilder, addRawCondition, addCondition, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service de Professores — lógica de negócio extraída de admin/professores
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

// ============================================================================
// Vínculos professor-turma
// ============================================================================

/**
 * Busca vínculos professor-turma com filtros
 * Usado por: admin/professor-turmas GET
 */
export async function buscarVinculos(filtros: {
  escolaId?: string | null; professorId?: string | null; anoLetivo?: string | null
}): Promise<any[]> {
  const where = createWhereBuilder()
  addRawCondition(where, 'pt.ativo = true')
  addCondition(where, 't.escola_id', filtros.escolaId)
  addCondition(where, 'pt.professor_id', filtros.professorId)
  addCondition(where, 'pt.ano_letivo', filtros.anoLetivo)

  const result = await pool.query(
    `SELECT pt.id, pt.tipo_vinculo, pt.ano_letivo, pt.ativo, pt.criado_em,
           u.id as professor_id, u.nome as professor_nome, u.email as professor_email,
           t.id as turma_id, t.nome as turma_nome, t.serie, t.turno,
           e.id as escola_id, e.nome as escola_nome,
           de.id as disciplina_id, de.nome as disciplina_nome
    FROM professor_turmas pt
    INNER JOIN usuarios u ON u.id = pt.professor_id
    INNER JOIN turmas t ON t.id = pt.turma_id
    INNER JOIN escolas e ON e.id = t.escola_id
    LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
    WHERE ${buildConditionsString(where)}
    ORDER BY e.nome, t.serie, t.nome, u.nome`,
    where.params
  )

  return result.rows
}

/**
 * Cria vínculo professor-turma
 * Usado por: admin/professor-turmas POST
 */
export async function criarVinculo(dados: {
  professor_id: string; turma_id: string; disciplina_id?: string | null;
  tipo_vinculo: string; ano_letivo: string
}): Promise<{ id: string }> {
  const { professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo } = dados

  const result = await pool.query(
    `INSERT INTO professor_turmas (professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [professor_id, turma_id, tipo_vinculo === 'polivalente' ? null : disciplina_id, tipo_vinculo, ano_letivo]
  )

  return { id: result.rows[0].id }
}

/**
 * Troca professor em uma turma/disciplina (atômica: desativa antigo + cria novo)
 * Usado por: admin/professor-turmas PATCH
 *
 * Usa withTransaction para garantir atomicidade e retry em deadlock
 */
export async function trocarProfessor(
  vinculoId: string,
  novoProfessorId: string
): Promise<{ vinculo_anterior: string; vinculo_novo: string }> {
  return withTransaction(async (client) => {
    // Buscar vínculo atual
    const vinculoResult = await client.query(
      `SELECT id, professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo
       FROM professor_turmas WHERE id = $1 AND ativo = true`,
      [vinculoId]
    )

    if (vinculoResult.rows.length === 0) {
      throw new Error('Vínculo não encontrado ou já inativo')
    }

    const vinculoAtual = vinculoResult.rows[0]

    if (vinculoAtual.professor_id === novoProfessorId) {
      throw new Error('O novo professor é o mesmo do vínculo atual')
    }

    // 1. Desativar vínculo atual (soft delete — preserva histórico)
    await client.query(
      `UPDATE professor_turmas SET ativo = false WHERE id = $1`,
      [vinculoId]
    )

    // 2. Criar novo vínculo com mesmo turma/disciplina/tipo/ano
    const novoResult = await client.query(
      `INSERT INTO professor_turmas (professor_id, turma_id, disciplina_id, tipo_vinculo, ano_letivo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [novoProfessorId, vinculoAtual.turma_id, vinculoAtual.disciplina_id, vinculoAtual.tipo_vinculo, vinculoAtual.ano_letivo]
    )

    return {
      vinculo_anterior: vinculoId,
      vinculo_novo: novoResult.rows[0].id,
    }
  })
}

/**
 * Desativa vínculo (soft delete)
 * Usado por: admin/professor-turmas DELETE
 */
export async function desativarVinculo(vinculoId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE professor_turmas SET ativo = false WHERE id = $1 RETURNING id`,
    [vinculoId]
  )

  return result.rows.length > 0
}
