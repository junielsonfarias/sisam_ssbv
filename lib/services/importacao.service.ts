/**
 * Servico de Importacao Completa
 *
 * Extrai a logica de negocio da rota /api/admin/importar-completo
 * e organiza em fases bem definidas:
 *
 * Fase 1: Extrair dados unicos do Excel
 * Fase 2: Carregar dados existentes do banco
 * Fase 3: Criar polos e escolas faltantes
 * Fase 4: Carregar/criar questoes e configuracoes de series
 * Fase 5: Processar linhas (notas, acertos, presenca)
 * Fase 6: Batch insert de turmas
 * Fase 7: Batch insert de alunos
 * Fase 8: Batch insert de consolidados
 * Fase 8.5: Batch insert de producao textual
 * Fase 9: Batch insert de resultados de provas
 * Fase 10: Validacao final
 *
 * @module services/importacao
 */

import pool from '@/database/connection'
import {
  carregarConfigSeries,
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
import { ConfiguracaoSerie } from '@/lib/types'

// Logger especifico para este modulo
const log = createLogger('Importacao')

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface ImportacaoConfig {
  importacaoId: string
  anoLetivo: string
  usuarioId: string
  avaliacaoId: string
}

export interface ImportacaoProgresso {
  processadas: number
  erros: number
  total: number
}

export interface ImportacaoResultado {
  polos: { criados: number; existentes: number }
  escolas: { criados: number; existentes: number }
  turmas: { criados: number; existentes: number }
  alunos: { criados: number; existentes: number }
  questoes: { criadas: number; existentes: number }
  resultados: { processados: number; erros: number; duplicados: number; novos: number }
}

// ============================================================================
// FUNCOES AUXILIARES PARA INFERENCIA DE SERIE
// ============================================================================

/**
 * Infere serie a partir do nome da turma (ex: "2A", "2o A", "T2A" -> "2")
 */
export function inferirSerieDaTurma(turma: string): string {
  if (!turma) return ''
  const match = turma.match(/(\d+)/)?.[1]
  return match || ''
}

/**
 * Detecta serie baseada na maior questao respondida
 */
export function detectarSeriePorQuestoes(linha: any): string {
  let maiorQuestao = 0
  for (let q = 1; q <= 60; q++) {
    const valor = linha[`Q${q}`]
    if (valor !== undefined && valor !== null && valor !== '') {
      maiorQuestao = q
    }
  }

  if (maiorQuestao > 0 && maiorQuestao <= 28) return '2'
  if (maiorQuestao > 28 && maiorQuestao <= 34) return '5'
  if (maiorQuestao > 34) return '8'
  return ''
}

/**
 * Le serie do Excel com multiplas variacoes de coluna e fallbacks
 */
export function lerSerieDoExcel(linha: any, turma: string): string {
  let serieOriginal = (
    linha['ANO/SÉRIE'] || linha['ANO/SERIE'] || linha['Série'] || linha['SÉRIE'] ||
    linha['serie'] || linha['Serie'] || linha['Ano'] || linha['ANO'] || linha['ano'] ||
    linha['ANO_SERIE'] || linha['Ano_Serie'] || linha['SERIE'] || linha['Serie'] ||
    ''
  ).toString().trim()

  // Se serie esta vazia, tentar inferir da turma
  if (!serieOriginal || extrairNumeroSerie(serieOriginal) === null) {
    const serieInferida = inferirSerieDaTurma(turma)
    if (serieInferida) {
      serieOriginal = serieInferida
    }
  }

  // Se ainda esta vazia, tentar detectar pela quantidade de questoes
  if (!serieOriginal || extrairNumeroSerie(serieOriginal) === null) {
    const serieDetectada = detectarSeriePorQuestoes(linha)
    if (serieDetectada) {
      serieOriginal = serieDetectada
    }
  }

  return serieOriginal
}

// ============================================================================
// FASE 1: PRE-PROCESSAMENTO E EXTRACAO DE DADOS UNICOS
// ============================================================================

export interface DadosExtraidos {
  polosUnicos: Set<string>
  escolasUnicas: Map<string, string>
  turmasUnicas: Map<string, { escola: string; serie: string }>
  alunosUnicos: Map<string, { escola: string; turma: string; serie: string }>
}

/**
 * Fase 1: Extrai entidades unicas do arquivo Excel
 */
export function extrairDadosExcel(dados: any[]): DadosExtraidos {
  log.info('[FASE 1] Extraindo dados unicos do arquivo...')

  const polosUnicos = new Set<string>()
  const escolasUnicas = new Map<string, string>() // escola -> polo
  const turmasUnicas = new Map<string, { escola: string; serie: string }>()
  const alunosUnicos = new Map<string, { escola: string; turma: string; serie: string }>()

  dados.forEach((linha: any) => {
    const polo = (linha['POLO'] || linha['Polo'] || linha['polo'] || '').toString().trim()
    const escola = (linha['ESCOLA'] || linha['Escola'] || linha['escola'] || '').toString().trim()
    const turma = (linha['TURMA'] || linha['Turma'] || linha['turma'] || '').toString().trim()
    const aluno = (linha['ALUNO'] || linha['Aluno'] || linha['aluno'] || '').toString().trim()
    const serie = lerSerieDoExcel(linha, turma)

    if (polo) polosUnicos.add(polo)
    if (escola && polo) escolasUnicas.set(escola, polo)
    if (turma && escola) turmasUnicas.set(`${turma}_${escola}`, { escola, serie })
    if (aluno && escola) alunosUnicos.set(`${aluno}_${escola}`, { escola, turma, serie })
  })

  log.info(`  -> ${polosUnicos.size} polos unicos`)
  log.info(`  -> ${escolasUnicas.size} escolas unicas`)
  log.info(`  -> ${turmasUnicas.size} turmas unicas`)
  log.info(`  -> ${alunosUnicos.size} alunos unicos`)

  return { polosUnicos, escolasUnicas, turmasUnicas, alunosUnicos }
}

// ============================================================================
// FASE 2: CARREGAR DADOS EXISTENTES DO BANCO
// ============================================================================

export interface DadosExistentes {
  polosMap: Map<string, string>
  escolasMap: Map<string, string>
  turmasMap: Map<string, string>
  alunosMap: Map<string, string>
  questoesMap: Map<string, string>
}

/**
 * Normaliza nome de escola (remove pontos, espacos extras, etc.)
 */
function normalizarNomeEscola(nome: string): string {
  return nome
    .toUpperCase()
    .trim()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Fase 2: Carrega todos os dados existentes do banco
 */
export async function carregarDadosExistentes(anoLetivo: string, avaliacaoId: string): Promise<DadosExistentes> {
  log.info('[FASE 2] Carregando dados existentes do banco...')

  const polosMap = new Map<string, string>()
  const escolasMap = new Map<string, string>()
  const turmasMap = new Map<string, string>()
  const alunosMap = new Map<string, string>()
  const questoesMap = new Map<string, string>()

  // Carregar polos existentes
  const polosDB = await pool.query('SELECT id, nome FROM polos')
  polosDB.rows.forEach((p: any) => {
    polosMap.set(p.nome.toUpperCase().trim(), p.id)
  })
  log.info(`  -> ${polosDB.rows.length} polos carregados`)

  // Carregar escolas existentes (usando normalizacao para evitar duplicatas)
  const escolasDB = await pool.query('SELECT id, nome FROM escolas WHERE ativo = true')
  escolasDB.rows.forEach((e: any) => {
    const nomeNormalizado = normalizarNomeEscola(e.nome)
    if (!escolasMap.has(nomeNormalizado)) {
      escolasMap.set(nomeNormalizado, e.id)
    }
  })
  log.info(`  -> ${escolasDB.rows.length} escolas carregadas (normalizadas para comparacao)`)

  // Carregar turmas existentes do ano letivo
  const turmasDB = await pool.query(
    'SELECT id, codigo, escola_id FROM turmas WHERE ano_letivo = $1',
    [anoLetivo]
  )
  turmasDB.rows.forEach((t: any) => {
    turmasMap.set(`${t.codigo}_${t.escola_id}`, t.id)
  })
  log.info(`  -> ${turmasDB.rows.length} turmas carregadas (ano ${anoLetivo})`)

  // Carregar alunos existentes do ano letivo para evitar duplicatas
  const alunosDB = await pool.query(
    'SELECT id, nome, escola_id, turma_id, ano_letivo FROM alunos WHERE ano_letivo = $1 AND ativo = true',
    [anoLetivo]
  )
  alunosDB.rows.forEach((a: any) => {
    const nomeNormalizado = (a.nome || '').toString().toUpperCase().trim()
    const turmaKey = a.turma_id ? a.turma_id.toString() : 'NULL'
    const alunoKey = `${nomeNormalizado}_${a.escola_id}_${turmaKey}_${a.ano_letivo || ''}`
    alunosMap.set(alunoKey, a.id)
  })
  log.info(`  -> ${alunosDB.rows.length} alunos existentes no banco (ano ${anoLetivo}) - serao atualizados se duplicados`)

  // Carregar questoes existentes
  const questoesDB = await pool.query('SELECT id, codigo FROM questoes')
  questoesDB.rows.forEach((q: any) => {
    questoesMap.set(q.codigo, q.id)
  })
  log.info(`  -> ${questoesDB.rows.length} questoes carregadas`)

  return { polosMap, escolasMap, turmasMap, alunosMap, questoesMap }
}

// ============================================================================
// FASE 3: CRIAR POLOS E ESCOLAS EM BATCH
// ============================================================================

/**
 * Fase 3: Cria polos e escolas que nao existem no banco
 */
export async function criarPolosEEscolas(
  dadosExcel: DadosExtraidos,
  dadosExistentes: DadosExistentes,
  resultado: ImportacaoResultado,
  erros: string[]
): Promise<void> {
  log.info('[FASE 3] Criando polos e escolas...')

  const { polosUnicos, escolasUnicas } = dadosExcel
  const { polosMap, escolasMap } = dadosExistentes

  // Criar polos faltantes
  const polosParaCriar = Array.from(polosUnicos).filter(p => !polosMap.has(p.toUpperCase().trim()))
  if (polosParaCriar.length > 0) {
    for (const nomePolo of polosParaCriar) {
      try {
        const result = await pool.query(
          'INSERT INTO polos (nome, codigo) VALUES ($1, $2) RETURNING id',
          [nomePolo, nomePolo.toUpperCase().replace(/\s+/g, '_')]
        )
        polosMap.set(nomePolo.toUpperCase().trim(), result.rows[0].id)
        resultado.polos.criados++
      } catch (error: unknown) {
        erros.push(`Polo "${nomePolo}": ${(error as Error).message}`)
      }
    }
  }
  resultado.polos.existentes = polosUnicos.size - resultado.polos.criados

  // Criar escolas faltantes (usando normalizacao para evitar duplicatas)
  for (const [nomeEscola, nomePolo] of escolasUnicas) {
    const escolaNorm = normalizarNomeEscola(nomeEscola)
    if (!escolasMap.has(escolaNorm)) {
      const poloId = polosMap.get(nomePolo.toUpperCase().trim())
      if (poloId) {
        try {
          // Verificar novamente no banco com normalizacao para evitar race condition
          const escolaExistente = await pool.query(
            `SELECT id FROM escolas
             WHERE UPPER(TRIM(REGEXP_REPLACE(REGEXP_REPLACE(nome, '\\.', '', 'g'), '\\s+', ' ', 'g'))) = $1
             AND ativo = true
             LIMIT 1`,
            [escolaNorm]
          )

          if (escolaExistente.rows.length > 0) {
            escolasMap.set(escolaNorm, escolaExistente.rows[0].id)
            resultado.escolas.existentes++
          } else {
            const codigoEscola = nomeEscola.toUpperCase().trim().replace(/\./g, '').replace(/\s+/g, '_').substring(0, 50)
            const result = await pool.query(
              'INSERT INTO escolas (nome, codigo, polo_id) VALUES ($1, $2, $3) RETURNING id',
              [nomeEscola.trim(), codigoEscola, poloId]
            )
            escolasMap.set(escolaNorm, result.rows[0].id)
            resultado.escolas.criados++
          }
        } catch (error: unknown) {
          erros.push(`Escola "${nomeEscola}": ${(error as Error).message}`)
        }
      }
    } else {
      resultado.escolas.existentes++
    }
  }

  log.info(`  -> Polos: ${resultado.polos.criados} criados, ${resultado.polos.existentes} existentes`)
  log.info(`  -> Escolas: ${resultado.escolas.criados} criadas, ${resultado.escolas.existentes} existentes`)
}

// ============================================================================
// FASE 4: CARREGAR/CRIAR QUESTOES E CONFIGURACOES
// ============================================================================

export interface DadosQuestoes {
  configSeries: Map<string, ConfiguracaoSerie>
  itensProducaoMap: Map<string, string>
}

/**
 * Fase 4: Carrega configuracoes de series, cria questoes e carrega itens de producao
 */
export async function carregarQuestoes(
  questoesMap: Map<string, string>,
  resultado: ImportacaoResultado
): Promise<DadosQuestoes> {
  log.info('[FASE 4] Carregando configuracoes de series e criando questoes...')

  // Carregar configuracoes de todas as series
  const configSeries = await carregarConfigSeries()
  log.info(`  -> ${configSeries.size} configuracoes de series carregadas`)

  // Determinar o maximo de questoes necessarias (60 para 8o/9o, 34 para 5o, 28 para 2o/3o)
  const maxQuestoes = 60

  // Criar questoes genericas Q1 a Q60 (serao usadas conforme a serie)
  for (let num = 1; num <= maxQuestoes; num++) {
    const codigo = `Q${num}`
    if (!questoesMap.has(codigo)) {
      try {
        let disciplina = 'Lingua Portuguesa'
        let area = 'Lingua Portuguesa'

        if (num >= 1 && num <= 20) {
          disciplina = 'Língua Portuguesa'
          area = 'Língua Portuguesa'
        } else if (num >= 21 && num <= 30) {
          disciplina = 'Ciências Humanas'
          area = 'Ciências Humanas'
        } else if (num >= 31 && num <= 50) {
          disciplina = 'Matemática'
          area = 'Matemática'
        } else if (num >= 51 && num <= 60) {
          disciplina = 'Ciências da Natureza'
          area = 'Ciências da Natureza'
        }

        const result = await pool.query(
          'INSERT INTO questoes (codigo, descricao, disciplina, area_conhecimento) VALUES ($1, $2, $3, $4) RETURNING id',
          [codigo, `Questão ${num}`, disciplina, area]
        )
        questoesMap.set(codigo, result.rows[0].id)
        resultado.questoes.criadas++
      } catch (error: unknown) {
        log.error(`Erro ao criar questao ${codigo}:`, error)
      }
    }
  }
  resultado.questoes.existentes = maxQuestoes - resultado.questoes.criadas
  log.info(`  -> ${resultado.questoes.criadas} criadas, ${resultado.questoes.existentes} existentes`)

  // Carregar itens de producao
  const itensProducaoMap = new Map<string, string>()
  const itensProducaoDB = await pool.query('SELECT id, codigo FROM itens_producao WHERE ativo = true ORDER BY ordem')
  itensProducaoDB.rows.forEach((item: any) => {
    itensProducaoMap.set(item.codigo, item.id)
  })
  log.info(`  -> ${itensProducaoMap.size} itens de producao carregados`)

  return { configSeries, itensProducaoMap }
}

// ============================================================================
// FASE 5: PROCESSAR LINHAS DO ARQUIVO
// ============================================================================

interface DadosProcessados {
  turmasParaInserir: any[]
  alunosParaInserir: any[]
  consolidadosParaInserir: any[]
  resultadosParaInserir: any[]
  producaoParaInserir: any[]
}

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
      const linha = dados[i] as any

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
        const mensagemErro = `Linha ${i + 2}: Escola nao encontrada: "${escolaNome}"`
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
    for (const turma of turmasParaInserir) {
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

    for (const aluno of alunosParaInserir) {
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

// ============================================================================
// FASE 10: VALIDACAO FINAL
// ============================================================================

/**
 * Fase 10: Valida contagens finais e atualiza registro de importacao
 */
export async function validarImportacao(
  importacaoId: string,
  anoLetivo: string,
  dados: any[],
  resultado: ImportacaoResultado,
  erros: string[],
  startTime: number
): Promise<void> {
  log.info('[VALIDACAO] Verificando dados importados...')
  const alunosImportados = await pool.query(
    'SELECT COUNT(*) as total FROM alunos WHERE ano_letivo = $1',
    [anoLetivo]
  )
  const consolidadosImportados = await pool.query(
    'SELECT COUNT(*) as total FROM resultados_consolidados WHERE ano_letivo = $1',
    [anoLetivo]
  )
  const resultadosImportados = await pool.query(
    'SELECT COUNT(*) as total FROM resultados_provas WHERE ano_letivo = $1',
    [anoLetivo]
  )

  const totalAlunosNoBanco = parseInt(alunosImportados.rows[0].total)
  const totalConsolidadosNoBanco = parseInt(consolidadosImportados.rows[0].total)
  const totalResultadosNoBanco = parseInt(resultadosImportados.rows[0].total)

  log.info(`  -> Alunos no banco: ${totalAlunosNoBanco}`)
  log.info(`  -> Consolidados no banco: ${totalConsolidadosNoBanco}`)
  log.info(`  -> Resultados de provas no banco: ${totalResultadosNoBanco}`)

  const alunosEsperados = dados.length
  if (totalAlunosNoBanco < alunosEsperados) {
    const faltando = alunosEsperados - totalAlunosNoBanco
    log.error(`ATENCAO: Faltam ${faltando} alunos! Esperado: ${alunosEsperados}, Importado: ${totalAlunosNoBanco}`)
    erros.push(`FALTAM ${faltando} ALUNOS: Esperado ${alunosEsperados}, mas apenas ${totalAlunosNoBanco} foram importados`)
  } else if (totalAlunosNoBanco > alunosEsperados) {
    log.info(`Mais alunos no banco (${totalAlunosNoBanco}) que no arquivo (${alunosEsperados}) - pode haver alunos de importacoes anteriores`)
  } else {
    log.info(`Todos os ${alunosEsperados} alunos foram importados com sucesso!`)
  }

  // Finalizacao
  const endTime = Date.now()
  const duracao = ((endTime - startTime) / 1000).toFixed(2)
  log.info(`[IMPORTACAO ${importacaoId}] Concluida em ${duracao}s`)
  log.info(`[RESUMO FINAL]`)
  log.info(`  - Alunos: ${resultado.alunos.criados} criados, ${resultado.alunos.existentes} existentes`)
  log.info(`  - Consolidados: ${totalConsolidadosNoBanco} no banco`)
  log.info(`  - Resultados: ${resultado.resultados.novos} novos, ${resultado.resultados.duplicados} duplicados`)
  log.info(`  - Erros: ${resultado.resultados.erros} linhas com erro`)

  await pool.query(
    `UPDATE importacoes
     SET linhas_processadas = $1, linhas_com_erro = $2,
         status = $3, concluido_em = CURRENT_TIMESTAMP,
         erros = $4,
         polos_criados = $5, polos_existentes = $6,
         escolas_criadas = $7, escolas_existentes = $8,
         turmas_criadas = $9, turmas_existentes = $10,
         alunos_criados = $11, alunos_existentes = $12,
         questoes_criadas = $13, questoes_existentes = $14,
         resultados_novos = $15, resultados_duplicados = $16
     WHERE id = $17`,
    [
      resultado.resultados.processados,
      resultado.resultados.erros,
      resultado.resultados.erros === dados.length ? 'erro' : 'concluido',
      erros.length > 0 ? erros.slice(0, 50).join('\n') : null,
      resultado.polos.criados, resultado.polos.existentes,
      resultado.escolas.criados, resultado.escolas.existentes,
      resultado.turmas.criados, resultado.turmas.existentes,
      resultado.alunos.criados, resultado.alunos.existentes,
      resultado.questoes.criadas, resultado.questoes.existentes,
      resultado.resultados.novos, resultado.resultados.duplicados,
      importacaoId,
    ]
  )
}

// ============================================================================
// ORQUESTRADOR PRINCIPAL
// ============================================================================

/**
 * Processa importacao completa orquestrando todas as fases.
 * Esta funcao e chamada em background pela rota.
 */
export async function processarImportacao(
  importacaoId: string,
  dados: any[],
  anoLetivo: string,
  usuarioId: string,
  avaliacaoId: string
): Promise<void> {
  const startTime = Date.now()
  log.info(`[IMPORTACAO ${importacaoId}] Iniciando processamento de ${dados.length} linhas`)

  try {
    const resultado: ImportacaoResultado = {
      polos: { criados: 0, existentes: 0 },
      escolas: { criados: 0, existentes: 0 },
      turmas: { criados: 0, existentes: 0 },
      alunos: { criados: 0, existentes: 0 },
      questoes: { criadas: 0, existentes: 0 },
      resultados: { processados: 0, erros: 0, duplicados: 0, novos: 0 },
    }

    const erros: string[] = []
    const config: ImportacaoConfig = { importacaoId, anoLetivo, usuarioId, avaliacaoId }

    // Fase 1: Extrair dados unicos do Excel
    const dadosExcel = extrairDadosExcel(dados)

    // Fase 2: Carregar dados existentes do banco
    const dadosExistentes = await carregarDadosExistentes(anoLetivo, avaliacaoId)

    // Fase 3: Criar polos e escolas faltantes
    await criarPolosEEscolas(dadosExcel, dadosExistentes, resultado, erros)

    // Fase 4: Carregar/criar questoes e configuracoes de series
    const dadosQuestoes = await carregarQuestoes(dadosExistentes.questoesMap, resultado)

    // Fase 5: Processar linhas do arquivo
    const {
      turmasParaInserir,
      alunosParaInserir,
      consolidadosParaInserir,
      resultadosParaInserir,
      producaoParaInserir,
    } = await processarLinhas(dados, config, dadosExistentes, dadosQuestoes, resultado, erros)

    // Fase 6: Batch insert de turmas
    await criarTurmas(turmasParaInserir, alunosParaInserir, consolidadosParaInserir, resultadosParaInserir)

    // Fase 7: Batch insert de alunos
    await criarAlunos(alunosParaInserir, consolidadosParaInserir, resultadosParaInserir, producaoParaInserir, resultado, erros)

    // Fase 8: Batch insert de consolidados
    await inserirConsolidados(consolidadosParaInserir, erros)

    // Fase 8.5: Batch insert de producao textual
    await inserirProducao(producaoParaInserir, alunosParaInserir, consolidadosParaInserir)

    // Fase 9: Batch insert de resultados de provas
    await inserirResultadosProvas(resultadosParaInserir, resultado, erros)

    // Fase 10: Validacao final
    await validarImportacao(importacaoId, anoLetivo, dados, resultado, erros, startTime)

  } catch (error: unknown) {
    log.error('Erro no processamento:', error)
    await pool.query(
      'UPDATE importacoes SET status = \'erro\', erros = $1, concluido_em = CURRENT_TIMESTAMP WHERE id = $2',
      [(error as Error).message || 'Erro desconhecido', importacaoId]
    ).catch((e) => log.error('Erro ao atualizar status de erro:', e))
  }
}
