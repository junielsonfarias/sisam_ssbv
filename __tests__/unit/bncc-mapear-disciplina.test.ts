/**
 * Testes unitários — lib/services/bncc.service.ts
 *
 * Cobre a função PURA mapearDisciplinaParaComponenteBncc:
 *   - mapeamento de cada disciplina para componente BNCC
 *   - sufixo _AI (anos 1-5) vs _AF (anos 6-9)
 *   - casos de borda: null, undefined, código desconhecido, alias
 *   - Língua Inglesa (somente LI_AF na BNCC)
 */

import { describe, it, expect } from 'vitest'
import { mapearDisciplinaParaComponenteBncc } from '@/lib/services/bncc.service'

// ============================================================================
// Tabela de casos — disciplinas mapeadas para Anos Iniciais (1-5)
// ============================================================================

describe('mapearDisciplinaParaComponenteBncc — Anos Iniciais (series 1-5)', () => {
  const casos: [string, number, string][] = [
    ['LP',   1, 'LP_AI'],
    ['PORT', 2, 'LP_AI'],   // alias de Língua Portuguesa
    ['MAT',  3, 'MA_AI'],
    ['CIE',  4, 'CI_AI'],
    ['HIS',  5, 'HI_AI'],
    ['GEO',  1, 'GE_AI'],
    ['ART',  2, 'AR_AI'],
    ['EDF',  3, 'EF_AI'],
    ['REL',  4, 'ER_AI'],
  ]

  for (const [codigo, serie, esperado] of casos) {
    it(`${codigo} série ${serie} → ${esperado}`, () => {
      expect(mapearDisciplinaParaComponenteBncc(codigo, serie)).toBe(esperado)
    })
  }
})

// ============================================================================
// Anos Finais (6-9)
// ============================================================================

describe('mapearDisciplinaParaComponenteBncc — Anos Finais (series 6-9)', () => {
  const casos: [string, number, string][] = [
    ['LP',   6, 'LP_AF'],
    ['MAT',  7, 'MA_AF'],
    ['CIE',  8, 'CI_AF'],
    ['HIS',  9, 'HI_AF'],
    ['GEO',  6, 'GE_AF'],
    ['ART',  7, 'AR_AF'],
    ['EDF',  8, 'EF_AF'],
    ['REL',  9, 'ER_AF'],
    ['ING',  6, 'LI_AF'],   // Língua Inglesa: somente AF na BNCC
    ['ING',  1, 'LI_AF'],   // mesmo em AI deve retornar LI_AF
  ]

  for (const [codigo, serie, esperado] of casos) {
    it(`${codigo} série ${serie} → ${esperado}`, () => {
      expect(mapearDisciplinaParaComponenteBncc(codigo, serie)).toBe(esperado)
    })
  }
})

// ============================================================================
// Série em string (como vem do banco PG: "3" ou "3º Ano")
// ============================================================================

describe('mapearDisciplinaParaComponenteBncc — série como string', () => {
  it('string "3" → Anos Iniciais', () => {
    expect(mapearDisciplinaParaComponenteBncc('MAT', '3')).toBe('MA_AI')
  })

  it('string "7" → Anos Finais', () => {
    expect(mapearDisciplinaParaComponenteBncc('MAT', '7')).toBe('MA_AF')
  })

  it('string "3º Ano" extrai número e retorna AI', () => {
    expect(mapearDisciplinaParaComponenteBncc('LP', '3º Ano')).toBe('LP_AI')
  })

  it('string "8º Ano" extrai número e retorna AF', () => {
    expect(mapearDisciplinaParaComponenteBncc('HIS', '8º Ano')).toBe('HI_AF')
  })
})

// ============================================================================
// Casos de borda — null, undefined, código desconhecido
// ============================================================================

describe('mapearDisciplinaParaComponenteBncc — bordas e nulos', () => {
  it('código null → retorna null', () => {
    expect(mapearDisciplinaParaComponenteBncc(null, 5)).toBeNull()
  })

  it('código undefined → retorna null', () => {
    expect(mapearDisciplinaParaComponenteBncc(undefined, 5)).toBeNull()
  })

  it('código desconhecido → retorna null', () => {
    expect(mapearDisciplinaParaComponenteBncc('FIS', 9)).toBeNull()
    expect(mapearDisciplinaParaComponenteBncc('QUI', 9)).toBeNull()
    expect(mapearDisciplinaParaComponenteBncc('BIO', 9)).toBeNull()
  })

  it('série null resulta em sufixo _AF (fallback)', () => {
    expect(mapearDisciplinaParaComponenteBncc('MAT', null)).toBe('MA_AF')
  })

  it('série undefined resulta em sufixo _AF (fallback)', () => {
    expect(mapearDisciplinaParaComponenteBncc('LP', undefined)).toBe('LP_AF')
  })

  it('série 0 não é AI nem AF — retorna _AF (fora do range 1-5)', () => {
    expect(mapearDisciplinaParaComponenteBncc('MAT', 0)).toBe('MA_AF')
  })

  it('série 10 não é AI — retorna _AF', () => {
    expect(mapearDisciplinaParaComponenteBncc('MAT', 10)).toBe('MA_AF')
  })

  it('código em minúsculo é normalizado (toUpperCase)', () => {
    expect(mapearDisciplinaParaComponenteBncc('lp', 3)).toBe('LP_AI')
    expect(mapearDisciplinaParaComponenteBncc('mat', 7)).toBe('MA_AF')
  })

  it('código com espaços é trimado', () => {
    expect(mapearDisciplinaParaComponenteBncc('  LP  ', 3)).toBe('LP_AI')
  })
})

// ============================================================================
// Língua Inglesa — regra especial (somente LI_AF na BNCC)
// ============================================================================

describe('mapearDisciplinaParaComponenteBncc — Língua Inglesa (ING)', () => {
  it('retorna sempre LI_AF independente do ano', () => {
    for (let s = 1; s <= 9; s++) {
      expect(mapearDisciplinaParaComponenteBncc('ING', s), `Série ${s}`).toBe('LI_AF')
    }
  })
})
