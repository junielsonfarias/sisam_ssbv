/**
 * Fase 9: Batch insert de resultados de provas
 *
 * @module services/importacao/batch/resultados
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import {
  ImportacaoResultado,
  ResultadoParaInserir,
} from '../types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 9: BATCH INSERT DE RESULTADOS DE PROVAS
// ============================================================================

/**
 * Fase 9: Insere resultados de provas em batch (com fallback individual)
 */
export async function inserirResultadosProvas(
  resultadosParaInserir: ResultadoParaInserir[],
  resultado: ImportacaoResultado,
  erros: string[]
): Promise<void> {
  log.info('[FASE 9] Criando resultados de provas em batch...')
  log.info(`  -> Total de resultados no array: ${resultadosParaInserir.length}`)

  if (resultadosParaInserir.length > 0) {
    const comIdTemporario = resultadosParaInserir.filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_')).length
    const semAlunoId = resultadosParaInserir.filter(r => !r.aluno_id).length
    const comIdReal = resultadosParaInserir.filter(r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')).length

    log.info(`  -> Diagnostico: ${comIdReal} com ID real, ${comIdTemporario} com ID temporario, ${semAlunoId} sem aluno_id`)

    const resultadosValidos = resultadosParaInserir.filter(
      r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')
    )

    const resultadosInvalidos = resultadosParaInserir.length - resultadosValidos.length
    if (resultadosInvalidos > 0) {
      log.error(`${resultadosInvalidos} resultados descartados (alunos nao criados ou IDs temporarios nao convertidos)`)
      const exemplosTemporarios = resultadosParaInserir
        .filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_'))
        .slice(0, 5)
        .map(r => r.aluno_id)
      if (exemplosTemporarios.length > 0) {
        log.error(`  -> Exemplos de IDs temporarios: ${exemplosTemporarios.join(', ')}`)
      }
    }

    const BATCH_SIZE = 500
    let batchesComErro = 0

    for (let i = 0; i < resultadosValidos.length; i += BATCH_SIZE) {
      const batch = resultadosValidos.slice(i, i + BATCH_SIZE)

      try {
        const valores = batch.map((_, idx) => {
          const base = idx * 17
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17})`
        }).join(', ')

        const params = batch.flatMap(r => [
          r.escola_id, r.aluno_id, r.aluno_codigo, r.aluno_nome, r.turma_id,
          r.questao_id, r.questao_codigo, r.resposta_aluno, r.acertou, r.nota,
          r.ano_letivo, r.avaliacao_id, r.serie, r.turma, r.disciplina, r.area_conhecimento, r.presenca,
        ])

        const insertResult = await pool.query(
          `INSERT INTO resultados_provas
           (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo,
            resposta_aluno, acertou, nota, ano_letivo, avaliacao_id, serie, turma, disciplina, area_conhecimento, presenca)
           VALUES ${valores}
           ON CONFLICT (aluno_id, questao_codigo, avaliacao_id)
           DO UPDATE SET
             resposta_aluno = EXCLUDED.resposta_aluno,
             acertou = EXCLUDED.acertou,
             nota = EXCLUDED.nota,
             atualizado_em = CURRENT_TIMESTAMP
           RETURNING id`,
          params
        )

        resultado.resultados.novos += insertResult.rows.length
        resultado.resultados.duplicados += (batch.length - insertResult.rows.length)

        if ((i / BATCH_SIZE + 1) % 10 === 0) {
          log.info(`  -> Processado ${Math.min(i + BATCH_SIZE, resultadosValidos.length)}/${resultadosValidos.length} resultados`)
        }
      } catch (error: unknown) {
        batchesComErro++
        log.error(`Erro no batch ${Math.floor(i / BATCH_SIZE) + 1} de resultados:`, error)
        erros.push(`Batch resultados ${Math.floor(i / BATCH_SIZE) + 1}: ${(error as Error).message}`)
        // Tentar inserir individualmente como fallback
        log.info(`  -> Tentando inserir ${batch.length} resultados individualmente...`)
        for (const r of batch) {
          try {
            const individualResult = await pool.query(
              `INSERT INTO resultados_provas
               (escola_id, aluno_id, aluno_codigo, aluno_nome, turma_id, questao_id, questao_codigo,
                resposta_aluno, acertou, nota, ano_letivo, avaliacao_id, serie, turma, disciplina, area_conhecimento, presenca)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (aluno_id, questao_codigo, avaliacao_id)
               DO UPDATE SET
                 resposta_aluno = EXCLUDED.resposta_aluno,
                 acertou = EXCLUDED.acertou,
                 nota = EXCLUDED.nota,
                 atualizado_em = CURRENT_TIMESTAMP
               RETURNING id`,
              [
                r.escola_id, r.aluno_id, r.aluno_codigo, r.aluno_nome, r.turma_id,
                r.questao_id, r.questao_codigo, r.resposta_aluno, r.acertou, r.nota,
                r.ano_letivo, r.avaliacao_id, r.serie, r.turma, r.disciplina, r.area_conhecimento, r.presenca,
              ]
            )
            if (individualResult.rows.length > 0) {
              resultado.resultados.novos++
            } else {
              resultado.resultados.duplicados++
            }
          } catch (err: unknown) {
            resultado.resultados.duplicados++
          }
        }
      }
    }

    if (batchesComErro > 0) {
      log.error(`${batchesComErro} batches com erro (tentativa de fallback individual)`)
    }
    log.info(`  -> ${resultado.resultados.novos} novos, ${resultado.resultados.duplicados} duplicados`)
    log.info(`  -> ${resultadosInvalidos} descartados (alunos nao criados)`)
  } else {
    log.error(`ATENCAO: Nenhum resultado para inserir! Array resultadosParaInserir esta vazio.`)
    log.error(`  -> Isso pode indicar que as colunas Q1-Q60 nao foram encontradas no Excel`)
    log.error(`  -> ou que todas as questoes estavam vazias/null`)
  }
}
