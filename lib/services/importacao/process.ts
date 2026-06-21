/**
 * Fase 5: Processar linhas do arquivo Excel
 *
 * @module services/importacao/process
 */

import {
  extrairNumeroSerie,
  calcularNivelAprendizagem,
} from '@/lib/config-series'
import { normalizarSerie } from '@/lib/normalizar-serie'
import { createLogger } from '@/lib/logger'
import { lerSerieDoExcel } from './parse'
import { cel, extrairNumero, extrairDecimal } from './process/celula'
import { lerPresenca } from './process/presenca'
import { resolverAreasQuestoes, lerCelulaQuestao } from './process/questoes'
import { calcularNiveisDisciplina } from './process/niveis'
import {
  logDiagnosticoFinal,
  logDiagnosticoPrimeiroAluno,
  logQuestoesSemProcessar,
  logDiagnosticoSerie,
  logDiagnosticoPresenca,
  logDiagnosticoQuestoesAluno,
} from './process/diagnostico'
import { montarConsolidado } from './process/consolidado'
import { extrairProducaoTextual } from './process/producao-textual'
import { atualizarProgresso } from './process/progresso'
import { proximoNumeroCodigoAluno } from './process/codigo-aluno'
import {
  ImportacaoConfig,
  ImportacaoResultado,
  DadosExistentes,
  DadosQuestoes,
  DadosProcessados,
  TurmaParaInserir,
  AlunoParaInserir,
  ConsolidadoParaInserir,
  ResultadoParaInserir,
  ProducaoParaInserir,
} from './types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 5: PROCESSAR LINHAS DO ARQUIVO
// ============================================================================

/**
 * Fase 5: Processa cada linha do arquivo, monta arrays para batch insert
 */
