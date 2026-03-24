import { describe, it, expect } from 'vitest'
import { calcularNotaFinal } from '@/lib/services/notas'

describe('calcularNotaFinal', () => {
  const configPadrao = {
    nota_maxima: 10,
    media_aprovacao: 6,
    permite_recuperacao: true,
  }

  const configSemRecuperacao = {
    nota_maxima: 10,
    media_aprovacao: 6,
    permite_recuperacao: false,
  }

  // ============================================================================
  // CASOS BÁSICOS
  // ============================================================================

  it('retorna null quando nota é null', () => {
    expect(calcularNotaFinal(null, null, configPadrao)).toBeNull()
  })

  it('retorna null quando nota é undefined', () => {
    expect(calcularNotaFinal(undefined, null, configPadrao)).toBeNull()
  })

  it('retorna nota direta quando não há recuperação', () => {
    expect(calcularNotaFinal(7.5, null, configPadrao)).toBe(7.5)
  })

  it('retorna nota como number mesmo se passada como string', () => {
    expect(calcularNotaFinal('8.5' as any, null, configPadrao)).toBe(8.5)
  })

  it('retorna null para string não numérica', () => {
    expect(calcularNotaFinal('abc' as any, null, configPadrao)).toBeNull()
  })

  // ============================================================================
  // LÓGICA DE RECUPERAÇÃO
  // ============================================================================

  it('usa nota de recuperação quando maior que nota original', () => {
    expect(calcularNotaFinal(4.0, 7.0, configPadrao)).toBe(7.0)
  })

  it('mantém nota original quando recuperação é menor', () => {
    expect(calcularNotaFinal(8.0, 5.0, configPadrao)).toBe(8.0)
  })

  it('mantém nota original quando recuperação é igual', () => {
    expect(calcularNotaFinal(6.0, 6.0, configPadrao)).toBe(6.0)
  })

  it('ignora recuperação quando config não permite', () => {
    expect(calcularNotaFinal(4.0, 9.0, configSemRecuperacao)).toBe(4.0)
  })

  it('ignora recuperação null mesmo com config permitindo', () => {
    expect(calcularNotaFinal(5.0, null, configPadrao)).toBe(5.0)
  })

  // ============================================================================
  // LIMITES
  // ============================================================================

  it('não permite nota negativa', () => {
    expect(calcularNotaFinal(-3, null, configPadrao)).toBe(0)
  })

  it('limita ao máximo da config', () => {
    expect(calcularNotaFinal(15, null, configPadrao)).toBe(10)
  })

  it('limita ao máximo customizado', () => {
    const config = { ...configPadrao, nota_maxima: 100 }
    expect(calcularNotaFinal(85, null, config)).toBe(85)
    expect(calcularNotaFinal(150, null, config)).toBe(100)
  })

  it('arredonda para 2 casas decimais', () => {
    expect(calcularNotaFinal(7.555, null, configPadrao)).toBe(7.56)
    expect(calcularNotaFinal(7.554, null, configPadrao)).toBe(7.55)
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  it('nota zero é válida', () => {
    expect(calcularNotaFinal(0, null, configPadrao)).toBe(0)
  })

  it('nota zero com recuperação positiva', () => {
    expect(calcularNotaFinal(0, 6, configPadrao)).toBe(6)
  })

  it('recuperação como string numérica funciona', () => {
    expect(calcularNotaFinal(3, '8' as any, configPadrao)).toBe(8)
  })

  it('recuperação como string não numérica é ignorada', () => {
    expect(calcularNotaFinal(5, 'abc' as any, configPadrao)).toBe(5)
  })

  it('nota máxima exata é mantida', () => {
    expect(calcularNotaFinal(10, null, configPadrao)).toBe(10)
  })

  // ============================================================================
  // PESO DE RECUPERAÇÃO
  // ============================================================================

  it('nota 5 com recuperação 8, peso 0.6/0.4 → (5*0.6)+(8*0.4) = 6.2', () => {
    const config = {
      ...configPadrao,
      peso_avaliacao: 0.6,
      peso_recuperacao: 0.4,
    }
    expect(calcularNotaFinal(5, 8, config)).toBe(6.2)
  })

  it('nota 3 com recuperação 9, peso 0.7/0.3 → (3*0.7)+(9*0.3) = 4.8', () => {
    const config = {
      ...configPadrao,
      peso_avaliacao: 0.7,
      peso_recuperacao: 0.3,
    }
    expect(calcularNotaFinal(3, 9, config)).toBe(4.8)
  })

  it('nota 4 com recuperação 7, sem pesos definidos → max(4,7) = 7 (substituição simples)', () => {
    expect(calcularNotaFinal(4, 7, configPadrao)).toBe(7)
  })

  it('nota 8 com recuperação 6, com pesos → (8*0.6)+(6*0.4) = 7.2 (pior que original mas pesos aplicam)', () => {
    const config = {
      ...configPadrao,
      peso_avaliacao: 0.6,
      peso_recuperacao: 0.4,
    }
    expect(calcularNotaFinal(8, 6, config)).toBe(7.2)
  })

  it('peso_avaliacao=0.5 peso_recuperacao=0.5 soma=1.0 → aplica pesos', () => {
    const config = {
      ...configPadrao,
      peso_avaliacao: 0.5,
      peso_recuperacao: 0.5,
    }
    // (6*0.5)+(8*0.5) = 7.0
    expect(calcularNotaFinal(6, 8, config)).toBe(7)
  })

  it('peso_avaliacao=0.3 peso_recuperacao=0.2 soma≠1.0 → fallback para max', () => {
    const config = {
      ...configPadrao,
      peso_avaliacao: 0.3,
      peso_recuperacao: 0.2,
    }
    // soma = 0.5 ≠ 1.0 → usa max(4, 9) = 9
    expect(calcularNotaFinal(4, 9, config)).toBe(9)
  })

  // ============================================================================
  // NOTA ZERO
  // ============================================================================

  it('nota 0 é válida (não null)', () => {
    const result = calcularNotaFinal(0, null, configPadrao)
    expect(result).toBe(0)
    expect(result).not.toBeNull()
  })

  it('nota 0 com recuperação 5 e pesos → (0*0.6)+(5*0.4) = 2.0', () => {
    const config = {
      ...configPadrao,
      peso_avaliacao: 0.6,
      peso_recuperacao: 0.4,
    }
    expect(calcularNotaFinal(0, 5, config)).toBe(2)
  })
})
