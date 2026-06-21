/**
 * Fase 8.5: Batch insert de resultados de producao textual
 *
 * @module services/importacao/batch/producao
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { ProducaoParaInserir } from '../types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 8.5: BATCH INSERT DE RESULTADOS DE PRODUCAO TEXTUAL
// ============================================================================

/**
 * Fase 8.5: Insere resultados de producao textual em batch
 */
export async function inserirProducao(
  producaoParaInserir: ProducaoParaInserir[]
): Promise<void> {
  log.info('[FASE 8.5] Criando resultados de producao textual em batch...')
  if (producaoParaInserir.length > 0) {
    // A conversao de IDs temporarios -> reais ja ocorreu na fase 7.
    // Aqui apenas filtramos os resultados que ja possuem ID real.
    const producaoValida = producaoParaInserir.filter(
      p => p.aluno_id && !p.aluno_id.startsWith('TEMP_')
    )

    let producaoCriada = 0
    let producaoComErro = 0

    for (const producao of producaoValida) {
      try {
        await pool.query(
          `INSERT INTO resultados_producao
           (aluno_id, escola_id, turma_id, item_producao_id, ano_letivo, avaliacao_id, serie, nota)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (aluno_id, item_producao_id, avaliacao_id)
           DO UPDATE SET
             nota = EXCLUDED.nota,
             atualizado_em = CURRENT_TIMESTAMP`,
          [
            producao.aluno_id,
            producao.escola_id,
            producao.turma_id,
            producao.item_producao_id,
            producao.ano_letivo,
            producao.avaliacao_id,
            producao.serie,
            producao.nota,
          ]
        )
        producaoCriada++
      } catch (error: unknown) {
        producaoComErro++
        if (producaoComErro <= 5) {
          log.error(`Erro ao criar producao: ${(error as Error).message}`)
        }
      }
    }

    log.info(`  -> ${producaoCriada} resultados de producao criados/atualizados`)
    if (producaoComErro > 0) {
      log.error(`  -> ${producaoComErro} erros`)
    }
  } else {
    log.info('  -> Nenhum resultado de producao textual para inserir')
  }
}
