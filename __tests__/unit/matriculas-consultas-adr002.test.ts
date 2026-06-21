/**
 * Testes unitários — lib/services/matriculas/consultas.ts (ADR-002 / domínio matrículas)
 *
 * Cobre as funções de suporte utilizadas pelo domínio de matrículas:
 *   - buscarResumoMatriculas()       → conta turmas e alunos de uma escola/ano
 *   - verificarCapacidadeTurma()     → capacidade, matriculados, vagas disponíveis
 *   - verificarAnoLetivoAtivo()      → bloqueia matrícula em ano não-ativo
 *
 * Regressões cobertas:
 *   - verificarCapacidadeTurma: turma com capacidade NULL deve retornar
 *     disponivel = 0 (sem divisão por zero / sem vagas infinitas reportadas).
 *   - verificarAnoLetivoAtivo: tabela ainda não existente não deve lançar —
 *     retorna null (silencioso, como documentado no código ADR-002 fase 1).
 *   - parseFloat em colunas numeric do PG: COUNT() retorna string; o service
 *     deve usar parseInt() para evitar NaN em somas (armadilha §8 do contexto).
 *
 * Estratégia: pool.query completamente mockado — sem banco real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mock pool
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  buscarResumoMatriculas,
  verificarCapacidadeTurma,
  verificarAnoLetivoAtivo,
} from '@/lib/services/matriculas/consultas'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => {
  vi.clearAllMocks()
})

// ======================================================= buscarResumoMatriculas

describe('buscarResumoMatriculas — contagem de turmas e alunos por escola/ano', () => {
  const ESCOLA_ID = 'escola-uuid-001'
  const ANO = '2026'

  it('caminho feliz: retorna total_turmas e total_alunos corretamente', async () => {
    // 2 queries em paralelo: turmas + alunos
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '87' }] } as any)

    const resultado = await buscarResumoMatriculas(ESCOLA_ID, ANO)

    expect(resultado.total_turmas).toBe(5)
    expect(resultado.total_alunos).toBe(87)
  })

  it('retorna zeros quando escola não tem turmas nem alunos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)

    const resultado = await buscarResumoMatriculas(ESCOLA_ID, ANO)

    expect(resultado.total_turmas).toBe(0)
    expect(resultado.total_alunos).toBe(0)
  })

  it('regressão (armadilha §8 — parseFloat em numeric PG): COUNT retorna string → service converte com parseInt', async () => {
    // PG devolve COUNT como string '12', não número 12
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '12' }] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '234' }] } as any)

    const resultado = await buscarResumoMatriculas(ESCOLA_ID, ANO)

    // Deve ser número, não string
    expect(typeof resultado.total_turmas).toBe('number')
    expect(typeof resultado.total_alunos).toBe('number')
    expect(resultado.total_turmas).toBe(12)
    expect(resultado.total_alunos).toBe(234)
  })

  it('retorna zeros quando rows estão vazios (resultado inesperado do banco)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await buscarResumoMatriculas(ESCOLA_ID, ANO)

    expect(resultado.total_turmas).toBe(0)
    expect(resultado.total_alunos).toBe(0)
  })

  it('passa escolaId e anoLetivo como parâmetros nas duas queries', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)

    await buscarResumoMatriculas(ESCOLA_ID, ANO)

    expect(mockQuery).toHaveBeenCalledTimes(2)
    // Ambas as queries devem usar escola_id e ano_letivo como parâmetros
    for (const call of mockQuery.mock.calls) {
      const params = call[1] as string[]
      expect(params).toContain(ESCOLA_ID)
      expect(params).toContain(ANO)
    }
  })

  it('as duas queries filtram apenas registros ativos (ativo = true)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '3' }] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '50' }] } as any)

    await buscarResumoMatriculas(ESCOLA_ID, ANO)

    for (const call of mockQuery.mock.calls) {
      const sql = String(call[0])
      expect(sql).toContain('ativo = true')
    }
  })
})

// ====================================================== verificarCapacidadeTurma

describe('verificarCapacidadeTurma — vagas disponíveis na turma', () => {
  const TURMA_ID = 'turma-uuid-001'

  it('caminho feliz: retorna capacidade, matriculados e disponivel corretos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 30, total_cursando: '22' }],
    } as any)

    const resultado = await verificarCapacidadeTurma(TURMA_ID)

    expect(resultado.capacidade).toBe(30)
    expect(resultado.matriculados).toBe(22)
    expect(resultado.disponivel).toBe(8)
  })

  it('turma cheia: disponivel = 0 (não negativo)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 25, total_cursando: '25' }],
    } as any)

    const resultado = await verificarCapacidadeTurma(TURMA_ID)

    expect(resultado.matriculados).toBe(25)
    expect(resultado.disponivel).toBe(0)
  })

  it('regressão: turma com capacidade_maxima NULL retorna disponivel = 0 (sem vagas infinitas)', async () => {
    // NULL significa sem limite cadastrado; disponivel deve ser 0 (seguro)
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: null, total_cursando: '10' }],
    } as any)

    const resultado = await verificarCapacidadeTurma(TURMA_ID)

    expect(resultado.capacidade).toBe(0)
    expect(resultado.disponivel).toBe(0)
  })

  it('turma inexistente retorna zeros em todos os campos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await verificarCapacidadeTurma(TURMA_ID)

    expect(resultado).toEqual({ capacidade: 0, matriculados: 0, disponivel: 0 })
  })

  it('regressão (armadilha §8): total_cursando retornado como string pelo PG é convertido para número', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 40, total_cursando: '35' }],
    } as any)

    const resultado = await verificarCapacidadeTurma(TURMA_ID)

    expect(typeof resultado.matriculados).toBe('number')
    expect(resultado.matriculados).toBe(35)
    expect(resultado.disponivel).toBe(5)
  })

  it('disponivel jamais fica negativo mesmo com total_cursando > capacidade_maxima', async () => {
    // Borda: alunos cursando podem exceder a capacidade em dados inconsistentes
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 20, total_cursando: '25' }],
    } as any)

    const resultado = await verificarCapacidadeTurma(TURMA_ID)

    expect(resultado.disponivel).toBeGreaterThanOrEqual(0)
  })

  it('usa turmaId como parâmetro na query (query parametrizada — não interpolação)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 30, total_cursando: '10' }],
    } as any)

    await verificarCapacidadeTurma(TURMA_ID)

    const [, params] = mockQuery.mock.calls[0] as [string, string[]]
    expect(params).toContain(TURMA_ID)
    // SQL não deve conter o UUID interpolado diretamente
    const sql = String(mockQuery.mock.calls[0][0])
    expect(sql).not.toContain(TURMA_ID)
  })
})

// ====================================================== verificarAnoLetivoAtivo

describe('verificarAnoLetivoAtivo — bloqueio de matrícula em ano não-ativo', () => {
  it('caminho feliz: retorna null quando ano está "ativo"', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'ativo' }] } as any)

    const resultado = await verificarAnoLetivoAtivo('2026')

    expect(resultado).toBeNull()
  })

  it('retorna mensagem de erro quando ano está "fechado"', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'fechado' }] } as any)

    const resultado = await verificarAnoLetivoAtivo('2025')

    expect(resultado).not.toBeNull()
    expect(resultado).toContain('2025')
    expect(resultado).toMatch(/não está ativo/i)
  })

  it('retorna mensagem de erro quando ano está "em_andamento" (exige explicitamente "ativo")', async () => {
    // Apenas status === 'ativo' libera; qualquer outro bloqueia
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'em_andamento' }] } as any)

    const resultado = await verificarAnoLetivoAtivo('2026')

    expect(resultado).not.toBeNull()
    expect(typeof resultado).toBe('string')
  })

  it('retorna null quando ano letivo não está cadastrado (ano inexistente → sem restrição)', async () => {
    // rows vazio → ano não encontrado → sem bloqueio
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await verificarAnoLetivoAtivo('2030')

    expect(resultado).toBeNull()
  })

  it('regressão (ADR-002 fase 1): tabela anos_letivos inexistente não lança — retorna null silenciosamente', async () => {
    // Simula erro de tabela não existente (migration ainda não aplicada)
    mockQuery.mockRejectedValueOnce(new Error('relation "anos_letivos" does not exist'))

    const resultado = await verificarAnoLetivoAtivo('2026')

    // Não deve lançar; código tem try-catch para este cenário
    expect(resultado).toBeNull()
  })

  it('usa anoLetivo como parâmetro na query (query parametrizada)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'ativo' }] } as any)

    await verificarAnoLetivoAtivo('2026')

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [, params] = mockQuery.mock.calls[0] as [string, string[]]
    expect(params).toContain('2026')
  })
})
