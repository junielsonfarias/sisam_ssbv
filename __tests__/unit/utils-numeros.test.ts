import { describe, it, expect } from 'vitest'
import {
  toNumber,
  toInt,
  formatarNumero,
  formatarNota,
  formatarPercentual,
  calcularMedia,
  calcularSoma,
  isVazio,
  valorOuPadrao,
  parseDbNumber,
  parseDbInt,
} from '@/lib/utils-numeros'

// ============================================================================
// toNumber
// ============================================================================

describe('toNumber', () => {
  it('converte string numérica', () => {
    expect(toNumber('7.5')).toBe(7.5)
  })

  it('retorna número diretamente', () => {
    expect(toNumber(42)).toBe(42)
  })

  it('retorna padrão para null', () => {
    expect(toNumber(null)).toBe(0)
    expect(toNumber(null, -1)).toBe(-1)
  })

  it('retorna padrão para undefined', () => {
    expect(toNumber(undefined)).toBe(0)
  })

  it('retorna padrão para string vazia', () => {
    expect(toNumber('')).toBe(0)
  })

  it('retorna padrão para string não numérica', () => {
    expect(toNumber('abc')).toBe(0)
  })
})

// ============================================================================
// toInt
// ============================================================================

describe('toInt', () => {
  it('converte string inteira', () => {
    expect(toInt('42')).toBe(42)
  })

  it('trunca decimal', () => {
    expect(toInt('7.9')).toBe(7)
    expect(toInt(3.7)).toBe(3)
  })

  it('retorna padrão para inválidos', () => {
    expect(toInt(null)).toBe(0)
    expect(toInt(undefined, 5)).toBe(5)
    expect(toInt('abc')).toBe(0)
  })
})

// ============================================================================
// formatarNumero / formatarNota / formatarPercentual
// ============================================================================

describe('formatarNumero', () => {
  it('formata com 2 casas decimais por padrão', () => {
    expect(formatarNumero(7.5)).toBe('7.50')
  })

  it('aceita casas decimais customizadas', () => {
    expect(formatarNumero(7.5678, 1)).toBe('7.6')
  })

  it('retorna padrão para null', () => {
    expect(formatarNumero(null)).toBe('-')
    expect(formatarNumero(null, 2, 'N/A')).toBe('N/A')
  })

  it('zero é exibido como número', () => {
    expect(formatarNumero(0)).toBe('0.00')
  })
})

describe('formatarNota', () => {
  it('formata nota com 2 casas', () => {
    expect(formatarNota(8)).toBe('8.00')
    expect(formatarNota(7.5)).toBe('7.50')
  })

  it('retorna - para null', () => {
    expect(formatarNota(null)).toBe('-')
  })
})

describe('formatarPercentual', () => {
  it('formata com 1 casa e %', () => {
    expect(formatarPercentual(85.67)).toBe('85.7%')
  })

  it('retorna - para null', () => {
    expect(formatarPercentual(null)).toBe('-')
  })
})

// ============================================================================
// calcularMedia / calcularSoma
// ============================================================================

describe('calcularMedia', () => {
  it('calcula média ignorando zeros', () => {
    expect(calcularMedia([8, 0, 6, 0])).toBe(7) // (8+6)/2
  })

  it('calcula média incluindo zeros', () => {
    expect(calcularMedia([8, 0, 6, 0], false)).toBe(3.5) // (8+0+6+0)/4
  })

  it('retorna 0 para array vazio', () => {
    expect(calcularMedia([])).toBe(0)
  })

  it('trata valores null/undefined', () => {
    expect(calcularMedia([null, 8, undefined, 6])).toBe(7)
  })

  it('trata strings numéricas', () => {
    expect(calcularMedia(['7', '9'])).toBe(8)
  })
})

describe('calcularSoma', () => {
  it('soma valores numéricos', () => {
    expect(calcularSoma([1, 2, 3])).toBe(6)
  })

  it('trata null como 0', () => {
    expect(calcularSoma([1, null, 3])).toBe(4)
  })
})

// ============================================================================
// isVazio / valorOuPadrao
// ============================================================================

describe('isVazio', () => {
  it('true para null/undefined/vazio', () => {
    expect(isVazio(null)).toBe(true)
    expect(isVazio(undefined)).toBe(true)
    expect(isVazio('')).toBe(true)
    expect(isVazio(NaN)).toBe(true)
  })

  it('false para valores válidos', () => {
    expect(isVazio(0)).toBe(false)
    expect(isVazio('text')).toBe(false)
    expect(isVazio(false)).toBe(false)
  })
})

describe('valorOuPadrao', () => {
  it('retorna valor quando presente', () => {
    expect(valorOuPadrao('hello', 'default')).toBe('hello')
    expect(valorOuPadrao(0, 5)).toBe(0)
    expect(valorOuPadrao(false, true)).toBe(false)
  })

  it('retorna padrão para null/undefined', () => {
    expect(valorOuPadrao(null, 'default')).toBe('default')
    expect(valorOuPadrao(undefined, 42)).toBe(42)
  })
})

// ============================================================================
// parseDbNumber / parseDbInt
// ============================================================================

describe('parseDbNumber', () => {
  it('converte string do PostgreSQL', () => {
    expect(parseDbNumber('7.85')).toBe(7.85)
  })

  it('passa número diretamente', () => {
    expect(parseDbNumber(3.14)).toBe(3.14)
  })

  it('retorna padrão para null', () => {
    expect(parseDbNumber(null)).toBe(0)
    expect(parseDbNumber(null, -1)).toBe(-1)
  })

  it('retorna padrão para NaN', () => {
    expect(parseDbNumber('not_a_number')).toBe(0)
  })
})

describe('parseDbInt', () => {
  it('converte string inteira', () => {
    expect(parseDbInt('42')).toBe(42)
  })

  it('trunca decimal de string', () => {
    expect(parseDbInt('7.9')).toBe(7)
  })

  it('retorna padrão para null', () => {
    expect(parseDbInt(null)).toBe(0)
  })
})
