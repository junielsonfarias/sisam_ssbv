/**
 * Testes unitários — lib/normalizar-serie.ts
 *
 * Cobre: normalizarSerie, normalizarSerieParaComparacao
 */
import { describe, it, expect } from 'vitest'
import {
  normalizarSerie,
  normalizarSerieParaComparacao,
} from '@/lib/normalizar-serie'

// ============================================================================
// normalizarSerie
// ============================================================================

describe('normalizarSerie', () => {
  it('retorna null para null', () => {
    expect(normalizarSerie(null)).toBeNull()
  })

  it('retorna null para undefined', () => {
    expect(normalizarSerie(undefined)).toBeNull()
  })

  it('retorna null para string vazia', () => {
    expect(normalizarSerie('')).toBeNull()
  })

  it('normaliza formato minúsculo sem "ano" — "8º" -> "8º Ano"', () => {
    expect(normalizarSerie('8º')).toBe('8º Ano')
  })

  it('normaliza "9º ano" (minúsculo) -> "9º Ano"', () => {
    expect(normalizarSerie('9º ano')).toBe('9º Ano')
  })

  it('normaliza "9º Ano" já formatado corretamente', () => {
    expect(normalizarSerie('9º Ano')).toBe('9º Ano')
  })

  it('normaliza "8º ANO" (maiúsculo) -> "8º Ano"', () => {
    expect(normalizarSerie('8º ANO')).toBe('8º Ano')
  })

  it('normaliza série 1 — "1º" -> "1º Ano"', () => {
    expect(normalizarSerie('1º')).toBe('1º Ano')
  })

  it('normaliza série 5 com espaços extras — "  5º ano  " -> "5º Ano"', () => {
    expect(normalizarSerie('  5º ano  ')).toBe('5º Ano')
  })

  it('normaliza série com apenas número "7" -> "7º Ano"', () => {
    expect(normalizarSerie('7')).toBe('7º Ano')
  })

  it('normaliza "2º Ano" já correto', () => {
    expect(normalizarSerie('2º Ano')).toBe('2º Ano')
  })

  it('retorna string original quando não há número — "Infantil"', () => {
    expect(normalizarSerie('Infantil')).toBe('Infantil')
  })

  it('retorna número 10 sem normalizar para "Xº Ano" (fora de 1-9)', () => {
    // 10 é >= 1 mas 10 <= 9 é false → retorna como está
    const resultado = normalizarSerie('10')
    expect(resultado).toBe('10')
  })
})

// ============================================================================
// normalizarSerieParaComparacao
// ============================================================================

describe('normalizarSerieParaComparacao', () => {
  it('retorna string vazia para null', () => {
    expect(normalizarSerieParaComparacao(null)).toBe('')
  })

  it('retorna string vazia para undefined', () => {
    expect(normalizarSerieParaComparacao(undefined)).toBe('')
  })

  it('retorna string em maiúsculo e sem espaços extras', () => {
    expect(normalizarSerieParaComparacao('8º ano')).toBe('8º ANO')
  })

  it('normaliza e maiuscula "9º Ano"', () => {
    expect(normalizarSerieParaComparacao('9º Ano')).toBe('9º ANO')
  })

  it('permite comparação case-insensitive entre variantes', () => {
    const a = normalizarSerieParaComparacao('5º Ano')
    const b = normalizarSerieParaComparacao('5º ANO')
    const c = normalizarSerieParaComparacao('5º ano')
    expect(a).toBe(b)
    expect(b).toBe(c)
  })
})
