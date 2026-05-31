/**
 * Fábricas para batch insert em resultados_provas e resultados_consolidados.
 *
 * O processamento de cada linha pode gerar até 60 inserts em resultados_provas
 * (1 por questão) e 1 em resultados_consolidados. Acumular e enviar em
 * batches reduz drasticamente o roundtrip ao Postgres.
 */
import pool from '@/database/connection'

const BATCH_SIZE_PROVAS = 500
const BATCH_SIZE_CONSOLIDADOS = 100

export type LinhaProvas = (string | number | boolean | null | undefined)[]
export type LinhaConsolidados = (string | number | boolean | null)[]

export interface BatchProvas {
  push: (row: LinhaProvas) => Promise<void>
  flush: () => Promise<void>
  total: () => number
}

export interface BatchConsolidados {
  push: (row: LinhaConsolidados) => Promise<void>
  flush: () => Promise<void>
}

/** Fábrica de batch para resultados_provas. */
export function criarBatchProvas(): BatchProvas {
  let buffer: LinhaProvas[] = []
  let totalImportadas = 0

  async function executar() {
    if (buffer.length === 0) return

    const placeholders: string[] = []
    const params: (string | number | boolean | null | undefined)[] = []
    let paramIndex = 1

    for (const values of buffer) {
      const rowPlaceholders = values.map(() => `$${paramIndex++}`).join(', ')
      placeholders.push(`(${rowPlaceholders})`)
      params.push(...values)
    }

    const query = `
      INSERT INTO resultados_provas
      (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo,
       resposta_aluno, acertou, nota, ano_letivo, serie, turma, disciplina, area_conhecimento, presenca, avaliacao_id)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (aluno_id, questao_codigo, avaliacao_id)
      DO UPDATE SET
        resposta_aluno = EXCLUDED.resposta_aluno,
        acertou = EXCLUDED.acertou,
        nota = EXCLUDED.nota,
        presenca = EXCLUDED.presenca,
        atualizado_em = CURRENT_TIMESTAMP
    `

    await pool.query(query, params)
    totalImportadas += buffer.length
    buffer = []
  }

  return {
    push: async (row) => {
      buffer.push(row)
      if (buffer.length >= BATCH_SIZE_PROVAS) await executar()
    },
    flush: executar,
    total: () => totalImportadas,
  }
}

/** Fábrica de batch para resultados_consolidados (33 colunas por linha). */
export function criarBatchConsolidados(): BatchConsolidados {
  const buffer: LinhaConsolidados[] = []
  const COLS = 33

  async function executar() {
    if (buffer.length === 0) return

    const placeholders: string[] = []
    const params: (string | number | boolean | null)[] = []

    for (let idx = 0; idx < buffer.length; idx++) {
      const row = buffer[idx]
      const base = idx * COLS
      const rowPlaceholders = row.map((_, colIdx) => `$${base + colIdx + 1}`).join(', ')
      placeholders.push(`(${rowPlaceholders})`)
      params.push(...row)
    }

    const query = `
      INSERT INTO resultados_consolidados (
        aluno_id, escola_id, turma_id, ano_letivo, serie, presenca,
        total_acertos_lp, total_acertos_ch, total_acertos_mat, total_acertos_cn,
        nota_lp, nota_ch, nota_mat, nota_cn, media_aluno,
        nota_producao, nivel_aprendizagem,
        item_producao_1, item_producao_2, item_producao_3, item_producao_4,
        item_producao_5, item_producao_6, item_producao_7, item_producao_8,
        total_questoes_respondidas, total_questoes_esperadas, tipo_avaliacao,
        nivel_lp, nivel_mat, nivel_prod, nivel_aluno,
        avaliacao_id
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (aluno_id, avaliacao_id)
      DO UPDATE SET
        escola_id = EXCLUDED.escola_id,
        turma_id = EXCLUDED.turma_id,
        serie = EXCLUDED.serie,
        presenca = EXCLUDED.presenca,
        total_acertos_lp = EXCLUDED.total_acertos_lp,
        total_acertos_ch = EXCLUDED.total_acertos_ch,
        total_acertos_mat = EXCLUDED.total_acertos_mat,
        total_acertos_cn = EXCLUDED.total_acertos_cn,
        nota_lp = EXCLUDED.nota_lp,
        nota_ch = EXCLUDED.nota_ch,
        nota_mat = EXCLUDED.nota_mat,
        nota_cn = EXCLUDED.nota_cn,
        media_aluno = EXCLUDED.media_aluno,
        nota_producao = EXCLUDED.nota_producao,
        nivel_aprendizagem = EXCLUDED.nivel_aprendizagem,
        item_producao_1 = EXCLUDED.item_producao_1,
        item_producao_2 = EXCLUDED.item_producao_2,
        item_producao_3 = EXCLUDED.item_producao_3,
        item_producao_4 = EXCLUDED.item_producao_4,
        item_producao_5 = EXCLUDED.item_producao_5,
        item_producao_6 = EXCLUDED.item_producao_6,
        item_producao_7 = EXCLUDED.item_producao_7,
        item_producao_8 = EXCLUDED.item_producao_8,
        total_questoes_respondidas = EXCLUDED.total_questoes_respondidas,
        total_questoes_esperadas = EXCLUDED.total_questoes_esperadas,
        tipo_avaliacao = EXCLUDED.tipo_avaliacao,
        nivel_lp = EXCLUDED.nivel_lp,
        nivel_mat = EXCLUDED.nivel_mat,
        nivel_prod = EXCLUDED.nivel_prod,
        nivel_aluno = EXCLUDED.nivel_aluno,
        atualizado_em = CURRENT_TIMESTAMP
    `

    await pool.query(query, params)
    buffer.length = 0
  }

  return {
    push: async (row) => {
      buffer.push(row)
      if (buffer.length >= BATCH_SIZE_CONSOLIDADOS) await executar()
    },
    flush: executar,
  }
}
