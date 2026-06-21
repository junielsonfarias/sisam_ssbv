/**
 * Testes unitários — lib/services/periodos-letivos.service.ts
 *
 * Cobre sincronizarSemestres:
 *   - sem bimestres → acao 'sem_bimestres'
 *   - bimestres incompletos (< 4) → acao 'bimestres_incompletos'
 *   - 4 bimestres → deriva semestres corretamente (datas)
 *   - idempotência (UPSERT — rows[0].inserido false → 'atualizados')
 *   - aceitação de client externo (participação em transação)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import { sincronizarSemestres } from '@/lib/services/periodos-letivos.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

// Bimestres padrão de 2026 para reutilizar nos testes
const BIMESTRES_2026 = [
  { numero: 1, data_inicio: '2026-02-01', data_fim: '2026-04-30' },
  { numero: 2, data_inicio: '2026-05-04', data_fim: '2026-07-17' },
  { numero: 3, data_inicio: '2026-08-03', data_fim: '2026-10-16' },
  { numero: 4, data_inicio: '2026-10-19', data_fim: '2026-12-18' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Casos de retorno antecipado (sem bimestres / incompletos)
// ============================================================================

describe('sincronizarSemestres — casos de retorno antecipado', () => {
  it('retorna acao=sem_bimestres quando não há bimestres', async () => {
    // 1ª query: busca bimestres → vazio
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const result = await sincronizarSemestres('2026')

    expect(result.acao).toBe('sem_bimestres')
    expect(result.ano_letivo).toBe('2026')
    expect(result.mensagem).toContain('Nenhum bimestre')
  })

  it('retorna acao=bimestres_incompletos com 1 bimestre', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [BIMESTRES_2026[0]] })

    const result = await sincronizarSemestres('2025')

    expect(result.acao).toBe('bimestres_incompletos')
    expect(result.mensagem).toContain('encontrados: 1')
  })

  it('retorna acao=bimestres_incompletos com 2 bimestres', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [BIMESTRES_2026[0], BIMESTRES_2026[1]] })

    const result = await sincronizarSemestres('2025')

    expect(result.acao).toBe('bimestres_incompletos')
    expect(result.mensagem).toContain('encontrados: 2')
  })

  it('retorna acao=bimestres_incompletos com 3 bimestres', async () => {
    mockQuery.mockResolvedValueOnce({ rows: BIMESTRES_2026.slice(0, 3) })

    const result = await sincronizarSemestres('2025')

    expect(result.acao).toBe('bimestres_incompletos')
    expect(result.mensagem).toContain('encontrados: 3')
  })

  it('não executa UPSERT de semestres quando há retorno antecipado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await sincronizarSemestres('2026')

    // Deve ter chamado pool.query apenas 1 vez (a busca de bimestres)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Criação de semestres (caminho feliz — 4 bimestres)
// ============================================================================

describe('sincronizarSemestres — 4 bimestres completos', () => {
  it('chama UPSERT para 2 semestres quando há 4 bimestres', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })   // busca bimestres
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })  // UPSERT 1º semestre
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })  // UPSERT 2º semestre

    await sincronizarSemestres('2026')

    // 1 (busca) + 2 (UPSERT semestres) = 3 chamadas
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('1º semestre usa data_inicio do 1º bimestre e data_fim do 2º bimestre', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })

    await sincronizarSemestres('2026')

    const upsertSem1 = mockQuery.mock.calls[1]
    const params = upsertSem1[1] as unknown[]
    // [nome, numero, anoLetivo, data_inicio, data_fim]
    expect(params[1]).toBe(1)         // numero = 1
    expect(params[2]).toBe('2026')    // ano_letivo
    expect(params[3]).toBe('2026-02-01')  // data_inicio do 1º bim
    expect(params[4]).toBe('2026-07-17')  // data_fim do 2º bim
  })

  it('2º semestre usa data_inicio do 3º bimestre e data_fim do 4º bimestre', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })

    await sincronizarSemestres('2026')

    const upsertSem2 = mockQuery.mock.calls[2]
    const params = upsertSem2[1] as unknown[]
    expect(params[1]).toBe(2)             // numero = 2
    expect(params[3]).toBe('2026-08-03')  // data_inicio do 3º bim
    expect(params[4]).toBe('2026-12-18')  // data_fim do 4º bim
  })

  it('retorna acao=criados quando ambos os semestres são novos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })

    const result = await sincronizarSemestres('2026')

    expect(result.acao).toBe('criados')
    expect(result.ano_letivo).toBe('2026')
    expect(result.semestres).toHaveLength(2)
    expect(result.mensagem).toContain('criado')
  })

  it('retorna acao=atualizados quando semestres já existem (UPSERT retorna inserido=false)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })
      .mockResolvedValueOnce({ rows: [{ inserido: false }] })  // já existia
      .mockResolvedValueOnce({ rows: [{ inserido: false }] })  // já existia

    const result = await sincronizarSemestres('2026')

    expect(result.acao).toBe('atualizados')
    expect(result.mensagem).toContain('atualizado')
  })

  it('retorna semestres com numero, data_inicio, data_fim corretos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })

    const result = await sincronizarSemestres('2026')

    expect(result.semestres).toEqual([
      { numero: 1, data_inicio: '2026-02-01', data_fim: '2026-07-17' },
      { numero: 2, data_inicio: '2026-08-03', data_fim: '2026-12-18' },
    ])
  })
})

// ============================================================================
// Ordenação dos bimestres (independe da ordem no banco)
// ============================================================================

describe('sincronizarSemestres — ordenação de bimestres', () => {
  it('ordena bimestres por numero antes de derivar semestres', async () => {
    // Banco devolve fora de ordem
    const bimDesordenados = [
      BIMESTRES_2026[3], // 4º
      BIMESTRES_2026[1], // 2º
      BIMESTRES_2026[0], // 1º
      BIMESTRES_2026[2], // 3º
    ]

    mockQuery
      .mockResolvedValueOnce({ rows: bimDesordenados })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })

    const result = await sincronizarSemestres('2026')

    // Independente da ordem recebida, os semestres devem estar corretos
    expect(result.semestres![0].data_inicio).toBe('2026-02-01')
    expect(result.semestres![0].data_fim).toBe('2026-07-17')
    expect(result.semestres![1].data_inicio).toBe('2026-08-03')
    expect(result.semestres![1].data_fim).toBe('2026-12-18')
  })
})

// ============================================================================
// Uso de client externo (transação em curso)
// ============================================================================

describe('sincronizarSemestres — client externo', () => {
  it('usa o client fornecido em vez de pool quando passado como argumento', async () => {
    const clientMock = { query: vi.fn() }
    clientMock.query
      .mockResolvedValueOnce({ rows: BIMESTRES_2026 })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })
      .mockResolvedValueOnce({ rows: [{ inserido: true }] })

    await sincronizarSemestres('2026', clientMock as unknown as import('pg').PoolClient)

    // pool.query NÃO deve ter sido chamado
    expect(mockQuery).not.toHaveBeenCalled()
    // clientMock.query deve ter sido chamado 3 vezes
    expect(clientMock.query).toHaveBeenCalledTimes(3)
  })
})
