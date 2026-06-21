/**
 * Fase 7: Batch insert de alunos
 *
 * @module services/importacao/batch/alunos
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { resolverAnoLetivoId, resolverSerieId } from '@/lib/services/gestor/mestre.service'
import {
  ImportacaoResultado,
  AlunoParaInserir,
  ConsolidadoParaInserir,
  ResultadoParaInserir,
  ProducaoParaInserir,
} from '../types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 7: BATCH INSERT DE ALUNOS
// ============================================================================

/**
 * Fase 7: Cria alunos em batch e atualiza referencias temporarias
 */
export async function criarAlunos(
  alunosParaInserir: AlunoParaInserir[],
  consolidadosParaInserir: ConsolidadoParaInserir[],
  resultadosParaInserir: ResultadoParaInserir[],
  producaoParaInserir: ProducaoParaInserir[],
  resultado: ImportacaoResultado,
  erros: string[]
): Promise<void> {
  log.info('[FASE 7] Criando alunos em batch...')
  if (alunosParaInserir.length > 0) {
    const tempToRealAlunos = new Map<string, string>()
    let alunosComErro = 0
    const alunosComErroList: string[] = []
    const BATCH_SIZE = 50

    // Chave temporal canonica (anos_letivos.id) resolvida 1x por ano via cache.
    // Grava-se ano_letivo_id no INSERT e tambem no UPDATE (cura linhas legadas
    // que estavam com a chave canonica NULL). Lookup centralizado em mestre.service.
    const anoLetivoIdCache = new Map<string, string | null>()
    const idsAlunos = await Promise.all(
      alunosParaInserir.map(a => resolverAnoLetivoId(pool, a.ano_letivo, anoLetivoIdCache))
    )
    const anoLetivoIdPorAluno = new Map<string, string | null>()
    alunosParaInserir.forEach((a, idx) => anoLetivoIdPorAluno.set(a.tempId, idsAlunos[idx]))

    // Serie canonica (series_escolares.id) resolvida 1x por serie via cache.
    // Grava-se serie_id no INSERT e tambem no UPDATE (cura linhas legadas que
    // estavam com a chave canonica NULL). Lookup centralizado em mestre.service (ADR-004).
    const serieIdCache = new Map<string, string | null>()
    const seriesAlunos = await Promise.all(
      alunosParaInserir.map(a => resolverSerieId(pool, a.serie, serieIdCache))
    )
    const serieIdPorAluno = new Map<string, string | null>()
    alunosParaInserir.forEach((a, idx) => serieIdPorAluno.set(a.tempId, seriesAlunos[idx]))

    for (let i = 0; i < alunosParaInserir.length; i += BATCH_SIZE) {
      const batch = alunosParaInserir.slice(i, i + BATCH_SIZE)

      try {
        // Step 1: Batch lookup existing alunos using a VALUES CTE
        const lookupValues: (string | null)[] = []
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
        const toUpdate: { aluno: AlunoParaInserir; existingId: string }[] = []
        const toInsert: AlunoParaInserir[] = []

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
          const updateValues: (string | null)[] = []
          const updatePlaceholders: string[] = []
          toUpdate.forEach(({ aluno, existingId }, idx) => {
            const offset = idx * 5
            updatePlaceholders.push(`($${offset + 1}::uuid, $${offset + 2}::uuid, $${offset + 3}, $${offset + 4}::uuid, $${offset + 5}::uuid)`)
            updateValues.push(existingId, aluno.turma_id, aluno.serie, serieIdPorAluno.get(aluno.tempId) ?? null, anoLetivoIdPorAluno.get(aluno.tempId) ?? null)
          })

          await pool.query(
            `UPDATE alunos SET turma_id = v.turma_id, serie = v.serie, serie_id = v.serie_id, ano_letivo_id = v.ano_letivo_id, atualizado_em = CURRENT_TIMESTAMP
             FROM (VALUES ${updatePlaceholders.join(', ')}) AS v(id, turma_id, serie, serie_id, ano_letivo_id)
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
          const insertValues: (string | null)[] = []
          const insertPlaceholders: string[] = []
          toInsert.forEach((aluno, idx) => {
            const offset = idx * 10
            insertPlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`)
            insertValues.push(aluno.codigo, aluno.nome, aluno.escola_id, aluno.turma_id, aluno.serie, serieIdPorAluno.get(aluno.tempId) ?? null, aluno.ano_letivo, anoLetivoIdPorAluno.get(aluno.tempId) ?? null, aluno.origem, aluno.origem_importacao_id)
          })

          const insertResult = await pool.query(
            `INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, serie_id, ano_letivo, ano_letivo_id, origem, origem_importacao_id)
             VALUES ${insertPlaceholders.join(', ')}
             RETURNING id, codigo, nome`,
            insertValues
          )

          // Casamento deterministico por codigo (ALU#### unico por aluno), em vez de
          // depender da ordem das linhas em RETURNING (PostgreSQL nao garante essa ordem).
          const codigoParaTempId = new Map<string, string>()
          for (const aluno of toInsert) {
            codigoParaTempId.set(aluno.codigo, aluno.tempId)
          }
          const tempIdsResolvidos = new Set<string>()

          for (const row of insertResult.rows) {
            const tempId = codigoParaTempId.get(row.codigo)
            if (row.id && tempId) {
              tempToRealAlunos.set(tempId, row.id)
              tempIdsResolvidos.add(tempId)
              resultado.alunos.criados++
            } else {
              alunosComErro++
              alunosComErroList.push(`Aluno "${row.nome}" (${row.codigo}): Nao retornou ID`)
              log.error(`Aluno "${row.nome}" nao retornou ID apos insercao`)
            }
          }

          // Garante que nenhum aluno enviado ficou sem ID resolvido.
          for (const aluno of toInsert) {
            if (!tempIdsResolvidos.has(aluno.tempId)) {
              alunosComErro++
              alunosComErroList.push(`Aluno "${aluno.nome}" (${aluno.codigo}): Nao retornou ID`)
              log.error(`Aluno "${aluno.nome}" nao retornou ID apos insercao`)
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
                 SET turma_id = $1, serie = $2, serie_id = $3, ano_letivo_id = $4, atualizado_em = CURRENT_TIMESTAMP
                 WHERE id = $5`,
                [aluno.turma_id, aluno.serie, serieIdPorAluno.get(aluno.tempId) ?? null, anoLetivoIdPorAluno.get(aluno.tempId) ?? null, alunoIdExistente]
              )
              tempToRealAlunos.set(aluno.tempId, alunoIdExistente)
              resultado.alunos.existentes++
            } else {
              const result = await pool.query(
                'INSERT INTO alunos (codigo, nome, escola_id, turma_id, serie, serie_id, ano_letivo, ano_letivo_id, origem, origem_importacao_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
                [aluno.codigo, aluno.nome, aluno.escola_id, aluno.turma_id, aluno.serie, serieIdPorAluno.get(aluno.tempId) ?? null, aluno.ano_letivo, anoLetivoIdPorAluno.get(aluno.tempId) ?? null, aluno.origem, aluno.origem_importacao_id]
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
