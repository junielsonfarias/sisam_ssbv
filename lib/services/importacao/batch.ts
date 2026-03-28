/**
 * Fases 6-9: Batch inserts de turmas, alunos, consolidados, producao e resultados
 *
 * @module services/importacao/batch
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { ImportacaoResultado } from './types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 6: BATCH INSERT DE TURMAS
// ============================================================================

/**
 * Fase 6: Cria turmas em batch e atualiza referencias temporarias
 */
export async function criarTurmas(
  turmasParaInserir: any[],
  alunosParaInserir: any[],
  consolidadosParaInserir: any[],
  resultadosParaInserir: any[]
): Promise<void> {
  log.info('[FASE 6] Criando turmas em batch...')
  if (turmasParaInserir.length > 0) {
    const tempToRealTurmas = new Map<string, string>()
    const BATCH_SIZE = 50

    for (let i = 0; i < turmasParaInserir.length; i += BATCH_SIZE) {
      const batch = turmasParaInserir.slice(i, i + BATCH_SIZE)
      try {
        const values: any[] = []
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

// ============================================================================
// FASE 7: BATCH INSERT DE ALUNOS
// ============================================================================

/**
 * Fase 7: Cria alunos em batch e atualiza referencias temporarias
 */
export async function criarAlunos(
  alunosParaInserir: any[],
  consolidadosParaInserir: any[],
  resultadosParaInserir: any[],
  producaoParaInserir: any[],
  resultado: ImportacaoResultado,
  erros: string[]
): Promise<void> {
  log.info('[FASE 7] Criando alunos em batch...')
  if (alunosParaInserir.length > 0) {
    const tempToRealAlunos = new Map<string, string>()
    let alunosComErro = 0
    const alunosComErroList: string[] = []
    const BATCH_SIZE = 50

    for (let i = 0; i < alunosParaInserir.length; i += BATCH_SIZE) {
      const batch = alunosParaInserir.slice(i, i + BATCH_SIZE)

      try {
        // Step 1: Batch lookup existing alunos using a VALUES CTE
        const lookupValues: any[] = []
        const lookupPlaceholders: string[] = []
        batch.forEach((aluno, idx) => {
          const nomeNormalizado = aluno.nome.toUpperCase().trim()
          const offset = idx * 4
          lookupPlaceholders.push(`($${offset + 1}, $${offset + 2}::uuid, $${offset + 3}::uuid, $${offset + 4})`)
          lookupValues.push(nomeNormalizado, aluno.escola_id, aluno.turma_id, aluno.ano_letivo)
        })

        const lookupResult = await pool.query(
          `SELECT a.id, UPPER(TRIM(a.nome)) as nome_norm, a.escola_id, a.turma_id, a.ano_letivo
           FROM alunos a
           INNER JOIN (VALUES ${lookupPlaceholders.join(', ')}) AS v(nome_norm, escola_id, turma_id, ano_letivo)
             ON UPPER(TRIM(a.nome)) = v.nome_norm
             AND a.escola_id = v.escola_id
             AND (a.turma_id = v.turma_id OR (a.turma_id IS NULL AND v.turma_id IS NULL))
             AND (a.ano_letivo = v.ano_letivo OR (a.ano_letivo IS NULL AND v.ano_letivo IS NULL))
             AND a.ativo = true`,
          lookupValues
        )

        // Build lookup map: "NOME|escola_id|turma_id|ano_letivo" -> id
        const existingMap = new Map<string, string>()
        for (const row of lookupResult.rows) {
          const key = `${row.nome_norm}|${row.escola_id}|${row.turma_id || ''}|${row.ano_letivo || ''}`
          existingMap.set(key, row.id)
        }

        // Step 2: Separate into updates and inserts
        const toUpdate: { aluno: any; existingId: string }[] = []
        const toInsert: any[] = []

        for (const aluno of batch) {
          const nomeNormalizado = aluno.nome.toUpperCase().trim()
          const key = `${nomeNormalizado}|${aluno.escola_id}|${aluno.turma_id || ''}|${aluno.ano_letivo || ''}`
          const existingId = existingMap.get(key)
          if (existingId) {
            toUpdate.push({ aluno, existingId })
          } else {
            toInsert.push(aluno)
          }
        }

        // Step 3: Batch UPDATE existing alunos
        if (toUpdate.length > 0) {
          const updateValues: any[] = []
          const updatePlaceholders: string[] = []
          toUpdate.forEach(({ aluno, existingId }, idx) => {
            const offset = idx * 3
            updatePlaceholders.push(`($${offset + 1}::uuid, $${offset + 2}::uuid, $${offset + 3})`)
            updateValues.push(existingId, aluno.turma_id, aluno.serie)
          })

          await pool.query(
            `UPDATE alunos SET turma_id = v.turma_id, serie = v.serie, atualizado_em = CURRENT_TIMESTAMP
             FROM (VALUES ${updatePlaceholders.join(', ')}) AS v(id, turma_id, serie)
             WHERE alunos.id = v.id`,
            updateValues
          )

          for (const { aluno, existingId } of toUpdate) {
            tempToRealAlunos.set(aluno.tempId, existingId)
            resultado.alunos.existentes++
          }
        }

        // Step 4: Batch INSERT new alunos
        if (toInsert.length > 0) {
          const insertValues: any[] = []
          const insertPlaceholders: string[] = []
          toInsert.forEach((aluno, idx) => {
            const offset = idx * 6
            insertPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`)
            insertValues.push(aluno.codigo, aluno.nome, aluno.escola_id, aluno.turma_id, aluno.serie, aluno.ano_letivo)
          })

          const insertResult = await pool.query(
            `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo)
             VALUES ${insertPlaceholders.join(', ')}
             RETURNING id, codigo, nome`,
            insertValues
          )

          // Map returned rows back to temp IDs by matching (codigo, nome) pairs in order
          // PostgreSQL RETURNING preserves insertion order
          for (let j = 0; j < insertResult.rows.length; j++) {
            const row = insertResult.rows[j]
            if (row.id) {
              tempToRealAlunos.set(toInsert[j].tempId, row.id)
              resultado.alunos.criados++
            } else {
              alunosComErro++
              alunosComErroList.push(`Aluno "${toInsert[j].nome}" (${toInsert[j].codigo}): Nao retornou ID`)
              log.error(`Aluno "${toInsert[j].nome}" nao retornou ID apos insercao`)
            }
          }
        }
      } catch (batchError: unknown) {
        // Fallback: try individually for this batch so one bad record doesn't lose the whole batch
        log.error(`Erro no batch de alunos (${i}-${i + batch.length}), tentando individualmente:`, batchError)
        for (const aluno of batch) {
          try {
            const nomeNormalizado = aluno.nome.toUpperCase().trim()
            const checkResult = await pool.query(
              `SELECT id FROM alunos
               WHERE UPPER(TRIM(nome)) = $1
               AND escola_id = $2
               AND (turma_id = $3 OR (turma_id IS NULL AND $3::uuid IS NULL))
               AND (ano_letivo = $4 OR (ano_letivo IS NULL AND $4 IS NULL))
               AND ativo = true
               LIMIT 1`,
              [nomeNormalizado, aluno.escola_id, aluno.turma_id, aluno.ano_letivo]
            )

            if (checkResult.rows.length > 0) {
              const alunoIdExistente = checkResult.rows[0].id
              await pool.query(
                `UPDATE alunos
                 SET turma_id = $1, serie = $2, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [aluno.turma_id, aluno.serie, alunoIdExistente]
              )
              tempToRealAlunos.set(aluno.tempId, alunoIdExistente)
              resultado.alunos.existentes++
            } else {
              const result = await pool.query(
                'INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, ano_letivo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [aluno.codigo, aluno.nome, aluno.escola_id, aluno.turma_id, aluno.serie, aluno.ano_letivo]
              )
              if (result.rows.length > 0 && result.rows[0].id) {
                tempToRealAlunos.set(aluno.tempId, result.rows[0].id)
                resultado.alunos.criados++
              } else {
                alunosComErro++
                alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): Nao retornou ID`)
                log.error(`Aluno "${aluno.nome}" nao retornou ID apos insercao`)
              }
            }
          } catch (error: unknown) {
            alunosComErro++
            alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): ${(error as Error).message}`)
            log.error(`Erro ao criar/atualizar aluno ${aluno.nome} (${aluno.codigo}):`, error)
            erros.push(`Aluno "${aluno.nome}": ${(error as Error).message}`)
          }
        }
      }
    }

    if (alunosComErro > 0) {
      log.error(`ATENCAO: ${alunosComErro} alunos tiveram erros!`)
      log.error(`   Alunos com erro: ${JSON.stringify(alunosComErroList.slice(0, 10))}`)
      if (alunosComErroList.length > 10) {
        log.error(`   ... e mais ${alunosComErroList.length - 10} alunos com erro`)
      }
    }

    // Atualizar referencias temporarias com IDs reais
    let consolidadosSemAluno = 0
    let resultadosSemAluno = 0

    consolidadosParaInserir.forEach(c => {
      if (c.aluno_id && c.aluno_id.startsWith('TEMP_ALUNO_')) {
        const realId = tempToRealAlunos.get(c.aluno_id)
        if (realId) {
          c.aluno_id = realId
        } else {
          consolidadosSemAluno++
          log.error(`Consolidado sem aluno: tempId ${c.aluno_id} nao foi convertido`)
        }
      }
    })

    resultadosParaInserir.forEach(r => {
      if (r.aluno_id && r.aluno_id.startsWith('TEMP_ALUNO_')) {
        const realId = tempToRealAlunos.get(r.aluno_id)
        if (realId) {
          r.aluno_id = realId
        } else {
          resultadosSemAluno++
        }
      }
    })

    // Atualizar IDs temporarios nos resultados de producao textual
    let producaoSemAluno = 0
    producaoParaInserir.forEach(p => {
      if (p.aluno_id && p.aluno_id.startsWith('TEMP_ALUNO_')) {
        const realId = tempToRealAlunos.get(p.aluno_id)
        if (realId) {
          p.aluno_id = realId
        } else {
          producaoSemAluno++
        }
      }
    })
    if (producaoSemAluno > 0) {
      log.error(`${producaoSemAluno} resultados de producao sem aluno valido`)
    }

    if (consolidadosSemAluno > 0) {
      log.error(`${consolidadosSemAluno} consolidados sem aluno valido`)
    }
    if (resultadosSemAluno > 0) {
      log.error(`${resultadosSemAluno} resultados sem aluno valido apos conversao de IDs`)
      const exemplosNaoConvertidos = resultadosParaInserir
        .filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_ALUNO_'))
        .slice(0, 5)
        .map(r => r.aluno_id)
      if (exemplosNaoConvertidos.length > 0) {
        log.error(`  -> Exemplos de IDs temporarios nao convertidos: ${exemplosNaoConvertidos.join(', ')}`)
        log.error(`  -> Total de alunos criados no mapa: ${tempToRealAlunos.size}`)
      }
    }

    const resultadosComIdReal = resultadosParaInserir.filter(r => r.aluno_id && !r.aluno_id.startsWith('TEMP_')).length
    const resultadosComIdTemporario = resultadosParaInserir.filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_')).length
    log.info(`  -> Apos conversao: ${resultadosComIdReal} resultados com ID real, ${resultadosComIdTemporario} ainda com ID temporario`)

    log.info(`  -> ${resultado.alunos.criados} alunos criados`)
    log.info(`  -> ${resultado.alunos.existentes} alunos atualizados (ja existiam)`)
    if (alunosComErro > 0) {
      log.info(`  -> ${alunosComErro} alunos falharam`)
    }
  }
}

// ============================================================================
// FASE 8: BATCH INSERT DE RESULTADOS CONSOLIDADOS
// ============================================================================

/**
 * Fase 8: Insere resultados consolidados em batch
 */
export async function inserirConsolidados(
  consolidadosParaInserir: any[],
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

// ============================================================================
// FASE 8.5: BATCH INSERT DE RESULTADOS DE PRODUCAO TEXTUAL
// ============================================================================

/**
 * Fase 8.5: Insere resultados de producao textual em batch
 */
export async function inserirProducao(
  producaoParaInserir: any[],
  alunosParaInserir: any[],
  consolidadosParaInserir: any[]
): Promise<void> {
  log.info('[FASE 8.5] Criando resultados de producao textual em batch...')
  if (producaoParaInserir.length > 0) {
    // Converter IDs temporarios para IDs reais
    const tempToRealAlunos = new Map<string, string>()
    alunosParaInserir.forEach((a, idx) => {
      // O mapa foi preenchido na fase 7, mas precisamos reconstruir se necessario
    })

    // Atualizar IDs temporarios
    producaoParaInserir.forEach(p => {
      if (p.aluno_id && p.aluno_id.startsWith('TEMP_ALUNO_')) {
        const consolidadoCorrespondente = consolidadosParaInserir.find(c =>
          c.aluno_id && !c.aluno_id.startsWith('TEMP_')
        )
      }
    })

    // Filtrar apenas resultados com IDs reais
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

// ============================================================================
// FASE 9: BATCH INSERT DE RESULTADOS DE PROVAS
// ============================================================================

/**
 * Fase 9: Insere resultados de provas em batch (com fallback individual)
 */
export async function inserirResultadosProvas(
  resultadosParaInserir: any[],
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
