/**
 * Fase 6: Batch insert de turmas
 *
 * @module services/importacao/batch/turmas
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import {
  TurmaParaInserir,
  AlunoParaInserir,
  ConsolidadoParaInserir,
  ResultadoParaInserir,
} from '../types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 6: BATCH INSERT DE TURMAS
// ============================================================================

/**
 * Fase 6: Cria turmas em batch e atualiza referencias temporarias
 */
export async function criarTurmas(
  turmasParaInserir: TurmaParaInserir[],
  alunosParaInserir: AlunoParaInserir[],
  consolidadosParaInserir: ConsolidadoParaInserir[],
  resultadosParaInserir: ResultadoParaInserir[]
): Promise<void> {
  log.info('[FASE 6] Criando turmas em batch...')
  if (turmasParaInserir.length > 0) {
    const tempToRealTurmas = new Map<string, string>()
    const BATCH_SIZE = 50

    for (let i = 0; i < turmasParaInserir.length; i += BATCH_SIZE) {
      const batch = turmasParaInserir.slice(i, i + BATCH_SIZE)
      try {
        const values: (string | null)[] = []
        const placeholders: string[] = []
        batch.forEach((turma, idx) => {
          const offset = idx * 5
          placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`)
          values.push(turma.codigo, turma.nome, turma.escola_id, turma.serie, turma.ano_letivo)
        })

        const result = await pool.query(
          `INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (escola_id, codigo, ano_letivo) DO UPDATE SET serie = EXCLUDED.serie
           RETURNING id, codigo, escola_id, ano_letivo`,
          values
        )

        // Map returned rows back to temp IDs using (codigo, escola_id, ano_letivo) as key
        const returnedMap = new Map<string, string>()
        for (const row of result.rows) {
          returnedMap.set(`${row.codigo}|${row.escola_id}|${row.ano_letivo}`, row.id)
        }
        for (const turma of batch) {
          const key = `${turma.codigo}|${turma.escola_id}|${turma.ano_letivo}`
          const realId = returnedMap.get(key)
          if (realId) {
            tempToRealTurmas.set(turma.tempId, realId)
          }
        }
      } catch (batchError: unknown) {
        // Fallback: try individually for this batch so one bad record doesn't lose the whole batch
        log.error(`Erro no batch de turmas (${i}-${i + batch.length}), tentando individualmente:`, batchError)
        for (const turma of batch) {
          try {
            const result = await pool.query(
              'INSERT INTO turmas (codigo, nome, escola_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (escola_id, codigo, ano_letivo) DO UPDATE SET serie = EXCLUDED.serie RETURNING id',
              [turma.codigo, turma.nome, turma.escola_id, turma.serie, turma.ano_letivo]
            )
            tempToRealTurmas.set(turma.tempId, result.rows[0].id)
          } catch (error: unknown) {
            log.error(`Erro ao criar turma ${turma.codigo}:`, error)
          }
        }
      }
    }

    // Atualizar referencias temporarias com IDs reais
    alunosParaInserir.forEach(a => {
      if (a.turma_id && a.turma_id.startsWith('TEMP_TURMA_')) {
        a.turma_id = tempToRealTurmas.get(a.turma_id) || null
      }
    })
    consolidadosParaInserir.forEach(c => {
      if (c.turma_id && c.turma_id.startsWith('TEMP_TURMA_')) {
        c.turma_id = tempToRealTurmas.get(c.turma_id) || null
      }
    })
    resultadosParaInserir.forEach(r => {
      if (r.turma_id && r.turma_id.startsWith('TEMP_TURMA_')) {
        r.turma_id = tempToRealTurmas.get(r.turma_id) || null
      }
    })
    log.info(`  -> ${turmasParaInserir.length} turmas criadas`)
  }
}
