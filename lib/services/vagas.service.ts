import pool from '@/database/connection'
import { withTransaction } from '@/lib/database/with-transaction'
import {
  createWhereBuilder, addCondition, addRawCondition, buildConditionsString,
} from '@/lib/api-helpers'

// ============================================================================
// Service de Vagas / Fila de Espera — lógica de negócio extraída da rota
// ============================================================================

// ============================================================================
// TIPOS
// ============================================================================

export interface FilaEsperaFiltros {
  turmaId?: string | null
  escolaId?: string | null
  poloId?: string | null
  status?: string | null
}

export interface FilaEsperaItem {
  id: string
  posicao: number
  status: string
  observacao: string | null
  data_entrada: string
  data_convocacao: string | null
  data_resolucao: string | null
  aluno_nome: string
  aluno_codigo: string
  aluno_id: string
  aluno_serie: string
  aluno_nascimento: string | null
  turma_codigo: string
  turma_serie: string
  turma_id: string
  escola_nome: string
  escola_id: string
  dias_espera: number
}

export interface FilaEsperaResumo {
  total: number
  aguardando: number
  convocados: number
  matriculados: number
  desistentes: number
}

export interface FilaEsperaResult {
  itens: FilaEsperaItem[]
  resumo: FilaEsperaResumo
}

export interface AdicionarFilaResult {
  id: string
  posicao: number
}

export interface AtualizarStatusResult {
  mensagem: string
}

// ============================================================================
// HELPERS INTERNOS
// ============================================================================

/** Reordena posições dos itens aguardando na fila de uma turma */
const REORDENAR_FILA_SQL = `
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY posicao) as nova_posicao
    FROM fila_espera
    WHERE turma_id = $1 AND status = 'aguardando'
  )
  UPDATE fila_espera SET posicao = ranked.nova_posicao
  FROM ranked WHERE fila_espera.id = ranked.id`

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Busca itens da fila de espera com filtros.
 * Retorna lista de itens + resumo por status.
 */
export async function buscarFilaEspera(
  filtros: FilaEsperaFiltros
): Promise<FilaEsperaResult> {
  const { turmaId, escolaId, poloId, status } = filtros

  const where = createWhereBuilder()
  addCondition(where, 'fe.turma_id', turmaId)
  addCondition(where, 'fe.escola_id', escolaId)

  if (poloId) {
    addCondition(where, 'e.polo_id', poloId)
  }

  addCondition(where, 'fe.status', status)

  const result = await pool.query(
    `SELECT fe.id, fe.posicao, fe.status, fe.observacao,
           fe.data_entrada, fe.data_convocacao, fe.data_resolucao,
           a.nome as aluno_nome, a.codigo as aluno_codigo, a.id as aluno_id,
           a.serie as aluno_serie, a.data_nascimento as aluno_nascimento,
           t.codigo as turma_codigo, t.serie as turma_serie, t.id as turma_id,
           e.nome as escola_nome, e.id as escola_id,
           EXTRACT(DAY FROM (CURRENT_TIMESTAMP - fe.data_entrada)) as dias_espera
    FROM fila_espera fe
    JOIN alunos a ON fe.aluno_id = a.id
    JOIN turmas t ON fe.turma_id = t.id
    JOIN escolas e ON fe.escola_id = e.id
    WHERE ${buildConditionsString(where)}
    ORDER BY fe.status = 'aguardando' DESC, fe.posicao ASC, fe.data_entrada ASC`,
    where.params
  )

  const resumo: FilaEsperaResumo = {
    total: result.rows.length,
    aguardando: result.rows.filter((r: FilaEsperaItem) => r.status === 'aguardando').length,
    convocados: result.rows.filter((r: FilaEsperaItem) => r.status === 'convocado').length,
    matriculados: result.rows.filter((r: FilaEsperaItem) => r.status === 'matriculado').length,
    desistentes: result.rows.filter((r: FilaEsperaItem) => r.status === 'desistente').length
  }

  return { itens: result.rows, resumo }
}

/**
 * Adiciona aluno à fila de espera.
 * Valida: aluno não está já na fila (aguardando/convocado) e não está matriculado na turma.
 */
