/**
 * Testes unitários — importacao/parse.ts
 *
 * Cobre funções puras (sem I/O):
 *  - inferirSerieDaTurma: formatos variados, vazio, so letras
 *  - detectarSeriePorQuestoes: ranges de questoes, vazio, borda
 *  - lerSerieDoExcel: colunas variadas, fallback para turma, fallback para questoes, vazio
 *  - extrairDadosExcel: deduplicacao de polos/escolas/turmas/alunos, linhas vazias
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

vi.mock('@/lib/config-series', () => ({
  extrairNumeroSerie: (s: string) => {
    // Mock simples: retorna o primeiro numero encontrado ou null
    const match = s.match(/\d+/)
    return match ? parseInt(match[0]) : null
  },
}))

import {
  inferirSerieDaTurma,
  detectarSeriePorQuestoes,
  lerSerieDoExcel,
  extrairDadosExcel,
} from '@/lib/services/importacao/parse'

// ============================================================================
// inferirSerieDaTurma
// ============================================================================

describe('inferirSerieDaTurma', () => {
  it.each([
    ['2A', '2'],
    ['3B', '3'],
    ['T5A', '5'],
    ['8C', '8'],
    ['1o A', '1'],
    ['Turma 4', '4'],
    ['2º Ano', '2'],
  ])('extrai numero da turma "%s" como "%s"', (turma, esperado) => {
    expect(inferirSerieDaTurma(turma)).toBe(esperado)
  })

  it('retorna string vazia para turma sem numero', () => {
    expect(inferirSerieDaTurma('ABC')).toBe('')
    expect(inferirSerieDaTurma('Turma Especial')).toBe('')
  })

  it('retorna string vazia para turma vazia', () => {
    expect(inferirSerieDaTurma('')).toBe('')
  })

  it('retorna string vazia para undefined/null como string', () => {
    // O codigo faz: if (!turma) return ''
    expect(inferirSerieDaTurma('')).toBe('')
  })
})

// ============================================================================
// detectarSeriePorQuestoes
// ============================================================================

describe('detectarSeriePorQuestoes', () => {
  it('detecta serie 2 quando maior questao respondida e ate Q28', () => {
    const linha: Record<string, unknown> = {}
    for (let q = 1; q <= 20; q++) linha[`Q${q}`] = 'A'

    expect(detectarSeriePorQuestoes(linha)).toBe('2')
  })

  it('detecta serie 5 quando maior questao respondida esta entre Q29 e Q34', () => {
    const linha: Record<string, unknown> = {}
    for (let q = 1; q <= 30; q++) linha[`Q${q}`] = 'B'

    expect(detectarSeriePorQuestoes(linha)).toBe('5')
  })

  it('detecta serie 8 quando maior questao respondida e maior que Q34', () => {
    const linha: Record<string, unknown> = {}
    for (let q = 1; q <= 40; q++) linha[`Q${q}`] = 'C'

    expect(detectarSeriePorQuestoes(linha)).toBe('8')
  })

  it('retorna string vazia quando nenhuma questao respondida', () => {
    const linha: Record<string, unknown> = {}

    expect(detectarSeriePorQuestoes(linha)).toBe('')
  })

  it('ignora questoes com valor vazio ou null', () => {
    const linha: Record<string, unknown> = {
      Q1: '',
      Q2: null,
      Q3: undefined,
    }

    expect(detectarSeriePorQuestoes(linha)).toBe('')
  })

  it('borda: Q28 mapeia para serie 2', () => {
    const linha: Record<string, unknown> = {}
    linha['Q28'] = 'D'

    expect(detectarSeriePorQuestoes(linha)).toBe('2')
  })

  it('borda: Q29 mapeia para serie 5', () => {
    const linha: Record<string, unknown> = {}
    linha['Q29'] = 'D'

    expect(detectarSeriePorQuestoes(linha)).toBe('5')
  })

  it('borda: Q34 mapeia para serie 5', () => {
    const linha: Record<string, unknown> = {}
    linha['Q34'] = 'D'

    expect(detectarSeriePorQuestoes(linha)).toBe('5')
  })

  it('borda: Q35 mapeia para serie 8', () => {
    const linha: Record<string, unknown> = {}
    linha['Q35'] = 'D'

    expect(detectarSeriePorQuestoes(linha)).toBe('8')
  })
})

// ============================================================================
// lerSerieDoExcel
// ============================================================================

describe('lerSerieDoExcel', () => {
  it('le de "ANO/SÉRIE" quando presente', () => {
    const linha = { 'ANO/SÉRIE': '5° Ano' }
    // O mock de extrairNumeroSerie retorna 5 para '5° Ano'
    const result = lerSerieDoExcel(linha, '5A')
    expect(result).toBe('5° Ano')
  })

  it('le de "Série" quando "ANO/SÉRIE" nao presente', () => {
    const linha = { 'Série': '3° Ano' }
    const result = lerSerieDoExcel(linha, '3B')
    expect(result).toBe('3° Ano')
  })

  it('le de "ANO" quando outras colunas nao presentes', () => {
    const linha = { 'ANO': '2' }
    const result = lerSerieDoExcel(linha, '2A')
    expect(result).toBe('2')
  })

  it('usa inferencia por turma quando serie vazia', () => {
    const linha = {}  // sem coluna de serie
    const result = lerSerieDoExcel(linha, '4C')
    // Inferencia por turma extrai '4'
    expect(result).toBe('4')
  })

  it('usa deteccao por questoes quando serie e turma nao informadas', () => {
    const linha: Record<string, unknown> = {}
    // Sem serie e sem numero na turma, mas com questoes que indicam serie 8
    for (let q = 1; q <= 40; q++) linha[`Q${q}`] = 'A'
    const result = lerSerieDoExcel(linha, 'Turma Especial')
    expect(result).toBe('8')
  })

  it('retorna string vazia quando nem serie, turma, nem questoes disponiveis', () => {
    const linha = {}
    const result = lerSerieDoExcel(linha, '')
    expect(result).toBe('')
  })
})

// ============================================================================
// extrairDadosExcel
// ============================================================================

describe('extrairDadosExcel', () => {
  const dadosBase = [
    { POLO: 'Polo Norte', ESCOLA: 'Escola A', TURMA: '2A', ALUNO: 'João Silva', 'ANO/SÉRIE': '2' },
    { POLO: 'Polo Norte', ESCOLA: 'Escola A', TURMA: '2A', ALUNO: 'Maria Souza', 'ANO/SÉRIE': '2' },
    { POLO: 'Polo Sul', ESCOLA: 'Escola B', TURMA: '5B', ALUNO: 'Pedro Lima', 'ANO/SÉRIE': '5' },
  ]

  it('extrai polos unicos sem duplicatas', () => {
    const result = extrairDadosExcel(dadosBase)
    expect(result.polosUnicos.size).toBe(2)
    expect(result.polosUnicos.has('Polo Norte')).toBe(true)
    expect(result.polosUnicos.has('Polo Sul')).toBe(true)
  })

  it('extrai escolas com seu polo correspondente', () => {
    const result = extrairDadosExcel(dadosBase)
    expect(result.escolasUnicas.size).toBe(2)
    expect(result.escolasUnicas.get('Escola A')).toBe('Polo Norte')
    expect(result.escolasUnicas.get('Escola B')).toBe('Polo Sul')
  })

  it('extrai turmas unicas por chave turma_escola', () => {
    const result = extrairDadosExcel(dadosBase)
    expect(result.turmasUnicas.size).toBe(2)
    expect(result.turmasUnicas.has('2A_Escola A')).toBe(true)
    expect(result.turmasUnicas.has('5B_Escola B')).toBe(true)
  })

  it('extrai alunos unicos por chave aluno_escola (sem duplicatas)', () => {
    const dadosComDup = [
      ...dadosBase,
      // Mesmo aluno + escola = nao duplica
      { POLO: 'Polo Norte', ESCOLA: 'Escola A', TURMA: '2A', ALUNO: 'João Silva', 'ANO/SÉRIE': '2' },
    ]
    const result = extrairDadosExcel(dadosComDup)
    expect(result.alunosUnicos.size).toBe(3)  // 3 alunos unicos (nao 4)
  })

  it('ignora linhas sem polo (polo e escola nao registrados)', () => {
    const dadosSemPolo = [
      { POLO: '', ESCOLA: 'Escola Orfan', TURMA: '3A', ALUNO: 'Aluno X', 'ANO/SÉRIE': '3' },
    ]
    const result = extrairDadosExcel(dadosSemPolo)
    expect(result.polosUnicos.size).toBe(0)
    // Escola sem polo nao e incluida (requer polo preenchido)
    expect(result.escolasUnicas.size).toBe(0)
  })

  it('ignora linhas sem aluno (nao gera entrada de aluno)', () => {
    const dadosSemAluno = [
      { POLO: 'Polo A', ESCOLA: 'Escola A', TURMA: '2A', ALUNO: '', 'ANO/SÉRIE': '2' },
    ]
    const result = extrairDadosExcel(dadosSemAluno)
    expect(result.alunosUnicos.size).toBe(0)
  })

  it('retorna estruturas vazias para array de entrada vazio', () => {
    const result = extrairDadosExcel([])
    expect(result.polosUnicos.size).toBe(0)
    expect(result.escolasUnicas.size).toBe(0)
    expect(result.turmasUnicas.size).toBe(0)
    expect(result.alunosUnicos.size).toBe(0)
  })

  it('aceita variacao de case nas colunas (Polo, polo, POLO)', () => {
    const dadosMixCase = [
      { Polo: 'Polo Leste', Escola: 'Escola C', Turma: '1A', Aluno: 'Ana', 'ANO/SÉRIE': '1' },
    ]
    const result = extrairDadosExcel(dadosMixCase)
    expect(result.polosUnicos.has('Polo Leste')).toBe(true)
    expect(result.escolasUnicas.has('Escola C')).toBe(true)
  })
})
