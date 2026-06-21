/**
 * Fase 6: Batch insert de turmas
 *
 * @module services/importacao/batch/turmas
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { resolverAnoLetivoId, resolverSerieId } from '@/lib/services/gestor/mestre.service'
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

    // Chave temporal canonica (anos_letivos.id) resolvida 1x por ano via cache.
    // Grava-se ano_letivo_id junto do varchar para a chave canonica nao nascer
    // vazia (backfill nao ser efemero). Lookup centralizado em mestre.service.
    const anoLetivoIdCache = new Map<string, string | null>()
    const idsTurmas = await Promise.all(
      turmasParaInserir.map(t => resolverAnoLetivoId(pool, t.ano_letivo, anoLetivoIdCache))
    )
    const anoLetivoIdPorTurma = new Map<string, string | null>()
    turmasParaInserir.forEach((t, idx) => anoLetivoIdPorTurma.set(t.tempId, idsTurmas[idx]))

    // Serie canonica (series_escolares.id) resolvida 1x por serie via cache.
    // Grava-se serie_id junto do varchar `serie` para a chave canonica nao nascer
    // vazia (ADR-004). Lookup centralizado em mestre.service.resolverSerieId.
    const serieIdCache = new Map<string, string | null>()
    const seriesTurmas = await Promise.all(
      turmasParaInserir.map(t => resolverSerieId(pool, t.serie, serieIdCache))
    )
    const serieIdPorTurma = new Map<string, string | null>()
    turmasParaInserir.forEach((t, idx) => serieIdPorTurma.set(t.tempId, seriesTurmas[idx]))

    for (let i = 0; i < turmasParaInserir.length; i += BATCH_SIZE) {
      const batch = turmasParaInserir.slice(i, i + BATCH_SIZE)
      try {
        const values: (string | null)[] = []
        const placeholders: string[] = []
        batch.forEach((turma, idx) => {
          const offset = idx * 9
          placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`)
          values.push(turma.codigo, turma.nome, turma.escola_id, turma.serie, serieIdPorTurma.get(turma.tempId) ?? null, turma.ano_letivo, anoLetivoIdPorTurma.get(turma.tempId) ?? null, turma.origem, turma.origem_importacao_id)
        })

        const result = await pool.query(
          `INSERT INTO turmas (codigo, nome, escola_id, serie, serie_id, ano_letivo, ano_letivo_id, origem, origem_importacao_id)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (escola_id, codigo, ano_letivo) DO UPDATE SET serie = EXCLUDED.serie, serie_id = EXCLUDED.serie_id, ano_letivo_id = EXCLUDED.ano_letivo_id
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
              'INSERT INTO turmas (codigo, nome, escola_id, serie, serie_id, ano_letivo, ano_letivo_id, origem, origem_importacao_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (escola_id, codigo, ano_letivo) DO UPDATE SET serie = EXCLUDED.serie, serie_id = EXCLUDED.serie_id, ano_letivo_id = EXCLUDED.ano_letivo_id RETURNING id',
              [turma.codigo, turma.nome, turma.escola_id, turma.serie, serieIdPorTurma.get(turma.tempId) ?? null, turma.ano_letivo, anoLetivoIdPorTurma.get(turma.tempId) ?? null, turma.origem, turma.origem_importacao_id]
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