export async function processarLinhas(
  dados: Record<string, unknown>[],
  config: ImportacaoConfig,
  dadosExistentes: DadosExistentes,
  dadosQuestoes: DadosQuestoes,
  resultado: ImportacaoResultado,
  erros: string[]
): Promise<DadosProcessados> {
  log.info('[FASE 5] Processando linhas do arquivo...')

  const { anoLetivo, avaliacaoId, importacaoId } = config
  const { escolasMap, turmasMap, alunosMap, questoesMap } = dadosExistentes
  const { configSeries, itensProducaoMap } = dadosQuestoes

  let proximoNumeroAluno = await proximoNumeroCodigoAluno()

  const totalLinhas = dados.length
  const intervaloAtualizacao = Math.max(50, Math.floor(totalLinhas / 10))

  // Arrays para batch inserts
  const turmasParaInserir: TurmaParaInserir[] = []
  const alunosParaInserir: AlunoParaInserir[] = []
  const consolidadosParaInserir: ConsolidadoParaInserir[] = []
  const resultadosParaInserir: ResultadoParaInserir[] = []
  const producaoParaInserir: ProducaoParaInserir[] = []

  for (let i = 0; i < dados.length; i++) {
    try {
      const linha = dados[i]

      const escolaNome = String(linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').trim()
      const alunoNome = String(linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').trim()
      const turmaCodigo = String(linha['TURMA'] || linha['Turma'] || linha['turma'] || '').trim()
      const serieRaw = lerSerieDoExcel(linha, turmaCodigo)
      const serie = normalizarSerie(serieRaw) || null

      // Validar dados antes de processar
      if (!escolaNome || !alunoNome) {
        resultado.resultados.erros++
        const mensagemErro = `Linha ${i + 2}: Escola ou aluno vazio (Escola: "${escolaNome}", Aluno: "${alunoNome}")`
        erros.push(mensagemErro)
        if (erros.length <= 20) {
          log.error(mensagemErro)
        }
        continue
      }

      // Tratamento da presenca/falta
      const presenca: string | null = lerPresenca(linha)

      // Log para debug (apenas primeiras 5 linhas)
      if (i < 5) {
        logDiagnosticoPresenca(i, alunoNome, presenca)
      }

      const escolaId = escolasMap.get(escolaNome.toUpperCase().trim())
      if (!escolaId) {
        resultado.resultados.erros++
        const mensagemErro = `Linha ${i + 2}: Escola não encontrada: "${escolaNome}"`
        erros.push(mensagemErro)
        if (erros.length <= 20) {
          log.error(mensagemErro)
        }
        continue
      }

      // Criar/buscar turma
      let turmaId: string | null = null
      if (turmaCodigo) {
        const turmaKey = `${turmaCodigo}_${escolaId}`
        turmaId = turmasMap.get(turmaKey) || null

        if (!turmaId) {
          turmaId = `TEMP_TURMA_${turmasParaInserir.length}`
          turmasParaInserir.push({
            tempId: turmaId,
            codigo: turmaCodigo,
            nome: turmaCodigo,
            escola_id: escolaId,
            serie: serie || null,
            ano_letivo: anoLetivo,
          })
          turmasMap.set(turmaKey, turmaId)
          resultado.turmas.criados++
        } else {
          resultado.turmas.existentes++
        }
      }

      // Verificar se aluno ja existe
      const nomeNormalizado = alunoNome.toUpperCase().trim()
      const turmaKeyAluno = turmaId && !turmaId.startsWith('TEMP_') ? turmaId : 'NULL'
      const alunoKey = `${nomeNormalizado}_${escolaId}_${turmaKeyAluno}_${anoLetivo}`

      let alunoId = alunosMap.get(alunoKey)
      // Codigo do aluno conhecido nesta linha: so existe para alunos recem-criados.
      // Para alunos ja existentes o codigo nao e carregado em alunosMap -> permanece null.
      let alunoCodigo: string | null = null

      if (!alunoId) {
        const codigoAluno = `ALU${proximoNumeroAluno.toString().padStart(4, '0')}`
        alunoCodigo = codigoAluno
        proximoNumeroAluno++
        alunoId = `TEMP_ALUNO_${alunosParaInserir.length}`

        alunosParaInserir.push({
          tempId: alunoId,
          codigo: codigoAluno,
          nome: alunoNome,
          escola_id: escolaId,
          turma_id: turmaId,
          serie: serie || null,
          ano_letivo: anoLetivo,
        })

        alunosMap.set(alunoKey, alunoId)
      }

      // Extrair notas e acertos
      const totalAcertosLP = extrairNumero(cel(linha['Total Acertos LP'] || linha['Total AcertosLP']))
      const totalAcertosCH = extrairNumero(cel(linha['Total Acertos CH'] || linha['Total AcertosCH']))
      const totalAcertosMAT = extrairNumero(cel(linha['Total Acertos MAT'] || linha['Total AcertosMAT']))
      const totalAcertosCN = extrairNumero(cel(linha['Total Acertos  CN'] || linha['Total Acertos CN'] || linha['Total AcertosCN']))

      const notaLP = extrairDecimal(cel(linha['NOTA-LP'] || linha['NOTA_LP'] || linha['Nota-LP'] || linha['NOTA LP']))
      const notaCH = extrairDecimal(cel(linha['NOTA-CH'] || linha['NOTA_CH'] || linha['Nota-CH'] || linha['NOTA CH']))
      const notaMAT = extrairDecimal(cel(linha['NOTA-MAT'] || linha['NOTA_MAT'] || linha['Nota-MAT'] || linha['NOTA MAT']))
      const notaCN = extrairDecimal(cel(linha['NOTA-CN'] || linha['NOTA_CN'] || linha['Nota-CN'] || linha['NOTA CN']))
      const mediaAluno = extrairDecimal(cel(linha['MED_ALUNO'] || linha['MED ALUNO'] || linha['Media'] || linha['Média']))

      // Obter configuracao da serie do aluno
      const numeroSerie = extrairNumeroSerie(serie)
      const configSerieAluno = numeroSerie ? configSeries.get(numeroSerie) : null

      // DEBUG: Log da serie e configuracao (apenas para os primeiros 3 alunos)
      if (i < 3) {
        logDiagnosticoSerie(alunoNome, serieRaw, serie, numeroSerie, configSerieAluno, configSeries)
      }

      // Extrair itens de producao textual (para 2o, 3o e 5o ano)
      const { notaProducao, itensProducaoNotas } = extrairProducaoTextual(
        linha, configSerieAluno, serie, alunoNome, i
      )

      // Verificar se ha dados de resultados (notas)
      const temNotas = notaLP !== null || notaCH !== null || notaMAT !== null || notaCN !== null || mediaAluno !== null || notaProducao !== null
      const temAcertos = totalAcertosLP > 0 || totalAcertosCH > 0 || totalAcertosMAT > 0 || totalAcertosCN > 0

      // Determinar presenca final
      let presencaFinal: string
      if (presenca === null && !temNotas && !temAcertos) {
        presencaFinal = '-'
      } else if (presenca === null) {
        presencaFinal = 'P'
      } else {
        presencaFinal = presenca
      }

      const alunoFaltou = presencaFinal === 'F'

      const mediaFinal = (presencaFinal === '-' || (presenca === null && !temNotas && !temAcertos))
        ? null
        : (mediaAluno !== null && mediaAluno !== undefined ? mediaAluno : null)

      if (presencaFinal !== '-' && (mediaFinal === 0 || mediaFinal === null || mediaFinal === undefined) && presencaFinal !== 'F') {
        presencaFinal = 'F'
      }

      // Determinar nivel de aprendizagem
      let nivelAprendizagem: string | null = null
      let nivelAprendizagemId: string | null = null

      if (configSerieAluno?.usa_nivel_aprendizagem && !alunoFaltou && mediaAluno !== null) {
        const nivel = await calcularNivelAprendizagem(mediaAluno, serie || undefined)
        if (nivel) {
          nivelAprendizagem = nivel.nome
          nivelAprendizagemId = nivel.id
        }
      }

      const tipoAvaliacao = configSerieAluno?.tem_producao_textual ? 'anos_iniciais' : 'anos_finais'
      const totalQuestoesEsperadas = configSerieAluno?.total_questoes_objetivas || 60

      const semDados = presencaFinal === '-'

      // Calcular niveis por disciplina (apenas para Anos Iniciais: 2o, 3o e 5o)
      const { nivelLp, nivelMat, nivelProd, nivelAluno: nivelAlunoCalc } = calcularNiveisDisciplina({
        serie,
        alunoFaltou,
        semDados,
        totalAcertosLP,
        totalAcertosMAT,
        notaProducao,
        nivelAprendizagem,
        indiceLinha: i,
        alunoNome,
      })

      // Adicionar consolidado a fila
      consolidadosParaInserir.push(montarConsolidado({
        alunoId,
        escolaId,
        turmaId,
        anoLetivo,
        avaliacaoId,
        serie,
        presencaFinal,
        alunoFaltou,
        semDados,
        totalAcertosLP,
        totalAcertosCH,
        totalAcertosMAT,
        totalAcertosCN,
        notaLP,
        notaCH,
        notaMAT,
        notaCN,
        mediaFinal,
        notaProducao,
        nivelAprendizagem,
        nivelAprendizagemId,
        tipoAvaliacao,
        totalQuestoesEsperadas,
        itensProducaoNotas,
        nivelLp,
        nivelMat,
        nivelProd,
        nivelAluno: nivelAlunoCalc,
      }))

      // Adicionar resultados de producao a fila (se aplicavel)
      if (configSerieAluno?.tem_producao_textual && !alunoFaltou) {
        for (let itemNum = 1; itemNum <= 8; itemNum++) {
          const notaItem = itensProducaoNotas[itemNum - 1]
          if (notaItem !== null) {
            const itemCodigo = `ITEM_${itemNum}`
            const itemId = itensProducaoMap.get(itemCodigo)
            if (itemId) {
              producaoParaInserir.push({
                aluno_id: alunoId,
                escola_id: escolaId,
                turma_id: turmaId,
                item_producao_id: itemId,
                ano_letivo: anoLetivo,
                avaliacao_id: avaliacaoId,
                serie: serie || null,
                nota: notaItem,
              })
            }
          }
        }
      }

      // Processar questoes
      let questoesProcessadasAluno = 0
      let questoesVazias = 0
      let questoesComValor = 0

      const areasAluno = resolverAreasQuestoes(configSerieAluno, numeroSerie, serie)

      // Diagnostico: verificar colunas no primeiro aluno
      if (i === 0) {
        logDiagnosticoPrimeiroAluno(linha, configSerieAluno, serie)
      }

      for (const { inicio, fim, area, disciplina } of areasAluno) {
        for (let num = inicio; num <= fim; num++) {
          const valorQuestao = lerCelulaQuestao(linha, num)

          if (valorQuestao === undefined || valorQuestao === null || valorQuestao === '') {
            questoesVazias++
            continue
          }

          questoesProcessadasAluno++
          questoesComValor++

          const acertou = valorQuestao === '1' || valorQuestao === 1 || valorQuestao === 'X' || valorQuestao === 'x'
          const nota = acertou ? 1 : 0
          const questaoCodigo = `Q${num}`
          const questaoId = questoesMap.get(questaoCodigo) || null

          const presencaFinalQuestao = presencaFinal
          const alunoFaltouQuestao = presencaFinalQuestao === 'F'
          const semDadosQuestao = presencaFinalQuestao === '-'

          resultadosParaInserir.push({
            escola_id: escolaId,
            aluno_id: alunoId,
            aluno_codigo: alunoCodigo,
            aluno_nome: alunoNome,
            turma_id: turmaId,
            questao_id: questaoId,
            questao_codigo: questaoCodigo,
            resposta_aluno: (alunoFaltouQuestao || semDadosQuestao) ? null : (acertou ? '1' : '0'),
            acertou: (alunoFaltouQuestao || semDadosQuestao) ? false : acertou,
            nota: (alunoFaltouQuestao || semDadosQuestao) ? 0 : nota,
            ano_letivo: anoLetivo,
            avaliacao_id: avaliacaoId,
            serie: serie || null,
            turma: turmaCodigo || null,
            disciplina,
            area_conhecimento: area,
            presenca: presencaFinalQuestao,
          })
        }
      }

      // Log diagnostico apenas para os primeiros 5 alunos
      if (i < 5) {
        logDiagnosticoQuestoesAluno(i, alunoNome, questoesProcessadasAluno, questoesComValor, questoesVazias)
      }

      if (questoesProcessadasAluno === 0 && i === 0) {
        logQuestoesSemProcessar(linha)
      }

      resultado.resultados.processados++

      // Verificar status e atualizar progresso
      if ((i + 1) % intervaloAtualizacao === 0 || i === totalLinhas - 1) {
        const cancelado = await atualizarProgresso(importacaoId, i + 1, resultado.resultados.erros, totalLinhas)
        if (cancelado) {
          return { turmasParaInserir, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir, producaoParaInserir }
        }
      }
    } catch (error: unknown) {
      resultado.resultados.erros++
      const mensagemErro = `Linha ${i + 2}: ${(error as Error).message}`
      erros.push(mensagemErro)

      if (erros.length <= 20) {
        log.error(mensagemErro)
      }

      if (erros.length >= 200) {
        erros.push(`... e mais ${dados.length - i - 1} erros nao listados`)
      }
    }
  }

  logDiagnosticoFinal(resultado.resultados.processados, resultadosParaInserir)

  return { turmasParaInserir, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir, producaoParaInserir }
}
