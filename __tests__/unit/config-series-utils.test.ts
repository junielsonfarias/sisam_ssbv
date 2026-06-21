/**
 * Testes unitários — lib/config-series/utils.ts e niveis.ts (funções puras)
 *
 * Cobre:
 *   - extrairNumeroSerie
 *   - isAnosIniciais / serieTemCHCN / serieTemProducaoTextual
 *   - calcularNivelPorAcertos
 *   - converterNivelProducao
 *   - calcularNivelPorNota
 *   - nivelParaValor / valorParaNivel
 *   - calcularNivelAluno
 *   - getCorNivel
 */
import { describe, it, expect } from 'vitest'
import {
  extrairNumeroSerie,
  isAnosIniciais,
  serieTemCHCN,
  serieTemProducaoTextual,
} from '@/lib/config-series/utils'

import {
  calcularNivelPorAcertos,
  converterNivelProducao,
  calcularNivelPorNota,
  nivelParaValor,
  valorParaNivel,
  calcularNivelAluno,
  getCorNivel,
} from '@/lib/config-series/niveis'

// ============================================================================
// extrairNumeroSerie
// ============================================================================

describe('extrairNumeroSerie', () => {
  it('retorna null para null', () => {
    expect(extrairNumeroSerie(null)).toBeNull()
  })

  it('retorna null para undefined', () => {
    expect(extrairNumeroSerie(undefined)).toBeNull()
  })

  it('extrai "8" de "8º Ano"', () => {
    expect(extrairNumeroSerie('8º Ano')).toBe('8')
  })

  it('extrai "5" de "5º ANO"', () => {
    expect(extrairNumeroSerie('5º ANO')).toBe('5')
  })

  it('extrai "2" de "2"', () => {
    expect(extrairNumeroSerie('2')).toBe('2')
  })

  it('retorna null para string sem dígito', () => {
    expect(extrairNumeroSerie('Infantil')).toBeNull()
  })

  it('extrai "9" de "9º"', () => {
    expect(extrairNumeroSerie('9º')).toBe('9')
  })
})

// ============================================================================
// isAnosIniciais
// ============================================================================

describe('isAnosIniciais', () => {
  it('retorna true para 2º Ano', () => {
    expect(isAnosIniciais('2º Ano')).toBe(true)
  })

  it('retorna true para 3º Ano', () => {
    expect(isAnosIniciais('3º Ano')).toBe(true)
  })

  it('retorna true para 5º Ano', () => {
    expect(isAnosIniciais('5º Ano')).toBe(true)
  })

  it('retorna false para 6º Ano (anos finais)', () => {
    expect(isAnosIniciais('6º Ano')).toBe(false)
  })

  it('retorna false para 9º Ano', () => {
    expect(isAnosIniciais('9º Ano')).toBe(false)
  })

  it('retorna false para null', () => {
    expect(isAnosIniciais(null)).toBe(false)
  })
})

// ============================================================================
// serieTemCHCN
// ============================================================================

describe('serieTemCHCN', () => {
  it('retorna true para 6º Ano', () => {
    expect(serieTemCHCN('6º Ano')).toBe(true)
  })

  it('retorna true para 7º, 8º e 9º Ano', () => {
    expect(serieTemCHCN('7º Ano')).toBe(true)
    expect(serieTemCHCN('8º Ano')).toBe(true)
    expect(serieTemCHCN('9º Ano')).toBe(true)
  })

  it('retorna false para 5º Ano (anos iniciais)', () => {
    expect(serieTemCHCN('5º Ano')).toBe(false)
  })

  it('retorna false para null', () => {
    expect(serieTemCHCN(null)).toBe(false)
  })
})

// ============================================================================
// serieTemProducaoTextual
// ============================================================================

describe('serieTemProducaoTextual', () => {
  it('retorna true para 2º, 3º e 5º Ano', () => {
    expect(serieTemProducaoTextual('2º Ano')).toBe(true)
    expect(serieTemProducaoTextual('3º Ano')).toBe(true)
    expect(serieTemProducaoTextual('5º Ano')).toBe(true)
  })

  it('retorna false para 8º Ano', () => {
    expect(serieTemProducaoTextual('8º Ano')).toBe(false)
  })
})

// ============================================================================
// calcularNivelPorAcertos
// ============================================================================