export async function adicionarNaFila(dados: {
  alunoId: string
  turmaId: string
  escolaId: string
  observacao?: string | null
}): Promise<AdicionarFilaResult> {
  const { alunoId, turmaId, escolaId, observacao } = dados

  // Verificar se já está na fila (aguardando ou convocado)
  const existente = await pool.query(
    `SELECT id, status FROM fila_espera WHERE aluno_id = $1 AND turma_id = $2 AND status IN ('aguardando', 'convocado')`,
    [alunoId, turmaId]
  )
  if (existente.rows.length > 0) {
    throw new Error('Aluno já está na fila desta turma')
  }

  // Verificar se aluno já está matriculado nesta turma
  const jaMatriculado = await pool.query(
    `SELECT id FROM alunos WHERE id = $1 AND turma_id = $2 AND ativo = true`,
    [alunoId, turmaId]
  )
  if (jaMatriculado.rows.length > 0) {
    throw new Error('Aluno já está matriculado nesta turma')
  }

  // Próxima posição
  const posResult = await pool.query(
    `SELECT COALESCE(MAX(posicao), 0) + 1 as proxima FROM fila_espera WHERE turma_id = $1 AND status = 'aguardando'`,
    [turmaId]
  )
  const posicao = posResult.rows[0].proxima

  const result = await pool.query(
    `INSERT INTO fila_espera (aluno_id, turma_id, escola_id, posicao, observacao)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [alunoId, turmaId, escolaId, posicao, observacao || null]
  )

  return { id: result.rows[0].id, posicao }
}

/**
 * Atualiza status na fila (convocar, matricular, desistente).
 * Se matriculado, vincula aluno à turma automaticamente + reordena fila.
 * Se desistente, reordena fila.
 * Usa transação para garantir atomicidade.
 */
export async function atualizarStatusFila(
  id: string,
  status: string,
  observacao?: string | null
): Promise<AtualizarStatusResult> {
  // Buscar dados da fila para ações extras
  const filaItem = await pool.query(
    `SELECT fe.aluno_id, fe.turma_id, fe.escola_id, t.serie, t.ano_letivo
     FROM fila_espera fe
     JOIN turmas t ON fe.turma_id = t.id
     WHERE fe.id = $1`,
    [id]
  )

  if (filaItem.rows.length === 0) {
    throw new Error('Item não encontrado na fila')
  }

  const item = filaItem.rows[0]

  await withTransaction(async (client) => {
    const updates: string[] = ['status = $1']
    const params: (string | null)[] = [status]
    let idx = 2

    if (status === 'convocado') {
      updates.push(`data_convocacao = CURRENT_TIMESTAMP`)
    }
    if (status === 'matriculado' || status === 'desistente') {
      updates.push(`data_resolucao = CURRENT_TIMESTAMP`)
    }
    if (observacao !== undefined) {
      updates.push(`observacao = $${idx}`)
      params.push(observacao)
      idx++
    }

    params.push(id)

    await client.query(
      `UPDATE fila_espera SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    )

    // Se matriculado, vincular aluno à turma automaticamente
    if (status === 'matriculado') {
      await client.query(
        `UPDATE alunos
         SET turma_id = $1, escola_id = $2, serie = $3, ano_letivo = $4,
             situacao = 'cursando', ativo = true, atualizado_em = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [item.turma_id, item.escola_id, item.serie, item.ano_letivo, item.aluno_id]
      )

      // Reordenar posições dos que ficaram na fila
      await client.query(REORDENAR_FILA_SQL, [item.turma_id])
    }

    // Se desistente, reordenar posições
    if (status === 'desistente') {
      await client.query(REORDENAR_FILA_SQL, [item.turma_id])
    }
  })

  return {
    mensagem: status === 'matriculado'
      ? 'Aluno matriculado e vinculado à turma com sucesso'
      : `Status atualizado para ${status}`
  }
}

/**
 * Remove aluno da fila + reordena posições.
 * Usa transação para garantir atomicidade.
 */
export async function removerDaFila(id: string): Promise<void> {
  // Buscar turma para reordenar
  const item = await pool.query(
    `SELECT turma_id, escola_id FROM fila_espera WHERE id = $1`,
    [id]
  )

  if (item.rows.length === 0) {
    throw new Error('Item não encontrado')
  }

  const turmaId = item.rows[0].turma_id

  await withTransaction(async (client) => {
    await client.query(`DELETE FROM fila_espera WHERE id = $1`, [id])

    // Reordenar posições
    await client.query(REORDENAR_FILA_SQL, [turmaId])
  })
}
