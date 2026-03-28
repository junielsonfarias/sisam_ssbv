/**
 * Fase 5: Processar linhas do arquivo Excel
 *
 * @module services/importacao/process
 */

import pool from '@/database/connection'
import {
  extrairNumeroSerie,
  gerarAreasQuestoes,
  calcularNivelAprendizagem,
  extrairNotaProducao,
  calcularMediaProducao,
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelPorNota,
  calcularNivelAluno,
  isAnosIniciais,
} from '@/lib/config-series'
import { normalizarSerie } from '@/lib/normalizar-serie'
import { createLogger } from '@/lib/logger'
import { lerSerieDoExcel } from './parse'
import {
  ImportacaoConfig,
  ImportacaoResultado,
  DadosExistentes,
  DadosQuestoes,
  DadosProcessados,
} from './types'

const log = createLogger('Importacao')

// ============================================================================
// FASE 5: PROCESSAR LINHAS DO ARQUIVO
// ============================================================================

/**
 * Fase 5: Processa cada linha do arquivo, monta arrays para batch insert
 */
export async function processarLinhas(
  dados: any[],
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

  let proximoNumeroAluno = 1
  const maxCodigoResult = await pool.query(
    `SELECT codigo FROM alunos
     WHERE codigo LIKE 'ALU%'
     AND codigo ~ '^ALU[0-9]+$'
     ORDER BY CAST(SUBSTRING(codigo FROM 4) AS INTEGER) DESC
     LIMIT 1`
  )
  if (maxCodigoResult.rows.length > 0 && maxCodigoResult.rows[0].codigo) {
    proximoNumeroAluno = parseInt(maxCodigoResult.rows[0].codigo.replace('ALU', '')) + 1
  }

  const totalLinhas = dados.length
  const intervaloAtualizacao = Math.max(50, Math.floor(totalLinhas / 10))

  // Arrays para batch inserts
  const turmasParaInserir: any[] = []
  const alunosParaInserir: any[] = []
  const consolidadosParaInserir: any[] = []
  const resultadosParaInserir: any[] = []
  const producaoParaInserir: any[] = []

  // Funcoes auxiliares locais
  const extrairNumero = (valor: any): number => {
    if (!valor) return 0
    const num = parseInt(valor.toString().replace(/[^\d]/g, ''))
    return isNaN(num) ? 0 : num
  }

  const extrairDecimal = (valor: any): number | null => {
    if (!valor || valor === '' || valor === null || valor === undefined) return null
    const str = valor.toString().replace(',', '.').trim()
    const num = parseFloat(str)
    return isNaN(num) ? null : num
  }

  for (let i = 0; i < dados.length; i++) {
    try {
      const linha = dados[i] as Record<string, unknown>

      const escolaNome = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
      const alunoNome = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
      const turmaCodigo = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
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
      let presenca: string | null = null

      const colunaFalta = linha['FALTA'] || linha['Falta'] || linha['falta']
      const colunaPresenca = linha['PRESENÇA'] || linha['Presença'] || linha['presenca']

      const temColunaFalta = colunaFalta !== undefined && colunaFalta !== null && colunaFalta !== ''
      const temColunaPresenca = colunaPresenca !== undefined && colunaPresenca !== null && colunaPresenca !== ''

      if (temColunaFalta) {
        const valorFalta = colunaFalta.toString().trim().toUpperCase()
        if (valorFalta === 'F' || valorFalta === 'X' || valorFalta === 'FALTOU' || valorFalta === 'AUSENTE' || valorFalta === 'SIM' || valorFalta === '1' || valorFalta === 'S') {
          presenca = 'F'
        } else if (valorFalta === 'P' || valorFalta === 'PRESENTE' || valorFalta === 'NAO' || valorFalta === 'NÃO' || valorFalta === '0' || valorFalta === 'N') {
          presenca = 'P'
        } else {
          presenca = 'F'
        }
      } else if (temColunaPresenca) {
        const valorPresenca = colunaPresenca.toString().trim().toUpperCase()
        if (valorPresenca === 'P' || valorPresenca === 'PRESENTE' || valorPresenca === 'SIM' || valorPresenca === '1' || valorPresenca === 'S') {
          presenca = 'P'
        } else if (valorPresenca === 'F' || valorPresenca === 'FALTOU' || valorPresenca === 'AUSENTE' || valorPresenca === 'NAO' || valorPresenca === 'NÃO' || valorPresenca === '0' || valorPresenca === 'N') {
          presenca = 'F'
        }
      }

      // Log para debug (apenas primeiras 5 linhas)
      if (i < 5) {
        if (presenca === null) {
          log.debug(`Linha ${i + 2}: Aluno "${alunoNome}" SEM dados de frequencia (sera marcado como "-")`)
        } else if (presenca === 'F') {
          log.debug(`Linha ${i + 2}: Aluno "${alunoNome}" marcado como FALTANTE (FALTA: "${colunaFalta}", PRESENCA: "${colunaPresenca}")`)
        }
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
      const turmaKeyAluno = turmaId && !turmaId.toString().startsWith('TEMP_') ? turmaId.toString() : 'NULL'
      const alunoKey = `${nomeNormalizado}_${escolaId}_${turmaKeyAluno}_${anoLetivo}`

      let alunoId = alunosMap.get(alunoKey)

      if (!alunoId) {
        const codigoAluno = `ALU${proximoNumeroAluno.toString().padStart(4, '0')}`
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
      const totalAcertosLP = extrairNumero(linha['Total Acertos LP'] || linha['Total AcertosLP'])
      const totalAcertosCH = extrairNumero(linha['Total Acertos CH'] || linha['Total AcertosCH'])
      const totalAcertosMAT = extrairNumero(linha['Total Acertos MAT'] || linha['Total AcertosMAT'])
      const totalAcertosCN = extrairNumero(linha['Total Acertos  CN'] || linha['Total Acertos CN'] || linha['Total AcertosCN'])

      const notaLP = extrairDecimal(linha['NOTA-LP'] || linha['NOTA_LP'] || linha['Nota-LP'] || linha['NOTA LP'])
      const notaCH = extrairDecimal(linha['NOTA-CH'] || linha['NOTA_CH'] || linha['Nota-CH'] || linha['NOTA CH'])
      const notaMAT = extrairDecimal(linha['NOTA-MAT'] || linha['NOTA_MAT'] || linha['Nota-MAT'] || linha['NOTA MAT'])
      const notaCN = extrairDecimal(linha['NOTA-CN'] || linha['NOTA_CN'] || linha['Nota-CN'] || linha['NOTA CN'])
      const mediaAluno = extrairDecimal(linha['MED_ALUNO'] || linha['MED ALUNO'] || linha['Media'] || linha['Média'])

      // Obter configuracao da serie do aluno
      const numeroSerie = extrairNumeroSerie(serie)
      const configSerieAluno = numeroSerie ? configSeries.get(numeroSerie) : null

      // DEBUG: Log da serie e configuracao (apenas para os primeiros 3 alunos)
      if (i < 3) {
        log.debug(`Serie do aluno "${alunoNome}":`)
        log.debug(`  - serieRaw: "${serieRaw}"`)
        log.debug(`  - serie (normalizada): "${serie}"`)
        log.debug(`  - numeroSerie (extraido): "${numeroSerie}"`)
        log.debug(`  - configSerieAluno encontrada: ${configSerieAluno ? 'SIM' : 'NAO'}`)
        log.debug(`  - configSeries.keys(): ${Array.from(configSeries.keys())}`)
      }

      // Extrair itens de producao textual (para 2o, 3o e 5o ano)
      let notaProducao: number | null = null
      const itensProducaoNotas: (number | null)[] = []

      if (configSerieAluno?.tem_producao_textual) {
        for (let itemNum = 1; itemNum <= 8; itemNum++) {
          const notaItem = extrairNotaProducao(linha, itemNum)
          itensProducaoNotas.push(notaItem)
        }

        if (i < 3) {
          log.debug(`Aluno: ${alunoNome}, Serie: ${serie}`)
          log.debug(`  - configSerieAluno.tem_producao_textual: ${configSerieAluno.tem_producao_textual}`)
          log.debug(`  - Colunas no Excel: ${Object.keys(linha).filter(k => k.toLowerCase().includes('item'))}`)
          log.debug(`  - itensProducaoNotas extraidos: ${JSON.stringify(itensProducaoNotas)}`)
        }

        notaProducao = calcularMediaProducao(itensProducaoNotas)

        if (notaProducao === null) {
          notaProducao = extrairDecimal(
            linha['PRODUÇÃO'] || linha['Produção'] || linha['PRODUCAO'] ||
            linha['Nota Produção'] || linha['NOTA PRODUÇÃO'] || linha['nota_producao']
          )
        }

        if (i < 3) {
          log.debug(`  - notaProducao calculada: ${notaProducao}`)
        }
      } else {
        if (i < 3) {
          log.debug(`Aluno: ${alunoNome}, Serie: ${serie} - SEM PRODUCAO TEXTUAL`)
          log.debug(`  - configSerieAluno: ${configSerieAluno ? 'existe' : 'NULL'}`)
          log.debug(`  - tem_producao_textual: ${configSerieAluno?.tem_producao_textual}`)
        }
      }

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
        : (mediaAluno !== null && mediaAluno !== undefined ? parseFloat(mediaAluno.toString()) : null)

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
      let nivelLp: string | null = null
      let nivelMat: string | null = null
      let nivelProd: string | null = null
      let nivelAlunoCalc: string | null = null

      if (isAnosIniciais(serie) && !alunoFaltou && !semDados) {
        nivelLp = calcularNivelPorAcertos(totalAcertosLP, serie, 'LP')
        nivelMat = calcularNivelPorAcertos(totalAcertosMAT, serie, 'MAT')
        nivelProd = converterNivelProducao(nivelAprendizagem)
        if (!nivelProd && notaProducao !== null && notaProducao !== undefined && Number(notaProducao) > 0) {
          nivelProd = calcularNivelPorNota(Number(notaProducao))
        }
        nivelAlunoCalc = calcularNivelAluno(nivelLp, nivelMat, nivelProd)

        if (i < 3) {
          log.debug(`Niveis calculados para "${alunoNome}" (${serie}):`)
          log.debug(`  - Acertos LP: ${totalAcertosLP} -> Nivel LP: ${nivelLp}`)
          log.debug(`  - Acertos MAT: ${totalAcertosMAT} -> Nivel MAT: ${nivelMat}`)
          log.debug(`  - Nivel Producao (${nivelAprendizagem}): ${nivelProd}`)
          log.debug(`  - Nivel Aluno (media): ${nivelAlunoCalc}`)
        }
      }

      // Adicionar consolidado a fila
      consolidadosParaInserir.push({
        aluno_id: alunoId,
        escola_id: escolaId,
        turma_id: turmaId,
        ano_letivo: anoLetivo,
        avaliacao_id: avaliacaoId,
        serie: serie || null,
        presenca: presencaFinal,
        total_acertos_lp: (alunoFaltou || semDados) ? 0 : totalAcertosLP,
        total_acertos_ch: (alunoFaltou || semDados) ? 0 : totalAcertosCH,
        total_acertos_mat: (alunoFaltou || semDados) ? 0 : totalAcertosMAT,
        total_acertos_cn: (alunoFaltou || semDados) ? 0 : totalAcertosCN,
        nota_lp: (alunoFaltou || semDados) ? null : notaLP,
        nota_ch: (alunoFaltou || semDados) ? null : notaCH,
        nota_mat: (alunoFaltou || semDados) ? null : notaMAT,
        nota_cn: (alunoFaltou || semDados) ? null : notaCN,
        media_aluno: (alunoFaltou || semDados) ? null : mediaFinal,
        nota_producao: (alunoFaltou || semDados) ? null : notaProducao,
        nivel_aprendizagem: (semDados ? null : nivelAprendizagem),
        nivel_aprendizagem_id: (semDados ? null : nivelAprendizagemId),
        tipo_avaliacao: tipoAvaliacao,
        total_questoes_esperadas: totalQuestoesEsperadas,
        item_producao_1: (alunoFaltou || semDados) ? null : (itensProducaoNotas[0] ?? null),
        item_producao_2: (alunoFaltou || semDados) ? null : (itensProducaoNotas[1] ?? null),
        item_producao_3: (alunoFaltou || semDados) ? null : (itensProducaoNotas[2] ?? null),
        item_producao_4: (alunoFaltou || semDados) ? null : (itensProducaoNotas[3] ?? null),
        item_producao_5: (alunoFaltou || semDados) ? null : (itensProducaoNotas[4] ?? null),
        item_producao_6: (alunoFaltou || semDados) ? null : (itensProducaoNotas[5] ?? null),
        item_producao_7: (alunoFaltou || semDados) ? null : (itensProducaoNotas[6] ?? null),
        item_producao_8: (alunoFaltou || semDados) ? null : (itensProducaoNotas[7] ?? null),
        nivel_lp: nivelLp,
        nivel_mat: nivelMat,
        nivel_prod: nivelProd,
        nivel_aluno: nivelAlunoCalc,
      })

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

      let areasAluno: { inicio: number; fim: number; area: string; disciplina: string }[]

      if (configSerieAluno) {
        areasAluno = gerarAreasQuestoes(configSerieAluno)
      } else {
        const serieNumFallback = parseInt(numeroSerie || '0')

        if (serieNumFallback === 2 || serieNumFallback === 3) {
          log.warn(`Fallback ANOS INICIAIS (2o/3o) para serie: "${serie}"`)
          areasAluno = [
            { inicio: 1, fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
            { inicio: 15, fim: 28, area: 'Matemática', disciplina: 'Matemática' },
          ]
        } else if (serieNumFallback === 5) {
          log.warn(`Fallback ANOS INICIAIS (5o) para serie: "${serie}"`)
          areasAluno = [
            { inicio: 1, fim: 14, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
            { inicio: 15, fim: 34, area: 'Matemática', disciplina: 'Matemática' },
          ]
        } else {
          log.warn(`Fallback ANOS FINAIS para serie: "${serie}"`)
          areasAluno = [
            { inicio: 1, fim: 20, area: 'Língua Portuguesa', disciplina: 'Língua Portuguesa' },
            { inicio: 21, fim: 30, area: 'Ciências Humanas', disciplina: 'Ciências Humanas' },
            { inicio: 31, fim: 50, area: 'Matemática', disciplina: 'Matemática' },
            { inicio: 51, fim: 60, area: 'Ciências da Natureza', disciplina: 'Ciências da Natureza' },
          ]
        }
      }

      // Diagnostico: verificar colunas no primeiro aluno
      if (i === 0) {
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

      for (const { inicio, fim, area, disciplina } of areasAluno) {
        for (let num = inicio; num <= fim; num++) {
          const variacoesColuna = [
            `Q${num}`,
            `Q ${num}`,
            `q${num}`,
            `q ${num}`,
            `Questão ${num}`,
            `Questao ${num}`,
          ]

          let valorQuestao: any = undefined
          let colunaQuestao = `Q${num}`

          for (const variacao of variacoesColuna) {
            if (linha[variacao] !== undefined) {
              valorQuestao = linha[variacao]
              colunaQuestao = variacao
              break
            }
          }

          if (valorQuestao === undefined) {
            const todasColunas = Object.keys(linha)
            const colunaEncontrada = todasColunas.find(c =>
              c.replace(/\s+/g, '').toUpperCase() === `Q${num}`.toUpperCase()
            )
            if (colunaEncontrada) {
              valorQuestao = linha[colunaEncontrada]
              colunaQuestao = colunaEncontrada
            }
          }

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
            aluno_codigo: null,
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
        log.debug(`  -> Aluno ${i + 1} "${alunoNome}": ${questoesProcessadasAluno} questoes processadas (${questoesComValor} com valor, ${questoesVazias} vazias)`)
      }

      if (questoesProcessadasAluno === 0 && i === 0) {
        log.error(`ATENCAO: Primeiro aluno nao teve nenhuma questao processada!`)
        log.error(`  -> Verificando colunas disponiveis no Excel...`)
        const todasColunas = Object.keys(linha)
        const colunasQ = todasColunas.filter(c => c.toUpperCase().startsWith('Q'))
        log.error(`  -> Colunas que comecam com 'Q': ${colunasQ.slice(0, 20).join(', ')}${colunasQ.length > 20 ? '...' : ''}`)
      }

      resultado.resultados.processados++

      // Verificar status e atualizar progresso
      if ((i + 1) % intervaloAtualizacao === 0 || i === totalLinhas - 1) {
        const statusCheck = await pool.query(
          'SELECT status FROM importacoes WHERE id = $1',
          [importacaoId]
        )

        if (statusCheck.rows.length > 0 && statusCheck.rows[0].status === 'cancelado') {
          await pool.query(
            'UPDATE importacoes SET linhas_processadas = $1, linhas_com_erro = $2, status = \'cancelado\', concluido_em = CURRENT_TIMESTAMP WHERE id = $3',
            [i + 1, resultado.resultados.erros, importacaoId]
          )
          log.info(`[IMPORTACAO ${importacaoId}] Cancelada pelo usuario`)
          return { turmasParaInserir, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir, producaoParaInserir }
        }

        await pool.query(
          'UPDATE importacoes SET linhas_processadas = $1, linhas_com_erro = $2 WHERE id = $3',
          [i + 1, resultado.resultados.erros, importacaoId]
        )

        const progresso = Math.round(((i + 1) / totalLinhas) * 100)
        log.info(`[FASE 5] Progresso: ${progresso}% (${i + 1}/${totalLinhas} linhas)`)
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

  log.info(`[FASE 5] Concluido: ${resultado.resultados.processados} linhas processadas`)
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

  return { turmasParaInserir, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir, producaoParaInserir }
}