describe('calcularNivelPorAcertos', () => {
  it('retorna null para acertos null', () => {
    expect(calcularNivelPorAcertos(null, '2º Ano', 'LP')).toBeNull()
  })

  it('retorna null para acertos 0', () => {
    expect(calcularNivelPorAcertos(0, '2º Ano', 'LP')).toBeNull()
  })

  it('retorna null para série inválida', () => {
    expect(calcularNivelPorAcertos(5, null, 'LP')).toBeNull()
  })

  // Regras do 2º e 3º Ano (14 questões LP e MAT)
  it('2º Ano LP — 1 a 3 acertos = N1', () => {
    expect(calcularNivelPorAcertos(1, '2º Ano', 'LP')).toBe('N1')
    expect(calcularNivelPorAcertos(3, '2º Ano', 'LP')).toBe('N1')
  })

  it('2º Ano LP — 4 a 7 acertos = N2', () => {
    expect(calcularNivelPorAcertos(4, '2º Ano', 'LP')).toBe('N2')
    expect(calcularNivelPorAcertos(7, '2º Ano', 'LP')).toBe('N2')
  })

  it('2º Ano LP — 8 a 11 acertos = N3', () => {
    expect(calcularNivelPorAcertos(8, '2º Ano', 'LP')).toBe('N3')
    expect(calcularNivelPorAcertos(11, '2º Ano', 'LP')).toBe('N3')
  })

  it('2º Ano LP — 12 a 14 acertos = N4', () => {
    expect(calcularNivelPorAcertos(12, '2º Ano', 'LP')).toBe('N4')
    expect(calcularNivelPorAcertos(14, '2º Ano', 'LP')).toBe('N4')
  })

  it('2º Ano LP — acima de 14 = N4 (estouro)', () => {
    expect(calcularNivelPorAcertos(15, '2º Ano', 'LP')).toBe('N4')
  })

  it('3º Ano MAT — mesmas regras do 2º Ano', () => {
    expect(calcularNivelPorAcertos(3, '3º Ano', 'MAT')).toBe('N1')
    expect(calcularNivelPorAcertos(10, '3º Ano', 'MAT')).toBe('N3')
  })

  // Regras do 5º Ano
  it('5º Ano LP — 1 a 3 acertos = N1', () => {
    expect(calcularNivelPorAcertos(2, '5º Ano', 'LP')).toBe('N1')
  })

  it('5º Ano LP — 12 a 14 acertos = N4', () => {
    expect(calcularNivelPorAcertos(13, '5º Ano', 'LP')).toBe('N4')
  })

  it('5º Ano MAT — 1 a 5 acertos = N1', () => {
    expect(calcularNivelPorAcertos(5, '5º Ano', 'MAT')).toBe('N1')
  })

  it('5º Ano MAT — 6 a 10 acertos = N2', () => {
    expect(calcularNivelPorAcertos(8, '5º Ano', 'MAT')).toBe('N2')
  })

  it('5º Ano MAT — 11 a 15 acertos = N3', () => {
    expect(calcularNivelPorAcertos(12, '5º Ano', 'MAT')).toBe('N3')
  })

  it('5º Ano MAT — 16 a 20 acertos = N4', () => {
    expect(calcularNivelPorAcertos(18, '5º Ano', 'MAT')).toBe('N4')
  })

  it('5º Ano MAT — acima de 20 = N4', () => {
    expect(calcularNivelPorAcertos(21, '5º Ano', 'MAT')).toBe('N4')
  })

  it('série não contemplada (8º Ano) retorna null', () => {
    expect(calcularNivelPorAcertos(10, '8º Ano', 'LP')).toBeNull()
  })
})

// ============================================================================
// converterNivelProducao
// ============================================================================

describe('converterNivelProducao', () => {
  it('converte INSUFICIENTE -> N1', () => {
    expect(converterNivelProducao('INSUFICIENTE')).toBe('N1')
  })

  it('converte BÁSICO -> N2 (com acento)', () => {
    expect(converterNivelProducao('BÁSICO')).toBe('N2')
  })

  it('converte BASICO -> N2 (sem acento)', () => {
    expect(converterNivelProducao('BASICO')).toBe('N2')
  })

  it('converte ADEQUADO -> N3', () => {
    expect(converterNivelProducao('ADEQUADO')).toBe('N3')
  })

  it('converte AVANÇADO -> N4 (com acento)', () => {
    expect(converterNivelProducao('AVANÇADO')).toBe('N4')
  })

  it('converte AVANCADO -> N4 (sem acento)', () => {
    expect(converterNivelProducao('AVANCADO')).toBe('N4')
  })

  it('aceita nível já convertido N1-N4 como passthrough', () => {
    expect(converterNivelProducao('N1')).toBe('N1')
    expect(converterNivelProducao('N2')).toBe('N2')
    expect(converterNivelProducao('N3')).toBe('N3')
    expect(converterNivelProducao('N4')).toBe('N4')
  })

  it('retorna null para string desconhecida', () => {
    expect(converterNivelProducao('OUTRO')).toBeNull()
  })

  it('retorna null para null/undefined', () => {
    expect(converterNivelProducao(null)).toBeNull()
    expect(converterNivelProducao(undefined)).toBeNull()
  })

  it('é case-insensitive — aceita "insuficiente" minúsculo', () => {
    expect(converterNivelProducao('insuficiente')).toBe('N1')
  })
})

// ============================================================================
// calcularNivelPorNota
// ============================================================================

