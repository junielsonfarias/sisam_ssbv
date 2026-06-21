/**
 * Testes unitários — lib/services/notas/config.ts e calculo.ts (extensão)
 *
 * Cobre: buscarConfigNotas (cache em memória + resolução de fonte),
 *        invalidarCacheConfigNotas (por escola+ano e global),
 *        calcularNotaFinal (ponderada + bordas adicionais).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import pool from '@/database/connection'
import { buscarConfigNotas, invalidarCacheConfigNotas } from '@/lib/services/notas/config'
import { calcularNotaFinal } from '@/lib/services/notas/calculo'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => {
  vi.clearAllMocks()
  // Limpa o cache entre testes para evitar interferência
  invalidarCacheConfigNotas()
})

// =============================================================================
// buscarConfigNotas — fonte canônica
// =============================================================================

describe('buscarConfigNotas', () => {
  const configGlobal = {
    nota_maxima: '10', media_aprovacao: '6', permite_recuperacao: true,
    peso_avaliacao: '0.6', peso_recuperacao: '0.4', regra_recuperacao: 'substituicao',
  }

  it('retorna config global quando não há override por série', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [configGlobal], rowCount: 1 } as any) // global
      // Sem serieEscolarId: não chama ERA

    const config = await buscarConfigNotas('e1', '2026')

    expect(config.nota_maxima).toBe(10)
    expect(config.media_aprovacao).toBe(6)
    expect(config.permite_recuperacao).toBe(true)
    expect(config.peso_avaliacao).toBeCloseTo(0.6)
    expect(config.peso_recuperacao).toBeCloseTo(0.4)
    expect(config.regra_recuperacao).toBe('substituicao')
  })

  it('aplica override de série (media_aprovacao) com prioridade sobre global', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [configGlobal], rowCount: 1 } as any) // global
      .mockResolvedValueOnce({
        rows: [{ media_aprovacao: '7', nota_maxima: null, permite_recuperacao: null, esquema_recuperacao: 'por_periodo' }],
        rowCount: 1,
      } as any) // ERA override

    const config = await buscarConfigNotas('e1', '2026', 'serie-1')

    expect(config.media_aprovacao).toBe(7) // override da série
    expect(config.nota_maxima).toBe(10)    // fallback global (ERA era null)
    expect(config.esquema_recuperacao).toBe('por_periodo')
  })

  it('usa defaults quando não há config no banco (escola nova)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // sem global
      // sem ERA também

    const config = await buscarConfigNotas('e-nova', '2026')

    expect(config.nota_maxima).toBe(10)      // default
    expect(config.media_aprovacao).toBe(6)   // default
    expect(config.permite_recuperacao).toBe(true) // default
    expect(config.regra_recuperacao).toBe('substituicao')       // default
    expect(config.esquema_recuperacao).toBe('por_periodo')      // default
  })

  it('reutiliza cache na 2ª chamada (não bate no banco novamente)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [configGlobal], rowCount: 1 } as any)

    const config1 = await buscarConfigNotas('e1', '2026')
    const config2 = await buscarConfigNotas('e1', '2026') // deve usar cache

    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(config1).toStrictEqual(config2)
  })

  it('normaliza regra_recuperacao inválida para o padrão substituicao', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...configGlobal, regra_recuperacao: 'invalida' }], rowCount: 1,
    } as any)

    const config = await buscarConfigNotas('e1', '2026-x')

    expect(config.regra_recuperacao).toBe('substituicao')
  })

  it('normaliza esquema_recuperacao inválido para por_periodo', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [configGlobal], rowCount: 1 } as any)
      .mockResolvedValueOnce({
        rows: [{ media_aprovacao: null, nota_maxima: null, permite_recuperacao: null, esquema_recuperacao: 'invalido' }],
        rowCount: 1,
      } as any)

    const config = await buscarConfigNotas('e1', '2026', 'serie-invalida')

    expect(config.esquema_recuperacao).toBe('por_periodo')
  })
})

// =============================================================================
// invalidarCacheConfigNotas
// =============================================================================

describe('invalidarCacheConfigNotas', () => {
  it('limpa todo o cache quando chamado sem argumentos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ nota_maxima: '10', media_aprovacao: '6', permite_recuperacao: true, peso_avaliacao: null, peso_recuperacao: null, regra_recuperacao: 'substituicao' }], rowCount: 1 } as any)
    await buscarConfigNotas('escola-C', '2026')

    invalidarCacheConfigNotas() // sem args = limpa tudo

    vi.clearAllMocks()
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await buscarConfigNotas('escola-C', '2026')
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// calcularNotaFinal — regra ponderada (complementa notas.service.test.ts)
// =============================================================================

describe('calcularNotaFinal — regra ponderada', () => {
  const configPonderada = {
    nota_maxima: 10,
    media_aprovacao: 6,
    permite_recuperacao: true,
    peso_avaliacao: 0.6,
    peso_recuperacao: 0.4,
    regra_recuperacao: 'ponderada' as const,
  }

  it('aplica fórmula ponderada: (nota * 0.6) + (recuperacao * 0.4)', () => {
    const result = calcularNotaFinal(5, 8, configPonderada)
    // (5 * 0.6) + (8 * 0.4) = 3 + 3.2 = 6.2
    expect(result).toBeCloseTo(6.2, 2)
  })

  it('não aplica ponderação quando pesos não somam ~1.0', () => {
    const configPesoErrado = { ...configPonderada, peso_avaliacao: 0.6, peso_recuperacao: 0.8 }
    // Pesos inválidos (0.6 + 0.8 = 1.4 ≠ 1): usa substituição (MAX)
    const result = calcularNotaFinal(5, 8, configPesoErrado)
    expect(result).toBe(8) // MAX(5, 8)
  })

  it('ponderada respeita nota_maxima (limita ao teto)', () => {
    const result = calcularNotaFinal(10, 10, configPonderada)
    // (10 * 0.6) + (10 * 0.4) = 10
    expect(result).toBe(10)
  })

  it('regra substituicao ignora pesos mesmo com peso_avaliacao/recuperacao definidos', () => {
    const configSubstituicao = { ...configPonderada, regra_recuperacao: 'substituicao' as const }
    const result = calcularNotaFinal(5, 8, configSubstituicao)
    expect(result).toBe(8) // MAX(5, 8)
  })

  it('nota como string numérica é parseada corretamente na ponderada', () => {
    const result = calcularNotaFinal('5' as any, '8' as any, configPonderada)
    // (5 * 0.6) + (8 * 0.4) = 6.2
    expect(result).toBeCloseTo(6.2, 2)
  })

  it('recuperação como string NaN retorna a nota original', () => {
    const result = calcularNotaFinal(7, 'abc' as any, configPonderada)
    // recNum isNaN → não aplica ponderação → retorna 7
    expect(result).toBe(7)
  })
})
