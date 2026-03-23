import { describe, it, expect } from 'vitest'
import { calcularNotaFinal } from '@/lib/services/notas'

// ============================================================================
// TESTES DE INTEGRIDADE DE DADOS — NOTAS E CÁLCULOS
// ============================================================================

describe('Integridade de Dados — Notas', () => {
  const config = {
    nota_maxima: 10,
    media_aprovacao: 6,
    permite_recuperacao: true,
  }

  // --------------------------------------------------------------------------
  // LIMITES DE NOTA
  // --------------------------------------------------------------------------

  describe('nota não pode exceder o máximo', () => {
    it('nota 10.01 é limitada a 10', () => {
      expect(calcularNotaFinal(10.01, null, config)).toBe(10)
    })

    it('nota 100 é limitada a 10', () => {
      expect(calcularNotaFinal(100, null, config)).toBe(10)
    })

    it('nota 999 é limitada a 10', () => {
      expect(calcularNotaFinal(999, null, config)).toBe(10)
    })

    it('nota Infinity é limitada a 10', () => {
      expect(calcularNotaFinal(Infinity, null, config)).toBe(10)
    })
  })

  describe('nota não pode ser negativa', () => {
    it('nota -1 retorna 0', () => {
      expect(calcularNotaFinal(-1, null, config)).toBe(0)
    })

    it('nota -100 retorna 0', () => {
      expect(calcularNotaFinal(-100, null, config)).toBe(0)
    })

    it('nota -0.01 retorna 0', () => {
      expect(calcularNotaFinal(-0.01, null, config)).toBe(0)
    })

    it('nota -Infinity retorna 0', () => {
      expect(calcularNotaFinal(-Infinity, null, config)).toBe(0)
    })
  })

  // --------------------------------------------------------------------------
  // RECUPERAÇÃO SUBSTITUI SÓ SE MAIOR
  // --------------------------------------------------------------------------

  describe('recuperação só substitui se maior', () => {
    it('recuperação 8 substitui nota 4', () => {
      expect(calcularNotaFinal(4, 8, config)).toBe(8)
    })

    it('recuperação 3 NÃO substitui nota 7', () => {
      expect(calcularNotaFinal(7, 3, config)).toBe(7)
    })

    it('recuperação igual NÃO substitui', () => {
      expect(calcularNotaFinal(5, 5, config)).toBe(5)
    })

    it('recuperação 0 NÃO substitui nota 0', () => {
      expect(calcularNotaFinal(0, 0, config)).toBe(0)
    })

    it('recuperação 0.1 substitui nota 0', () => {
      expect(calcularNotaFinal(0, 0.1, config)).toBe(0.1)
    })

    it('recuperação 10 substitui nota 9.99', () => {
      expect(calcularNotaFinal(9.99, 10, config)).toBe(10)
    })

    it('recuperação também é limitada ao máximo', () => {
      expect(calcularNotaFinal(5, 15, config)).toBe(10)
    })

    it('recuperação negativa é ignorada (menor que nota)', () => {
      expect(calcularNotaFinal(5, -3, config)).toBe(5)
    })
  })

  // --------------------------------------------------------------------------
  // MÉDIA PONDERADA — cálculo com pesos (2,3,2,3)
  // --------------------------------------------------------------------------

  describe('média ponderada com pesos 2,3,2,3', () => {
    /**
     * Fórmula: (nota1*2 + nota2*3 + nota3*2 + nota4*3) / 10
     * Usado internamente no sistema para bimestres.
     */
    function mediaPonderada(n1: number, n2: number, n3: number, n4: number): number {
      const soma = n1 * 2 + n2 * 3 + n3 * 2 + n4 * 3
      return Math.round((soma / 10) * 100) / 100
    }

    it('notas iguais a 10 resulta em 10', () => {
      expect(mediaPonderada(10, 10, 10, 10)).toBe(10)
    })

    it('notas iguais a 0 resulta em 0', () => {
      expect(mediaPonderada(0, 0, 0, 0)).toBe(0)
    })

    it('notas iguais a 5 resulta em 5', () => {
      expect(mediaPonderada(5, 5, 5, 5)).toBe(5)
    })

    it('pesos dão mais importância ao 2º e 4º bimestre', () => {
      // 2º e 4º bimestre têm peso 3
      const comBimestre24Alto = mediaPonderada(0, 10, 0, 10)
      const comBimestre13Alto = mediaPonderada(10, 0, 10, 0)
      expect(comBimestre24Alto).toBe(6) // (0*2 + 10*3 + 0*2 + 10*3) / 10 = 6
      expect(comBimestre13Alto).toBe(4) // (10*2 + 0*3 + 10*2 + 0*3) / 10 = 4
      expect(comBimestre24Alto).toBeGreaterThan(comBimestre13Alto)
    })

    it('exemplo realista: 7, 8, 6, 9', () => {
      // (7*2 + 8*3 + 6*2 + 9*3) / 10 = (14+24+12+27)/10 = 77/10 = 7.7
      expect(mediaPonderada(7, 8, 6, 9)).toBe(7.7)
    })

    it('exemplo com decimais: 5.5, 6.5, 7.0, 8.0', () => {
      // (5.5*2 + 6.5*3 + 7.0*2 + 8.0*3) / 10 = (11+19.5+14+24)/10 = 68.5/10 = 6.85
      expect(mediaPonderada(5.5, 6.5, 7.0, 8.0)).toBe(6.85)
    })
  })

  // --------------------------------------------------------------------------
  // ARREDONDAMENTO PARA 2 CASAS DECIMAIS
  // --------------------------------------------------------------------------

  describe('arredondamento para 2 casas decimais', () => {
    it('7.555 arredonda para 7.56', () => {
      expect(calcularNotaFinal(7.555, null, config)).toBe(7.56)
    })

    it('7.554 arredonda para 7.55', () => {
      expect(calcularNotaFinal(7.554, null, config)).toBe(7.55)
    })

    it('7.5 mantém como 7.5', () => {
      expect(calcularNotaFinal(7.5, null, config)).toBe(7.5)
    })

    it('3.333 arredonda para 3.33', () => {
      expect(calcularNotaFinal(3.333, null, config)).toBe(3.33)
    })

    it('3.335 arredonda para 3.34', () => {
      // Math.round(3.335 * 100) = 334 → 3.34
      expect(calcularNotaFinal(3.335, null, config)).toBe(3.34)
    })

    it('9.999 arredonda para 10', () => {
      expect(calcularNotaFinal(9.999, null, config)).toBe(10)
    })

    it('0.005 arredonda para 0.01', () => {
      expect(calcularNotaFinal(0.005, null, config)).toBe(0.01)
    })

    it('0.001 arredonda para 0', () => {
      expect(calcularNotaFinal(0.001, null, config)).toBe(0)
    })
  })

  // --------------------------------------------------------------------------
  // TRATAMENTO DE NULL / UNDEFINED
  // --------------------------------------------------------------------------

  describe('tratamento de null/undefined', () => {
    it('nota null retorna null', () => {
      expect(calcularNotaFinal(null, null, config)).toBeNull()
    })

    it('nota undefined retorna null', () => {
      expect(calcularNotaFinal(undefined, null, config)).toBeNull()
    })

    it('nota NaN (como string) retorna null', () => {
      expect(calcularNotaFinal('abc' as any, null, config)).toBeNull()
    })

    it('nota string vazia retorna null', () => {
      expect(calcularNotaFinal('' as any, null, config)).toBeNull()
    })

    it('nota válida com recuperação null mantém nota', () => {
      expect(calcularNotaFinal(7, null, config)).toBe(7)
    })

    it('nota válida com recuperação undefined mantém nota', () => {
      expect(calcularNotaFinal(7, undefined, config)).toBe(7)
    })

    it('nota como string numérica é convertida', () => {
      expect(calcularNotaFinal('8.5' as any, null, config)).toBe(8.5)
    })

    it('recuperação como string numérica é convertida', () => {
      expect(calcularNotaFinal(3, '9' as any, config)).toBe(9)
    })

    it('recuperação como string não numérica é ignorada', () => {
      expect(calcularNotaFinal(5, 'abc' as any, config)).toBe(5)
    })
  })

  // --------------------------------------------------------------------------
  // CONFIG CUSTOMIZADA
  // --------------------------------------------------------------------------

  describe('nota_maxima customizada', () => {
    it('nota_maxima 100 permite notas maiores que 10', () => {
      const cfg = { nota_maxima: 100, media_aprovacao: 60, permite_recuperacao: true }
      expect(calcularNotaFinal(85, null, cfg)).toBe(85)
    })

    it('nota_maxima 100 ainda limita acima de 100', () => {
      const cfg = { nota_maxima: 100, media_aprovacao: 60, permite_recuperacao: true }
      expect(calcularNotaFinal(150, null, cfg)).toBe(100)
    })

    it('nota_maxima 20 limita a 20', () => {
      const cfg = { nota_maxima: 20, media_aprovacao: 12, permite_recuperacao: true }
      expect(calcularNotaFinal(25, null, cfg)).toBe(20)
    })
  })

  describe('permite_recuperacao false ignora recuperação', () => {
    const semRec = { nota_maxima: 10, media_aprovacao: 6, permite_recuperacao: false }

    it('recuperação alta é ignorada', () => {
      expect(calcularNotaFinal(4, 9, semRec)).toBe(4)
    })

    it('recuperação maior que nota é ignorada', () => {
      expect(calcularNotaFinal(2, 10, semRec)).toBe(2)
    })
  })
})