describe('calcularNivelPorNota', () => {
  it('retorna null para nota null', () => {
    expect(calcularNivelPorNota(null)).toBeNull()
  })

  it('retorna null para nota 0 ou negativa', () => {
    expect(calcularNivelPorNota(0)).toBeNull()
    expect(calcularNivelPorNota(-1)).toBeNull()
  })

  it('N1 para notas 0.01 a 2.99', () => {
    expect(calcularNivelPorNota(0.01)).toBe('N1')
    expect(calcularNivelPorNota(2.99)).toBe('N1')
  })

  it('N2 para notas 3 a 4.99', () => {
    expect(calcularNivelPorNota(3)).toBe('N2')
    expect(calcularNivelPorNota(4.99)).toBe('N2')
  })

  it('N3 para notas 5 a 7.49', () => {
    expect(calcularNivelPorNota(5)).toBe('N3')
    expect(calcularNivelPorNota(7.49)).toBe('N3')
  })

  it('N4 para notas 7.5 a 10', () => {
    expect(calcularNivelPorNota(7.5)).toBe('N4')
    expect(calcularNivelPorNota(10)).toBe('N4')
  })
})

// ============================================================================
// nivelParaValor / valorParaNivel
// ============================================================================

describe('nivelParaValor', () => {
  it('N1 -> 1, N2 -> 2, N3 -> 3, N4 -> 4', () => {
    expect(nivelParaValor('N1')).toBe(1)
    expect(nivelParaValor('N2')).toBe(2)
    expect(nivelParaValor('N3')).toBe(3)
    expect(nivelParaValor('N4')).toBe(4)
  })

  it('é case-insensitive', () => {
    expect(nivelParaValor('n1')).toBe(1)
    expect(nivelParaValor('n4')).toBe(4)
  })

  it('retorna null para null/undefined', () => {
    expect(nivelParaValor(null)).toBeNull()
    expect(nivelParaValor(undefined)).toBeNull()
  })

  it('retorna null para nível desconhecido', () => {
    expect(nivelParaValor('N5')).toBeNull()
  })
})

describe('valorParaNivel', () => {
  it('1 -> N1, 2 -> N2, 3 -> N3, 4 -> N4', () => {
    expect(valorParaNivel(1)).toBe('N1')
    expect(valorParaNivel(2)).toBe('N2')
    expect(valorParaNivel(3)).toBe('N3')
    expect(valorParaNivel(4)).toBe('N4')
  })

  it('arredonda 1.6 para N2', () => {
    expect(valorParaNivel(1.6)).toBe('N2')
  })

  it('valor 0 é limitado a 1 -> N1', () => {
    expect(valorParaNivel(0)).toBe('N1')
  })

  it('valor 5 é limitado a 4 -> N4', () => {
    expect(valorParaNivel(5)).toBe('N4')
  })

  it('retorna null para null/undefined', () => {
    expect(valorParaNivel(null)).toBeNull()
    expect(valorParaNivel(undefined)).toBeNull()
  })
})

// ============================================================================
// calcularNivelAluno
// ============================================================================

describe('calcularNivelAluno', () => {
  it('retorna null quando todos os níveis são null', () => {
    expect(calcularNivelAluno(null, null, null)).toBeNull()
  })

  it('calcula média de 3 níveis iguais -> mesmo nível', () => {
    expect(calcularNivelAluno('N2', 'N2', 'N2')).toBe('N2')
  })

  it('calcula média de N1+N3 (descartando null) -> N2', () => {
    // (1 + 3) / 2 = 2 -> N2
    expect(calcularNivelAluno('N1', 'N3', null)).toBe('N2')
  })

  it('considera apenas valores válidos — ignora null', () => {
    // apenas N4 -> N4
    expect(calcularNivelAluno(null, null, 'N4')).toBe('N4')
  })

  it('calcula média de N1+N2+N3 -> N2', () => {
    // (1+2+3)/3 = 2.0 -> N2
    expect(calcularNivelAluno('N1', 'N2', 'N3')).toBe('N2')
  })

  it('calcula média de N2+N3+N4 -> N3', () => {
    // (2+3+4)/3 = 3.0 -> N3
    expect(calcularNivelAluno('N2', 'N3', 'N4')).toBe('N3')
  })
})

// ============================================================================
// getCorNivel
// ============================================================================

describe('getCorNivel', () => {
  it('retorna cor cinza para null', () => {
    expect(getCorNivel(null)).toContain('gray')
  })

  it('N1 -> vermelho (red)', () => {
    expect(getCorNivel('N1')).toContain('red')
  })

  it('N2 -> amarelo (yellow)', () => {
    expect(getCorNivel('N2')).toContain('yellow')
  })

  it('N3 -> azul (blue)', () => {
    expect(getCorNivel('N3')).toContain('blue')
  })

  it('N4 -> verde (green)', () => {
    expect(getCorNivel('N4')).toContain('green')
  })

  it('nível desconhecido retorna cor cinza', () => {
    expect(getCorNivel('N5')).toContain('gray')
  })

  it('é case-insensitive', () => {
    expect(getCorNivel('n1')).toContain('red')
    expect(getCorNivel('n4')).toContain('green')
  })
})
