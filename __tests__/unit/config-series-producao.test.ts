/**
 * Testes unitários — lib/config-series/producao.ts
 *
 * Cobre: extrairNotaProducao, calcularMediaProducao, getColunasProducao
 */
import { describe, it, expect } from 'vitest'
import {
  extrairNotaProducao,
  calcularMediaProducao,
  getColunasProducao,
} from '@/lib/config-series/producao'

// ============================================================================
// extrairNotaProducao
// ============================================================================

describe('extrairNotaProducao', () => {
  it('retorna 1 para "X" maiúsculo (formato Item1)', () => {
    expect(extrairNotaProducao({ Item1: 'X' }, 1)).toBe(1)
  })

  it('retorna 1 para "x" minúsculo (normalizado para X)', () => {
    expect(extrairNotaProducao({ Item2: 'x' }, 2)).toBe(1)
  })

  it('retorna 0 para "-"', () => {
    expect(extrairNotaProducao({ Item1: '-' }, 1)).toBe(0)
  })

  it('retorna 0 para "0"', () => {
    expect(extrairNotaProducao({ Item3: '0' }, 3)).toBe(0)
  })

  it('retorna 0 para string vazia', () => {
    expect(extrairNotaProducao({ Item4: '' }, 4)).toBe(0)
  })

  it('converte valor numérico direto', () => {
    expect(extrairNotaProducao({ Item1: 7.5 }, 1)).toBe(7.5)
  })

  it('suporta formato com underscore ITEM_1', () => {
    expect(extrairNotaProducao({ ITEM_1: 'X' }, 1)).toBe(1)
  })

  it('suporta formato minúsculo item1', () => {
    expect(extrairNotaProducao({ item1: 'X' }, 1)).toBe(1)
  })

  it('suporta formato com espaço "Item 1"', () => {
    expect(extrairNotaProducao({ 'Item 1': 'X' }, 1)).toBe(1)
  })

  it('suporta formato abreviado I1', () => {
    expect(extrairNotaProducao({ I1: 'X' }, 1)).toBe(1)
  })

  it('retorna null quando coluna não existe na linha', () => {
    expect(extrairNotaProducao({ outrocampo: 'valor' }, 1)).toBeNull()
  })

  it('retorna null para linha vazia', () => {
    expect(extrairNotaProducao({}, 1)).toBeNull()
  })

  it('suporta vírgula como separador decimal', () => {
    expect(extrairNotaProducao({ Item1: '7,5' }, 1)).toBe(7.5)
  })

  it('trata ITEM5 maiúsculo', () => {
    expect(extrairNotaProducao({ ITEM5: '-' }, 5)).toBe(0)
  })
})

// ============================================================================
// calcularMediaProducao
// ============================================================================

describe('calcularMediaProducao', () => {
  it('retorna null para array vazio', () => {
    expect(calcularMediaProducao([])).toBeNull()
  })

  it('retorna null quando todos os itens são null', () => {
    expect(calcularMediaProducao([null, null, null])).toBeNull()
  })

  it('calcula média de itens válidos — ignora null', () => {
    // (1 + 0 + 1) / 3 = 0.666...
    expect(calcularMediaProducao([1, 0, 1])).toBeCloseTo(0.667, 2)
  })

  it('calcula média de um único item', () => {
    expect(calcularMediaProducao([1])).toBe(1)
  })

  it('calcula média com zeros incluídos', () => {
    // (0 + 0 + 1 + 1) / 4 = 0.5
    expect(calcularMediaProducao([0, 0, 1, 1])).toBe(0.5)
  })

  it('ignora null e calcula apenas os válidos', () => {
    // (1 + 1) / 2 = 1.0 (ignora null)
    expect(calcularMediaProducao([1, null, 1])).toBe(1)
  })

  it('média de 8 acertos 0 e 1', () => {
    const itens = [1, 1, 0, 1, 0, 0, 1, 1]
    const soma = itens.reduce((acc, v) => acc + v, 0) // 5
    const media = soma / itens.length // 0.625
    expect(calcularMediaProducao(itens)).toBeCloseTo(media, 5)
  })
})

// ============================================================================
// getColunasProducao
// ============================================================================

describe('getColunasProducao', () => {
  it('retorna array não-vazio', () => {
    const colunas = getColunasProducao()
    expect(Array.isArray(colunas)).toBe(true)
    expect(colunas.length).toBeGreaterThan(0)
  })

  it('inclui variações de Item1', () => {
    const colunas = getColunasProducao()
    expect(colunas).toContain('Item1')
    expect(colunas).toContain('ITEM1')
    expect(colunas).toContain('item1')
  })

  it('inclui formato com underscore ITEM_1', () => {
    const colunas = getColunasProducao()
    expect(colunas).toContain('ITEM_1')
  })

  it('inclui "Produção" e variantes', () => {
    const colunas = getColunasProducao()
    expect(colunas).toContain('Produção')
    expect(colunas).toContain('PRODUÇÃO')
  })
})
