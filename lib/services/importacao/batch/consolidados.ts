/**
 * Fase 8: Batch insert de resultados consolidados
 *
 * @module services/importacao/batch/consolidados
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { ConsolidadoParaInserir } from '../types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 8: BATCH INSERT DE RESULTADOS CONSOLIDADOS
// ============================================================================

/**
 * Fase 8: Insere resultados consolidados em batch
 */
export async function inserirConsolidados(
  consolidadosParaInserir: ConsolidadoParaInserir[],
  erros: string[]
): Promise<void> {
  log.info('[FASE 8] Criando resultados consolidados em batch...')
  if (consolidadosParaInserir.length > 0) {
    let consolidadosCriados = 0
    let consolidadosComErro = 0
    let consolidadosPulados = 0

    for (const consolidado of consolidadosParaInserir) {
      if (!consolidado.aluno_id || consolidado.aluno_id.startsWith('TEMP_')) {
        consolidadosPulados++
        continue
      }

      try {
        await pool.query(
          `INSERT INTO resultados_consolidados
           (aluno_id, escola_id, turma_id, ano_letivo, avaliacao_id, serie, presenca,
            total_acertos_lp, total_acertos_ch, total_acertos_mat, total_acertos_cn,
            nota_lp, nota_ch, nota_mat, nota_cn, media_aluno,
            nota_producao, nivel_aprendizagem, nivel_aprendizagem_id,
            tipo_avaliacao, total_questoes_esperadas,
            item_producao_1, item_producao_2, item_producao_3, item_producao_4,
            item_producao_5, item_producao_6, item_producao_7, item_producao_8,
            nivel_lp, nivel_mat, nivel_prod, nivel_aluno)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
                   $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
                   $30, $31, $32, $33)
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
             nivel_aprendizagem_id = EXCLUDED.nivel_aprendizagem_id,
             tipo_avaliacao = EXCLUDED.tipo_avaliacao,
             total_questoes_esperadas = EXCLUDED.total_questoes_esperadas,
             item_producao_1 = EXCLUDED.item_producao_1,
             item_producao_2 = EXCLUDED.item_producao_2,
             item_producao_3 = EXCLUDED.item_producao_3,
             item_producao_4 = EXCLUDED.item_producao_4,
             item_producao_5 = EXCLUDED.item_producao_5,
             item_producao_6 = EXCLUDED.item_producao_6,
             item_producao_7 = EXCLUDED.item_producao_7,
             item_producao_8 = EXCLUDED.item_producao_8,
             nivel_lp = EXCLUDED.nivel_lp,
             nivel_mat = EXCLUDED.nivel_mat,
             nivel_prod = EXCLUDED.nivel_prod,
             nivel_aluno = EXCLUDED.nivel_aluno,
             atualizado_em = CURRENT_TIMESTAMP`,
          [
            consolidado.aluno_id,
            consolidado.escola_id,
            consolidado.turma_id,
            consolidado.ano_letivo,
            consolidado.avaliacao_id,
            consolidado.serie,
            consolidado.presenca,
            consolidado.total_acertos_lp,
            consolidado.total_acertos_ch,
            consolidado.total_acertos_mat,
            consolidado.total_acertos_cn,
            consolidado.nota_lp,
            consolidado.nota_ch,
            consolidado.nota_mat,
            consolidado.nota_cn,
            consolidado.media_aluno,
            consolidado.nota_producao,
            consolidado.nivel_aprendizagem,
            consolidado.nivel_aprendizagem_id,
            consolidado.tipo_avaliacao,
            consolidado.total_questoes_esperadas,
            consolidado.item_producao_1,
            consolidado.item_producao_2,
            consolidado.item_producao_3,
            consolidado.item_producao_4,
            consolidado.item_producao_5,
            consolidado.item_producao_6,
            consolidado.item_producao_7,
            consolidado.item_producao_8,
            consolidado.nivel_lp,
            consolidado.nivel_mat,
            consolidado.nivel_prod,
            consolidado.nivel_aluno,
          ]
        )
        consolidadosCriados++
      } catch (error: unknown) {
        consolidadosComErro++
        log.error(`Erro ao criar consolidado para aluno ${consolidado.aluno_id}:`, error)
        erros.push(`Consolidado aluno ${consolidado.aluno_id}: ${(error as Error).message}`)
      }
    }

    if (consolidadosPulados > 0) {
      log.error(`${consolidadosPulados} consolidados pulados (alunos nao criados)`)
    }
    if (consolidadosComErro > 0) {
      log.error(`${consolidadosComErro} consolidados com erro`)
    }
    log.info(`  -> ${consolidadosCriados} consolidados criados/atualizados com sucesso`)
  }
}
