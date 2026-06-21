/**
 * Logs de diagnostico final da Fase 5 (resumo do array de resultados).
 *
 * @module services/importacao/process/diagnostico
 */

import { createLogger } from '@/lib/logger'
import type { ConfiguracaoSerie } from '@/lib/types'
import type { ResultadoParaInserir } from '../types'

const log = createLogger('Importacao')

/**
 * Diagnostico de frequencia do aluno (apenas primeiros 5 alunos).
 */
export function logDiagnosticoPresenca(
  indiceLinha: number,
  alunoNome: string,
  presenca: string | null
): void {
  if (presenca === null) {
    log.debug(`Linha ${indiceLinha + 2}: Aluno "${alunoNome}" SEM dados de frequencia (sera marcado como "-")`)
  } else if (presenca === 'F') {
    log.debug(`Linha ${indiceLinha + 2}: Aluno "${alunoNome}" marcado como FALTANTE`)
  }
}

/**
 * Diagnostico da contagem de questoes processadas por aluno (primeiros 5 alunos).
 */
export function logDiagnosticoQuestoesAluno(
  indiceLinha: number,
  alunoNome: string,
  questoesProcessadas: number,
  questoesComValor: number,
  questoesVazias: number
): void {
  log.debug(`  -> Aluno ${indiceLinha + 1} "${alunoNome}": ${questoesProcessadas} questoes processadas (${questoesComValor} com valor, ${questoesVazias} vazias)`)
}

/**
 * Diagnostico da serie/configuracao do aluno (apenas primeiros 3 alunos).
 */
export function logDiagnosticoSerie(
  alunoNome: string,
  serieRaw: string,
  serie: string | null,
  numeroSerie: string | null,
  configSerieAluno: ConfiguracaoSerie | null | undefined,
  configSeries: Map<string, ConfiguracaoSerie>
): void {
  log.debug(`Serie do aluno "${alunoNome}":`)
  log.debug(`  - serieRaw: "${serieRaw}"`)
  log.debug(`  - serie (normalizada): "${serie}"`)
  log.debug(`  - numeroSerie (extraido): "${numeroSerie}"`)
  log.debug(`  - configSerieAluno encontrada: ${configSerieAluno ? 'SIM' : 'NAO'}`)
  log.debug(`  - configSeries.keys(): ${Array.from(configSeries.keys())}`)
}

/**
 * Diagnostico das colunas de questoes do primeiro aluno (i === 0).
 */
export function logDiagnosticoPrimeiroAluno(
  linha: Record<string, unknown>,
  configSerieAluno: ConfiguracaoSerie | null | undefined,
  serie: string | null
): void {
  const colunasDisponiveis = Object.keys(linha)
  const colunasQuestoes = colunasDisponiveis.filter(c => c.startsWith('Q') || c.match(/^Q\s*\d+$/i))
  const qtdEsperada = configSerieAluno?.total_questoes_objetivas || 60
  log.info(`[FASE 5] Diagnostico - Primeiro aluno (${serie || 'serie nao identificada'}):`)
  log.info(`  -> ${colunasQuestoes.length} colunas de questoes encontradas`)
  log.info(`  -> ${qtdEsperada} questoes esperadas para esta serie`)
  log.info(`  -> Producao textual: ${configSerieAluno?.tem_producao_textual ? 'Sim' : 'Nao'}`)
  if (colunasQuestoes.length < qtdEsperada) {
    log.error(`ATENCAO: Apenas ${colunasQuestoes.length} colunas de questoes encontradas! Esperado: ${qtdEsperada}`)
    log.error(`  -> Colunas encontradas: ${colunasQuestoes.slice(0, 10).join(', ')}...`)
  }
}

/**
 * Alerta quando o primeiro aluno nao teve nenhuma questao processada.
 */
export function logQuestoesSemProcessar(linha: Record<string, unknown>): void {
  log.error(`ATENCAO: Primeiro aluno nao teve nenhuma questao processada!`)
  log.error(`  -> Verificando colunas disponiveis no Excel...`)
  const todasColunas = Object.keys(linha)
  const colunasQ = todasColunas.filter(c => c.toUpperCase().startsWith('Q'))
  log.error(`  -> Colunas que comecam com 'Q': ${colunasQ.slice(0, 20).join(', ')}${colunasQ.length > 20 ? '...' : ''}`)
}

/**
 * Emite o resumo final da Fase 5: total processado e amostra/diagnostico do
 * array de resultados (ou alerta quando o array esta vazio).
 */
export function logDiagnosticoFinal(
  processados: number,
  resultadosParaInserir: ResultadoParaInserir[]
): void {
  log.info(`[FASE 5] Concluido: ${processados} linhas processadas`)
  log.info(`  -> Resultados para inserir: ${resultadosParaInserir.length} registros no array`)

  if (resultadosParaInserir.length > 0) {
    const amostraIds = [...new Set(resultadosParaInserir.slice(0, 10).map(r => r.aluno_id))].slice(0, 5)
    log.info(`  -> Amostra de aluno_id no array: ${amostraIds.join(', ')}`)

    const comTempId = resultadosParaInserir.filter(r => r.aluno_id && r.aluno_id.startsWith('TEMP_')).length
    log.info(`  -> Resultados com ID temporario: ${comTempId} (serao convertidos na FASE 7)`)

    const amostra = resultadosParaInserir[0]
    log.debug(`  -> Amostra de dados: ${JSON.stringify({
      aluno_id: amostra.aluno_id,
      questao_codigo: amostra.questao_codigo,
      acertou: amostra.acertou,
      ano_letivo: amostra.ano_letivo,
    })}`)
  } else {
    log.error(`ERRO CRITICO: Array resultadosParaInserir esta VAZIO!`)
    log.error(`  -> Isso significa que NENHUMA questao foi processada`)
    log.error(`  -> Possiveis causas:`)
    log.error(`    1. Colunas Q1-Q60 nao existem no Excel`)
    log.error(`    2. Todas as questoes estao vazias/null`)
    log.error(`    3. Nomes das colunas estao diferentes (ex: "Q 1" em vez de "Q1")`)
  }
}
