/**
 * Fase 1: Pre-processamento e extracao de dados unicos do Excel
 *
 * @module services/importacao/parse
 */

import { extrairNumeroSerie } from '@/lib/config-series'
import { createLogger } from '@/lib/logger'
import { DadosExtraidos } from './types'

const log = createLogger('Importacao')

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
