import { describe, it, expect } from 'vitest'
import { calcularMediaAnual, aplicarArredondamento } from '@/lib/services/media-anual'

const PESOS_4 = [
  { periodo: 1, peso: 1 },
  { periodo: 2, peso: 1 },
  { periodo: 3, peso: 1 },
  { periodo: 4, peso: 1 },
]

function notas(...pares: [number, number][]) {
  return new Map<number, number>(pares)
}

describe('calcularMediaAnual — fórmulas (Fase 2.3)', () => {
  it('media_aritmetica: soma ÷ períodos com nota', () => {
    const r = calcularMediaAnual(notas([1, 6], [2, 8], [3, 5], [4, 9]), {
      formula: 'media_aritmetica', pesosPeriodos: PESOS_4,
    })
    expect(r.media).toBe(7) // (6+8+5+9)/4 = 7
    expect(r.periodos_com_nota).toBe(4)
    expect(r.periodos_total).toBe(4)
  })

  it('media_aritmetica: ignora períodos sem nota no divisor', () => {
    const r = calcularMediaAnual(notas([1, 6], [2, 8]), {
      formula: 'media_aritmetica', pesosPeriodos: PESOS_4,
    })
    expect(r.media).toBe(7) // (6+8)/2 = 7
    expect(r.periodos_com_nota).toBe(2)
    expect(r.periodos_total).toBe(4)
  })

  it('media_ponderada: usa os pesos por período', () => {
    const pesos = [
      { periodo: 1, peso: 1 }, { periodo: 2, peso: 1 },
      { periodo: 3, peso: 2 }, { periodo: 4, peso: 2 },
    ]
    const r = calcularMediaAnual(notas([1, 5], [2, 5], [3, 10], [4, 10]), {
      formula: 'media_ponderada', pesosPeriodos: pesos,
    })
    // (5+5+20+20)/6 = 8.33 -> 1 casa = 8.3
    expect(r.media).toBe(8.3)
  })

  it('maior_nota: retorna a maior entre os períodos', () => {
    const r = calcularMediaAnual(notas([1, 4], [2, 7], [3, 5], [4, 6]), {
      formula: 'maior_nota', pesosPeriodos: PESOS_4,
    })
    expect(r.media).toBe(7)
  })

  it('soma_dividida: divisor fixo = total de períodos (penaliza ausência)', () => {
    const r = calcularMediaAnual(notas([1, 6], [2, 8]), {
      formula: 'soma_dividida', pesosPeriodos: PESOS_4,
    })
    expect(r.media).toBe(3.5) // (6+8)/4 = 3.5
  })

  it('default media_aritmetica quando formula é null/desconhecida', () => {
    const r = calcularMediaAnual(notas([1, 6], [2, 8], [3, 5], [4, 9]), {
      formula: null, pesosPeriodos: PESOS_4,
    })
    expect(r.media).toBe(7)
  })

  it('sem nenhuma nota: média 0 e periodos_com_nota 0', () => {
    const r = calcularMediaAnual(notas(), { formula: 'media_aritmetica', pesosPeriodos: PESOS_4 })
    expect(r.media).toBe(0)
    expect(r.periodos_com_nota).toBe(0)
  })
})

describe('aplicarArredondamento', () => {
  it('normal arredonda na casa', () => {
    expect(aplicarArredondamento(6.349, 1, 'normal')).toBe(6.3)
    expect(aplicarArredondamento(6.35, 1, 'normal')).toBe(6.4)
  })
  it('cima sempre sobe na casa', () => {
    expect(aplicarArredondamento(6.31, 1, 'cima')).toBe(6.4)
    expect(aplicarArredondamento(6.0, 1, 'cima')).toBe(6.0)
  })
  it('baixo sempre desce na casa', () => {
    expect(aplicarArredondamento(6.39, 1, 'baixo')).toBe(6.3)
  })
  it('nenhum mantém o valor (limpa ruído de float)', () => {
    expect(aplicarArredondamento(6.333333, 1, 'nenhum')).toBe(6.333333)
  })
  it('casas_decimais = 0 arredonda para inteiro', () => {
    expect(aplicarArredondamento(6.6, 0, 'normal')).toBe(7)
  })
})
