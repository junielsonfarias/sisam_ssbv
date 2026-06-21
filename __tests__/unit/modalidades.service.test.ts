/**
 * Testes unitários — lib/services/modalidades.service.ts
 *
 * Cobre todas as funções puras sem I/O:
 *   usaNotaNumerica, usaAvaliacaoDescritiva, quantidadePeriodos, listarModalidades
 * e verifica a integridade dos objetos de constantes.
 */

import { describe, it, expect } from 'vitest'
import {
  MODALIDADE_LABEL,
  MODALIDADE_AVALIACAO,
  MODALIDADE_PERIODO,
  usaNotaNumerica,
  usaAvaliacaoDescritiva,
  quantidadePeriodos,
  listarModalidades,
  type Modalidade,
} from '@/lib/services/modalidades.service'

const TODAS: Modalidade[] = ['regular', 'eja_fundamental', 'ed_infantil_creche', 'ed_infantil_pre']

// ============================================================================
// CONSTANTES — integridade de mapeamentos
// ============================================================================

describe('MODALIDADE_LABEL', () => {
  it('tem rótulo para todas as modalidades', () => {
    for (const m of TODAS) {
      expect(MODALIDADE_LABEL[m], `Label faltando para "${m}"`).toBeTruthy()
    }
  })

  it('rótulos são strings não-vazias', () => {
    for (const m of TODAS) {
      expect(typeof MODALIDADE_LABEL[m]).toBe('string')
      expect(MODALIDADE_LABEL[m].length).toBeGreaterThan(0)
    }
  })
})

describe('MODALIDADE_AVALIACAO', () => {
  it('retorna valores válidos para todas as modalidades', () => {
    const validos = new Set(['numerica', 'descritiva', 'mista'])
    for (const m of TODAS) {
      expect(validos.has(MODALIDADE_AVALIACAO[m]), `Valor inválido para "${m}"`).toBe(true)
    }
  })

  it('educação infantil usa avaliação descritiva', () => {
    expect(MODALIDADE_AVALIACAO['ed_infantil_creche']).toBe('descritiva')
    expect(MODALIDADE_AVALIACAO['ed_infantil_pre']).toBe('descritiva')
  })

  it('regular e eja usam avaliação numérica', () => {
    expect(MODALIDADE_AVALIACAO['regular']).toBe('numerica')
    expect(MODALIDADE_AVALIACAO['eja_fundamental']).toBe('numerica')
  })
})

describe('MODALIDADE_PERIODO', () => {
  it('regular usa bimestre', () => {
    expect(MODALIDADE_PERIODO['regular']).toBe('bimestre')
  })

  it('EJA usa semestre', () => {
    expect(MODALIDADE_PERIODO['eja_fundamental']).toBe('semestre')
  })

  it('educação infantil usa anual', () => {
    expect(MODALIDADE_PERIODO['ed_infantil_creche']).toBe('anual')
    expect(MODALIDADE_PERIODO['ed_infantil_pre']).toBe('anual')
  })
})

// ============================================================================
// usaNotaNumerica
// ============================================================================

describe('usaNotaNumerica', () => {
  it('retorna false para educação infantil creche', () => {
    expect(usaNotaNumerica('ed_infantil_creche')).toBe(false)
  })

  it('retorna false para educação infantil pré', () => {
    expect(usaNotaNumerica('ed_infantil_pre')).toBe(false)
  })

  it('retorna true para regular sem ano informado', () => {
    expect(usaNotaNumerica('regular')).toBe(true)
  })

  it('retorna true para regular com ano do ensino fundamental', () => {
    expect(usaNotaNumerica('regular', 5)).toBe(true)
    expect(usaNotaNumerica('regular', 9)).toBe(true)
  })

  it('retorna true para EJA fundamental', () => {
    expect(usaNotaNumerica('eja_fundamental')).toBe(true)
  })

  it('retorna true com ano null (sem série definida)', () => {
    expect(usaNotaNumerica('regular', null)).toBe(true)
  })
})

// ============================================================================
// usaAvaliacaoDescritiva
// ============================================================================

describe('usaAvaliacaoDescritiva', () => {
  it('retorna true para educação infantil creche', () => {
    expect(usaAvaliacaoDescritiva('ed_infantil_creche')).toBe(true)
  })

  it('retorna true para educação infantil pré', () => {
    expect(usaAvaliacaoDescritiva('ed_infantil_pre')).toBe(true)
  })

  it('retorna false para regular (avaliação numérica)', () => {
    expect(usaAvaliacaoDescritiva('regular')).toBe(false)
  })

  it('retorna false para EJA (avaliação numérica)', () => {
    expect(usaAvaliacaoDescritiva('eja_fundamental')).toBe(false)
  })

  it('é consistente com MODALIDADE_AVALIACAO (não contraria o mapeamento)', () => {
    for (const m of TODAS) {
      const esperaDescritiva = MODALIDADE_AVALIACAO[m] !== 'numerica'
      expect(usaAvaliacaoDescritiva(m)).toBe(esperaDescritiva)
    }
  })
})

// ============================================================================
// quantidadePeriodos
// ============================================================================

describe('quantidadePeriodos', () => {
  it('regular → 4 bimestres', () => {
    expect(quantidadePeriodos('regular')).toBe(4)
  })

  it('EJA fundamental → 2 semestres', () => {
    expect(quantidadePeriodos('eja_fundamental')).toBe(2)
  })

  it('educação infantil creche → 1 período anual', () => {
    expect(quantidadePeriodos('ed_infantil_creche')).toBe(1)
  })

  it('educação infantil pré → 1 período anual', () => {
    expect(quantidadePeriodos('ed_infantil_pre')).toBe(1)
  })

  it('total de períodos é >= 1 para todas as modalidades', () => {
    for (const m of TODAS) {
      expect(quantidadePeriodos(m)).toBeGreaterThanOrEqual(1)
    }
  })
})

// ============================================================================
// listarModalidades
// ============================================================================

describe('listarModalidades', () => {
  it('retorna array com a mesma quantidade de modalidades registradas', () => {
    const lista = listarModalidades()
    expect(lista).toHaveLength(TODAS.length)
  })

  it('cada item possui value e label', () => {
    for (const item of listarModalidades()) {
      expect(item).toHaveProperty('value')
      expect(item).toHaveProperty('label')
      expect(typeof item.value).toBe('string')
      expect(typeof item.label).toBe('string')
    }
  })

  it('values correspondem às modalidades conhecidas', () => {
    const values = listarModalidades().map((i) => i.value)
    for (const m of TODAS) {
      expect(values).toContain(m)
    }
  })

  it('labels são iguais ao MODALIDADE_LABEL', () => {
    for (const item of listarModalidades()) {
      expect(item.label).toBe(MODALIDADE_LABEL[item.value as Modalidade])
    }
  })
})
