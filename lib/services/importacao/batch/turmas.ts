/**
 * Fase 6: Batch insert de turmas
 *
 * @module services/importacao/batch/turmas
 */

import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { resolverAnoLetivoId, resolverSerieId } from '@/lib/services/gestor/mestre.service'
import { getEtlGateMode } from '../config'
import { registrarDivergenciaImportacao } from '../governanca'
import {
  TurmaParaInserir,
  AlunoParaInserir,
  ConsolidadoParaInserir,
  ResultadoParaInserir,
  ImportacaoConfig,
  ImportacaoResultado,
} from '../types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 6: BATCH INSERT / MATCH-ONLY DE TURMAS
// ============================================================================

/**
 * Propaga o ID real (ou ausencia dele) da turma para as referencias temporarias
 * dos alunos/consolidados/resultados que apontavam para o tempId.
 */
function propagarTurmaIds(
  tempToRealTurmas: Map<string, string>,
  alunosParaInserir: AlunoParaInserir[],
  consolidadosParaInserir: ConsolidadoParaInserir[],
  resultadosParaInserir: ResultadoParaInserir[]
): void {
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
}

/**
 * Modo match-only (estrito, padrao ADR-001): o ETL NAO cria turmas no cadastro
 * mestre. Procura cada turma do arquivo por chave (escola_id + codigo +
 * ano_letivo); se existir, vincula o tempId ao ID real; se nao, registra uma
 * divergencia em `importacao_divergencias` para triagem no Gestor.
 */
async function casarTurmasEstrito(
  turmasParaInserir: TurmaParaInserir[],
  alunosParaInserir: AlunoParaInserir[],
  consolidadosParaInserir: ConsolidadoParaInserir[],
  resultadosParaInserir: ResultadoParaInserir[],
  config: ImportacaoConfig,
  resultado: ImportacaoResultado
): Promise<void> {
  const tempToRealTurmas = new Map<string, string>()
  const BATCH_SIZE = 50

  for (let i = 0; i < turmasParaInserir.length; i += BATCH_SIZE) {
    const batch = turmasParaInserir.slice(i, i + BATCH_SIZE)
    const lookupValues: (string | null)[] = []
    const lookupPlaceholders: string[] = []
    batch.forEach((turma, idx) => {
      const offset = idx * 3
      lookupPlaceholders.push(`($${offset + 1}::uuid, $${offset + 2}, $${offset + 3})`)
      lookupValues.push(turma.escola_id, turma.codigo, turma.ano_letivo)
    })

    let existingMap = new Map<string, string>()
    try {
      const lookupResult = await pool.query(
        `SELECT t.id, t.escola_id, t.codigo, t.ano_letivo
         FROM turmas t
         INNER JOIN (VALUES ${lookupPlaceholders.join(', ')}) AS v(escola_id, codigo, ano_letivo)
           ON t.escola_id = v.escola_id AND t.codigo = v.codigo AND t.ano_letivo = v.ano_letivo`,
        lookupValues
      )
      for (const row of lookupResult.rows) {
        existingMap.set(`${row.escola_id}|${row.codigo}|${row.ano_letivo}`, row.id)
      }
    } catch (error: unknown) {
      log.error('Erro no lookup de turmas (match-only):', error)
      existingMap = new Map<string, string>()
    }

    for (const turma of batch) {
      const key = `${turma.escola_id}|${turma.codigo}|${turma.ano_letivo}`
      const realId = existingMap.get(key)
      if (realId) {
        tempToRealTurmas.set(turma.tempId, realId)
        resultado.turmas.existentes++
      } else {
        resultado.turmas.divergentes++
        await registrarDivergenciaImportacao({
          tipo: 'turma',
          dadoEtl: {
            codigo: turma.codigo,
            nome: turma.nome,
            escola_id: turma.escola_id,
            serie: turma.serie,
            ano_letivo: turma.ano_letivo,
          },
          chaveTentada: `escola_id+codigo+ano_letivo (${turma.codigo}/${turma.ano_letivo})`,
          importacaoId: config.importacaoId,
        })
      }
    }
  }

  propagarTurmaIds(tempToRealTurmas, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir)
  log.info(
    `  -> [MATCH-ONLY] turmas: ${resultado.turmas.existentes} vinculadas, ` +
    `${resultado.turmas.divergentes} divergentes (gate Gestor — nao criadas)`
  )
}

/**
 * Fase 6: Cria/casa turmas em batch e atualiza referencias temporarias.
 *
 * Modo padrao (ADR-001 match-only/estrito): NAO cria turmas — vincula as
 * existentes e registra divergencia para as ausentes. O modo `transicao`
 * (ETL_GATE_MESTRE=transicao) preserva o comportamento legado de criar turmas
 * marcando origem='sisam_etl'.
 */
export async function criarTurmas(
  turmasParaInserir: TurmaParaInserir[],
  alunosParaInserir: AlunoParaInserir[],
  consolidadosParaInserir: ConsolidadoParaInserir[],
  resultadosParaInserir: ResultadoParaInserir[],
  config: ImportacaoConfig,
  resultado: ImportacaoResultado
): Promise<void> {
  log.info('[FASE 6] Processando turmas em batch...')
  if (turmasParaInserir.length === 0) return

  if (getEtlGateMode() === 'estrito') {
    await casarTurmasEstrito(
      turmasParaInserir,
      alunosParaInserir,
      consolidadosParaInserir,
      resultadosParaInserir,
      config,
      resultado
    )
    return
  }

  // Modo transicao (legado): cria turmas marcando origem='sisam_etl'.
  {
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
    propagarTurmaIds(tempToRealTurmas, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir)
    resultado.turmas.criados += tempToRealTurmas.size
    log.info(`  -> [TRANSICAO] ${turmasParaInserir.length} turmas criadas/atualizadas`)
  }
}
