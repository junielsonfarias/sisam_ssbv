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
 * Painel "Turmas + Professores": lista TODAS as turmas (com ou sem
 * vinculo de professor) com seus slots. Anos iniciais (1-5) = 1 slot
 * polivalente. Anos finais (6-9) = 1 slot por disciplina conhecida via
 * `horarios_aula` da turma.
 *
 * Usado por: admin/professor-turmas?mode=por_turma
 */
export interface SlotVinculo {
  tipo: 'polivalente' | 'disciplina'
  disciplina_id: string | null
  disciplina_nome: string | null
  disciplina_abrev: string | null
  vinculo: null | {
    id: string
    professor_id: string
    professor_nome: string
    professor_email: string
  }
}
export interface TurmaComSlots {
  turma_id: string
  codigo: string | null
  nome: string | null
  serie: string
  turno: string | null
  ano_letivo: string
  escola_id: string
  escola_nome: string
  polo_id: string | null
  polo_nome: string | null
  is_anos_finais: boolean
  total_disciplinas_esperadas: number
  total_disciplinas_com_professor: number
  slots: SlotVinculo[]
}

export async function buscarTurmasComVinculos(filtros: {
  escolaId?: string | null
  poloId?: string | null
  anoLetivo?: string | null
  serie?: string | null
  turno?: string | null
}): Promise<TurmaComSlots[]> {
  const where = createWhereBuilder()
  addRawCondition(where, 't.ativo = true')
  addCondition(where, 't.escola_id', filtros.escolaId)
  addCondition(where, 'e.polo_id', filtros.poloId)
  addCondition(where, 't.ano_letivo', filtros.anoLetivo)
  addCondition(where, 't.turno', filtros.turno)
  if (filtros.serie) {
    // Aceita '6', '6º Ano', etc. Comparacao por digito extraido.
    where.conditions.push(
      `REGEXP_REPLACE(t.serie, '[^0-9]', '', 'g') = $${where.paramIndex}`
    )
    where.params.push(String(filtros.serie).replace(/\D/g, ''))
    where.paramIndex++
  }

  // 1) Turmas + escola/polo
  const turmasResult = await pool.query(
    `SELECT t.id, t.codigo, t.nome, t.serie, t.turno, t.ano_letivo,
            t.escola_id, e.nome AS escola_nome,
            e.polo_id, p.nome AS polo_nome
       FROM turmas t
       INNER JOIN escolas e ON e.id = t.escola_id
       LEFT JOIN polos p ON p.id = e.polo_id
      WHERE ${buildConditionsString(where)}
      ORDER BY e.nome, t.serie, t.codigo`,
    where.params
  )
  const turmas = turmasResult.rows
  if (turmas.length === 0) return []

  const turmaIds: string[] = turmas.map((t: any) => t.id)
  const turmaIdsPlaceholders = turmaIds.map((_, i) => `$${i + 1}`).join(', ')

  // 2) Vinculos ativos por turma (com professor + disciplina)
  // 3) Disciplinas da turma via horarios_aula (DISTINCT)
  const [vinculosResult, disciplinasResult] = await Promise.all([
    pool.query(
      `SELECT pt.id, pt.turma_id, pt.tipo_vinculo, pt.disciplina_id,
              u.id AS professor_id, u.nome AS professor_nome, u.email AS professor_email,
              de.nome AS disciplina_nome, de.abreviacao AS disciplina_abrev
         FROM professor_turmas pt
         INNER JOIN usuarios u ON u.id = pt.professor_id
         LEFT JOIN disciplinas_escolares de ON de.id = pt.disciplina_id
        WHERE pt.ativo = true AND pt.turma_id IN (${turmaIdsPlaceholders})
        ORDER BY u.nome`,
      turmaIds
    ),
    pool.query(
      // GROUP BY em vez de DISTINCT — Postgres exige que colunas do ORDER BY
      // estejam no SELECT list quando se usa DISTINCT. MIN(de.ordem) preserva
      // a ordenacao pedagogica.
      `SELECT ha.turma_id, ha.disciplina_id,
              de.nome, de.abreviacao, MIN(de.ordem) AS ordem
         FROM horarios_aula ha
         INNER JOIN disciplinas_escolares de ON de.id = ha.disciplina_id
        WHERE ha.turma_id IN (${turmaIdsPlaceholders})
        GROUP BY ha.turma_id, ha.disciplina_id, de.nome, de.abreviacao
        ORDER BY ordem NULLS LAST, de.nome`,
      turmaIds
    ),
  ])

  // Indexar por turma
  const vinculosPorTurma = new Map<string, any[]>()
  vinculosResult.rows.forEach((v: any) => {
    if (!vinculosPorTurma.has(v.turma_id)) vinculosPorTurma.set(v.turma_id, [])
    vinculosPorTurma.get(v.turma_id)!.push(v)
  })
  const disciplinasPorTurma = new Map<string, any[]>()
  disciplinasResult.rows.forEach((d: any) => {
    if (!disciplinasPorTurma.has(d.turma_id)) disciplinasPorTurma.set(d.turma_id, [])
    disciplinasPorTurma.get(d.turma_id)!.push(d)
  })

  const isAnosFinaisFn = (serie: string): boolean => {
    const n = String(serie || '').replace(/\D/g, '')
    return ['6', '7', '8', '9'].includes(n)
  }

  // Montar slots
  const out: TurmaComSlots[] = turmas.map((t: any) => {
    const vinculos = vinculosPorTurma.get(t.id) || []
    const finais = isAnosFinaisFn(t.serie)
    let slots: SlotVinculo[]

    if (!finais) {
      // 1 slot polivalente
      const v = vinculos.find((x: any) => x.tipo_vinculo === 'polivalente')
        || vinculos[0] // fallback: qualquer vinculo
      slots = [{
        tipo: 'polivalente',
        disciplina_id: null,
        disciplina_nome: null,
        disciplina_abrev: null,
        vinculo: v ? {
          id: v.id,
          professor_id: v.professor_id,
          professor_nome: v.professor_nome,
          professor_email: v.professor_email,
        } : null,
      }]
    } else {
      // Slots por disciplina conhecida (horarios_aula)
      const discs = disciplinasPorTurma.get(t.id) || []
      slots = discs.map((d: any) => {
        const v = vinculos.find((x: any) => x.disciplina_id === d.disciplina_id)
        return {
          tipo: 'disciplina' as const,
          disciplina_id: d.disciplina_id,
          disciplina_nome: d.nome,
          disciplina_abrev: d.abreviacao,
          vinculo: v ? {
            id: v.id,
            professor_id: v.professor_id,
            professor_nome: v.professor_nome,
            professor_email: v.professor_email,
          } : null,
        }
      })
    }

    const totalEsperadas = slots.length
    const totalComProf = slots.filter(s => s.vinculo !== null).length

    return {
      turma_id: t.id,
      codigo: t.codigo,
      nome: t.nome,
      serie: t.serie,
      turno: t.turno,
      ano_letivo: t.ano_letivo,
      escola_id: t.escola_id,
      escola_nome: t.escola_nome,
      polo_id: t.polo_id,
      polo_nome: t.polo_nome,
      is_anos_finais: finais,
      total_disciplinas_esperadas: totalEsperadas,
      total_disciplinas_com_professor: totalComProf,
      slots,
    }
  })

  return out
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
