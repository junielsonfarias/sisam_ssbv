/**
 * Testes unitários — transparencia.service
 *
 * Cobre:
 *  - resumoMunicipal: caminho feliz, tolerante a falhas de subtabelas
 *  - listarEscolasPublicas: com e sem dados de frequencia/PDDE
 *  - indicadoresEscola: escola encontrada com series, escola nao encontrada
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  resumoMunicipal,
  listarEscolasPublicas,
  indicadoresEscola,
} from '@/lib/services/transparencia.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// resumoMunicipal
// ============================================================================

describe('resumoMunicipal', () => {
  it('retorna metricas municipais consolidadas para o ano letivo', async () => {
    const fakeGeral = {
      alunos: '3500',
      escolas: '25',
      professores: '280',
      pne: '120',
      bf: '900',
      transporte: '400',
    }
    const fakePnae = { total: '2800' }
    const fakePdde = { recebido: '150000.50', executado: '120000.00' }

    mockQuery
      .mockResolvedValueOnce({ rows: [fakeGeral], rowCount: 1 } as any)  // geral
      .mockResolvedValueOnce({ rows: [fakePnae], rowCount: 1 } as any)   // pnae
      .mockResolvedValueOnce({ rows: [fakePdde], rowCount: 1 } as any)   // pdde

    const result = await resumoMunicipal('2026')

    expect(result.ano_letivo).toBe('2026')
    expect(result.total_alunos).toBe(3500)
    expect(result.total_escolas).toBe(25)
    expect(result.total_professores).toBe(280)
    expect(result.alunos_pne).toBe(120)
    expect(result.alunos_bolsa_familia).toBe(900)
    expect(result.alunos_transporte).toBe(400)
    expect(result.alunos_atendidos_pnae).toBe(2800)
    expect(result.pdde_recebido_total).toBeCloseTo(150000.50)
    expect(result.pdde_executado_total).toBeCloseTo(120000.00)
    expect(result.atualizado_em).toBeTruthy()
  })

  it('retorna zeros quando subtabelas nao existem (tolerancia a falhas)', async () => {
    // Todas as queries lancam erro (tabelas podem nao existir)
    mockQuery
      .mockRejectedValueOnce(new Error('tabela nao existe'))
      .mockRejectedValueOnce(new Error('tabela nao existe'))
      .mockRejectedValueOnce(new Error('tabela nao existe'))

    const result = await resumoMunicipal('2026')

    expect(result.total_alunos).toBe(0)
    expect(result.total_escolas).toBe(0)
    expect(result.pdde_recebido_total).toBe(0)
    expect(result.pdde_executado_total).toBe(0)
  })

  it('trata valores null do banco como zero', async () => {
    const fakeVazio = {
      alunos: null,
      escolas: null,
      professores: null,
      pne: null,
      bf: null,
      transporte: null,
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeVazio], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: null }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ recebido: null, executado: null }], rowCount: 1 } as any)

    const result = await resumoMunicipal('2026')

    expect(result.total_alunos).toBe(0)
    expect(result.alunos_atendidos_pnae).toBe(0)
    expect(result.pdde_recebido_total).toBe(0)
  })
})

// ============================================================================
// listarEscolasPublicas
// ============================================================================

describe('listarEscolasPublicas', () => {
  it('retorna lista de escolas com dados basicos', async () => {
    const fakeEscolas = [
      { id: 'esc-1', nome: 'Escola Alpha', endereco: 'Rua A', polo_nome: 'Polo Norte', total_alunos: '300', modalidades: ['fundamental'] },
      { id: 'esc-2', nome: 'Escola Beta', endereco: 'Rua B', polo_nome: 'Polo Sul', total_alunos: '150', modalidades: null },
    ]
    // Query principal
    mockQuery.mockResolvedValueOnce({ rows: fakeEscolas, rowCount: 2 } as any)
    // Frequencia e PDDE para esc-1
    mockQuery
      .mockResolvedValueOnce({ rows: [{ pct: '87.5' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ rec: '50000', exe: '45000' }], rowCount: 1 } as any)
    // Frequencia e PDDE para esc-2
    mockQuery
      .mockResolvedValueOnce({ rows: [{ pct: null }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ rec: '0', exe: '0' }], rowCount: 1 } as any)

    const result = await listarEscolasPublicas('2026')

    expect(result).toHaveLength(2)
    expect(result[0].nome).toBe('Escola Alpha')
    expect(result[0].total_alunos).toBe(300)
    expect(result[0].frequencia_media_pct).toBe(87.5)
    expect(result[0].pdde_recebido).toBe(50000)
    expect(result[0].pdde_executado).toBe(45000)
    expect(result[0].modalidades).toEqual(['fundamental'])
  })

  it('retorna modalidades como array vazio quando null', async () => {
    const fakeEscolas = [
      { id: 'esc-1', nome: 'Escola Sem Modalidade', total_alunos: '100', modalidades: null, polo_nome: null, endereco: null },
    ]
    mockQuery
      .mockResolvedValueOnce({ rows: fakeEscolas, rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ pct: '75.0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ rec: '10000', exe: '8000' }], rowCount: 1 } as any)

    const result = await listarEscolasPublicas('2026')

    expect(result[0].modalidades).toEqual([])
  })

  it('define frequencia_media_pct como null quando nao ha dados', async () => {
    const fakeEscolas = [
      { id: 'esc-1', nome: 'Escola', total_alunos: '50', modalidades: [], polo_nome: null, endereco: null },
    ]
    mockQuery
      .mockResolvedValueOnce({ rows: fakeEscolas, rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ pct: null }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ rec: '0', exe: '0' }], rowCount: 1 } as any)

    const result = await listarEscolasPublicas('2026')

    expect(result[0].frequencia_media_pct).toBeNull()
  })

  it('retorna lista vazia quando banco nao tem escolas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await listarEscolasPublicas('2026')

    expect(result).toEqual([])
  })
})

// ============================================================================
// indicadoresEscola
// ============================================================================

describe('indicadoresEscola', () => {
  it('retorna null quando escola nao encontrada', async () => {
    // listarEscolasPublicas nao encontra a escola
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await indicadoresEscola('esc-nao-existe', '2026')

    expect(result).toBeNull()
  })

  it('retorna escola com resumo por serie quando encontrada', async () => {
    const fakeEscolas = [
      { id: 'esc-1', nome: 'Escola A', total_alunos: '200', modalidades: ['fundamental'], polo_nome: 'Polo N', endereco: null },
    ]
    const fakeFreq = { pct: '85.0' }
    const fakePdde = { rec: '20000', exe: '18000' }
    const fakeSeries = [
      { serie: '3° Ano', total_alunos: '80' },
      { serie: '5° Ano', total_alunos: '120' },
    ]
    // Para listarEscolasPublicas
    mockQuery
      .mockResolvedValueOnce({ rows: fakeEscolas, rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakeFreq], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakePdde], rowCount: 1 } as any)
    // Para serieR
    mockQuery.mockResolvedValueOnce({ rows: fakeSeries, rowCount: 2 } as any)
    // Para cada serie: media + taxa_aprovacao (2 series x 2 queries = 4)
    mockQuery
      .mockResolvedValueOnce({ rows: [{ media: '7.5' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ aprovados: '70', total: '80' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ media: '8.2' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ aprovados: '115', total: '120' }], rowCount: 1 } as any)

    const result = await indicadoresEscola('esc-1', '2026')

    expect(result).not.toBeNull()
    expect(result!.escola.nome).toBe('Escola A')
    expect(result!.serie_resumo).toHaveLength(2)
    expect(result!.serie_resumo[0].serie).toBe('3° Ano')
    expect(result!.serie_resumo[0].total_alunos).toBe(80)
    expect(result!.serie_resumo[0].media_geral).toBe(7.5)
    expect(result!.serie_resumo[0].taxa_aprovacao_pct).toBe(87.5)
  })
})
