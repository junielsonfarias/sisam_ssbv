import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import {
  createWhereBuilder, addRawCondition, addCondition, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service de Professores — Vínculos professor-turma e painel de slots
// Extraído de professores.service.ts (decomposição por limite de 400 linhas).
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
