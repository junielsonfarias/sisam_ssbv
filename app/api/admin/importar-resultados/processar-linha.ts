/**
 * Processa uma única linha da planilha de importação: extrai dados,
 * resolve aluno/turma/escola via caches, calcula acertos+notas+níveis,
 * empurra dados para batches de provas e consolidados.
 */
import pool from '@/database/connection'
import { createLogger } from '@/lib/logger'
import { calcularNiveis, calcularNotasEMedia } from './calcular-medias'
import { CachesImportacao } from './caches'
import {
  detectarSeriePorQuestoes, inferirSerieDaTurma, normalizarSerie,
  obterConfigSerie, obterQuestoesMap, padronizarSerie,
} from './helpers-serie'
import { extrairPresenca, lerItensProducao, lerNotasPlanilha } from './parsers'
import { BatchConsolidados, BatchProvas } from './batch-inserts'

const log = createLogger('ImportarResultados:Linha')

export interface ContextoLinha {
  caches: CachesImportacao
  batchProvas: BatchProvas
  batchConsolidados: BatchConsolidados
  anoLetivo: string
  avaliacaoId: string | null
}

/**
 * Processa uma linha. Lança em caso de erro (chamador conta erros).
 */
export async function processarLinha(
  linha: Record<string, unknown>,
  indice: number,
  ctx: ContextoLinha
): Promise<void> {
  const { caches, batchProvas, batchConsolidados, anoLetivo, avaliacaoId } = ctx

  // ============================================================================
  // EXTRAIR CAMPOS BÁSICOS
  // ============================================================================
  const escolaNome = String(linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').trim()
  const alunoNome = String(linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').trim()
  const turmaCodigo = String(linha['TURMA'] || linha['Turma'] || linha['turma'] || '').trim()

  // IMPORTANTE: NÃO incluir 'Ano', 'ANO', 'ano' aqui — essas colunas geralmente
  // contêm o ano letivo (2025), não a série do aluno.
  let serieOriginal = String(
    linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['SÉRIE'] ||
    linha['serie'] || linha['Serie'] ||
    linha['ANO_SERIE'] || linha['Ano_Serie'] || linha['SERIE'] ||
    linha['Grade'] || linha['GRADE'] ||
    ''
  ).trim()

  // Inferir série quando coluna vier vazia
  if (!serieOriginal || normalizarSerie(serieOriginal) === '') {
    const serieInferida = inferirSerieDaTurma(turmaCodigo)
    if (serieInferida) {
      log.info(`Série inferida da turma "${turmaCodigo}": ${serieInferida}`)
      serieOriginal = serieInferida
    }
  }
  if (!serieOriginal || normalizarSerie(serieOriginal) === '') {
    const serieDetectada = detectarSeriePorQuestoes(linha)
    if (serieDetectada) {
      log.info(`Série detectada por questões (aluno "${alunoNome}"): ${serieDetectada}`)
      serieOriginal = serieDetectada
    }
  }

  const serie = padronizarSerie(serieOriginal)
  const presenca = extrairPresenca(linha)
  const itensProducao = lerItensProducao(linha)
  const { notaProducao, nivelProducao } = lerNotasPlanilha(linha)

  if (!escolaNome || !alunoNome) {
    throw new Error('Linha sem escola ou aluno')
  }

  // ============================================================================
  // RESOLVER ESCOLA / TURMA / ALUNO
  // ============================================================================
  const escolaNomeNorm = escolaNome.toUpperCase().trim()
  const escolaId = caches.cacheEscolas.get(escolaNomeNorm)
  if (!escolaId) {
    throw new Error(`Escola não encontrada: "${escolaNome}"`)
  }

  let turmaId: string | null = null
  if (turmaCodigo) {
    turmaId = caches.cacheTurmas.get(`${turmaCodigo}_${escolaId}`) || null
  }

  const alunoNomeNorm = alunoNome.toUpperCase().trim()
  const alunoCacheKey = `${alunoNomeNorm}_${escolaId}`
  let alunoId = caches.cacheAlunos.get(alunoCacheKey) || null

  // Criar aluno automaticamente se não existir (UPSERT idempotente)
  if (!alunoId) {
    try {
      const novoAlunoResult = await pool.query(
        `INSERT INTO alunos (nome, escola_id, turma_id, serie, ano_letivo, ativo)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (UPPER(TRIM(nome)), escola_id, ano_letivo)
         DO UPDATE SET turma_id = COALESCE(EXCLUDED.turma_id, alunos.turma_id),
                       serie = COALESCE(EXCLUDED.serie, alunos.serie),
                       atualizado_em = CURRENT_TIMESTAMP
         RETURNING id`,
        [alunoNome, escolaId, turmaId, serie, anoLetivo]
      )
      alunoId = novoAlunoResult.rows[0].id
      if (alunoId) caches.cacheAlunos.set(alunoCacheKey, alunoId)
      log.info(`Aluno criado/atualizado: "${alunoNome}" (ID: ${alunoId})`)
    } catch (createError: unknown) {
      log.error(`Erro ao criar aluno "${alunoNome}"`, createError)
      try {
        const existenteResult = await pool.query(
          `SELECT id FROM alunos
            WHERE UPPER(TRIM(nome)) = UPPER(TRIM($1))
              AND escola_id = $2
              AND ano_letivo = $3`,
          [alunoNome, escolaId, anoLetivo]
        )
        if (existenteResult.rows.length > 0) {
          alunoId = existenteResult.rows[0].id
          if (alunoId) caches.cacheAlunos.set(alunoCacheKey, alunoId)
        }
      } catch {
        // Ignorar erro do fallback
      }
    }
  }

  // ============================================================================
  // DETERMINAR PRESENÇA FINAL
  // ============================================================================
  const questoesMapDinamico = obterQuestoesMap(serie, caches.configSeriesMap)

  let temResultados = false
  for (const { inicio, fim } of questoesMapDinamico) {
    for (let num = inicio; num <= fim; num++) {
      const v = linha[`Q${num}`]
      if (v !== undefined && v !== null && v !== '') {
        temResultados = true
        break
      }
    }
    if (temResultados) break
  }

  let presencaFinal: string
  if (presenca === null && !temResultados) presencaFinal = '-'
  else if (presenca === null) presencaFinal = 'P'
  else presencaFinal = presenca

  const alunoFaltou = presencaFinal === 'F'
  const semDados = presencaFinal === '-'

  // ============================================================================
  // PROCESSAR QUESTÕES + CONTAR ACERTOS
  // ============================================================================
  let acertosLP = 0, acertosCH = 0, acertosMAT = 0, acertosCN = 0
  let questoesRespondidas = 0

  for (const { inicio, fim, area, disciplina } of questoesMapDinamico) {
    for (let num = inicio; num <= fim; num++) {
      const colunaQuestao = `Q${num}`
      const valorQuestao = linha[colunaQuestao]
      if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') continue

      questoesRespondidas++
      const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'

      if (acertou && !alunoFaltou && !semDados) {
        if (disciplina === 'Língua Portuguesa') acertosLP++
        else if (disciplina === 'Ciências Humanas') acertosCH++
        else if (disciplina === 'Matemática') acertosMAT++
        else if (disciplina === 'Ciências da Natureza') acertosCN++
      }

      const questaoId = caches.cacheQuestoes.get(colunaQuestao) || null

      await batchProvas.push([
        escolaId,
        alunoId || null,
        alunoId ? null : `ALU${(indice + 1).toString().padStart(4, '0')}`,
        alunoNome,
        turmaId,
        questaoId,
        colunaQuestao,
        (alunoFaltou || semDados) ? null : (acertou ? '1' : '0'),
        (alunoFaltou || semDados) ? false : acertou,
        (alunoFaltou || semDados) ? 0 : (acertou ? 1 : 0),
        anoLetivo,
        serie || null,
        turmaCodigo || null,
        disciplina,
        area,
        presencaFinal,
        avaliacaoId,
      ])
    }
  }

  // ============================================================================
  // CONSOLIDAR + EMPURRAR PARA BATCH
  // ============================================================================
  if (!alunoId || semDados) return

  const configSerie = obterConfigSerie(serie, caches.configSeriesMap)
  const serieNum = parseInt(serie.replace(/[^\d]/g, ''))

  const { notaLP, notaCH, notaMAT, notaCN, mediaAluno, totalQuestoesEsperadas } = calcularNotasEMedia(
    { acertosLP, acertosCH, acertosMAT, acertosCN },
    serie,
    configSerie,
    notaProducao
  )

  const niveis = calcularNiveis(
    serie,
    { acertosLP, acertosCH, acertosMAT, acertosCN },
    notaProducao,
    nivelProducao,
    alunoFaltou || semDados
  )

  const tipoAvaliacao = serieNum >= 1 && serieNum <= 5 ? 'anos_iniciais' : 'anos_finais'

  await batchConsolidados.push([
    alunoId, escolaId, turmaId, anoLetivo, serie, presencaFinal,
    acertosLP, acertosCH, acertosMAT, acertosCN,
    notaLP.toFixed(2), notaCH.toFixed(2), notaMAT.toFixed(2), notaCN.toFixed(2),
    mediaAluno.toFixed(2),
    notaProducao || 0, nivelProducao,
    (alunoFaltou || semDados) ? null : (itensProducao[0] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[1] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[2] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[3] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[4] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[5] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[6] ?? null),
    (alunoFaltou || semDados) ? null : (itensProducao[7] ?? null),
    questoesRespondidas, totalQuestoesEsperadas, tipoAvaliacao,
    niveis.nivelLp, niveis.nivelMat, niveis.nivelProd, niveis.nivelAluno,
    avaliacaoId,
  ])
}
