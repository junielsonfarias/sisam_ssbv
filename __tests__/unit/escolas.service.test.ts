/**
 * Testes unitários — lib/services/escolas.service.ts
 *
 * Cobre: buscarEscolaDetalhada, verificarVinculosEscola, excluirEscola.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/database/with-transaction', () => ({
  withTransaction: vi.fn(async (fn: (client: any) => any) => {
    return fn(mockClient)
  }),
}))

import pool from '@/database/connection'
import {
  buscarEscolaDetalhada,
  verificarVinculosEscola,
  excluirEscola,
} from '@/lib/services/escolas.service'

const mockQuery = vi.mocked(pool.query)

const mockClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
})

// =============================================================================
// buscarEscolaDetalhada
// =============================================================================

describe('buscarEscolaDetalhada', () => {
  it('retorna escola com contagens parseadas como número', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'e1', nome: 'Escola A', codigo: 'COD1', polo_id: 'p1', polo_nome: 'Polo Norte',
        total_turmas: '3', total_alunos: '45', total_pcd: '2', ativo: true,
      }],
      rowCount: 1,
    } as any)

    const result = await buscarEscolaDetalhada('e1', '2026')

    expect(result).not.toBeNull()
    expect(result!.total_turmas).toBe(3)
    expect(result!.total_alunos).toBe(45)
    expect(result!.total_pcd).toBe(2)
    expect(result!.polo_nome).toBe('Polo Norte')
    expect(mockQuery.mock.calls[0][1]).toEqual(['e1', '2026'])
  })

  it('usa ano corrente quando anoLetivo não é fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const anoCorrente = new Date().getFullYear().toString()
    await buscarEscolaDetalhada('e1')

    expect(mockQuery.mock.calls[0][1]).toContain(anoCorrente)
  })

  it('retorna null quando escola não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarEscolaDetalhada('escola-inexistente')

    expect(result).toBeNull()
  })

  it('trata contagens zeradas corretamente (parseInt de "0")', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'e2', nome: 'Escola B', total_turmas: '0', total_alunos: '0', total_pcd: '0',
      }],
      rowCount: 1,
    } as any)

    const result = await buscarEscolaDetalhada('e2')

    expect(result!.total_turmas).toBe(0)
    expect(result!.total_alunos).toBe(0)
    expect(result!.total_pcd).toBe(0)
  })
})

// =============================================================================
// verificarVinculosEscola
// =============================================================================

describe('verificarVinculosEscola', () => {
  const rowSemVinculos = {
    total_alunos: '0', total_turmas: '0', total_resultados: '0',
    total_consolidados: '0', total_usuarios: '0', total_notas: '0',
    total_frequencia: '0', total_documentos: '0',
  }

  it('retorna temVinculos=false quando escola está vazia', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [rowSemVinculos], rowCount: 1 } as any)

    const result = await verificarVinculosEscola('e1')

    expect(result.temVinculos).toBe(false)
    expect(result.totalAlunos).toBe(0)
    expect(result.totalTurmas).toBe(0)
  })

  it('retorna temVinculos=true quando há alunos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_alunos: '5' }], rowCount: 1,
    } as any)

    const result = await verificarVinculosEscola('e1')

    expect(result.temVinculos).toBe(true)
    expect(result.totalAlunos).toBe(5)
  })

  it('retorna temVinculos=true quando há notas_escolares', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_notas: '10' }], rowCount: 1,
    } as any)

    const result = await verificarVinculosEscola('e1')

    expect(result.temVinculos).toBe(true)
    expect(result.totalNotas).toBe(10)
  })

  it('retorna temVinculos=true quando há frequência', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_frequencia: '20' }], rowCount: 1,
    } as any)

    const result = await verificarVinculosEscola('e1')

    expect(result.temVinculos).toBe(true)
    expect(result.totalFrequencia).toBe(20)
  })

  it('retorna temVinculos=true quando há documentos emitidos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_documentos: '3' }], rowCount: 1,
    } as any)

    const result = await verificarVinculosEscola('e1')

    expect(result.temVinculos).toBe(true)
  })
})

// =============================================================================
// excluirEscola
// =============================================================================

describe('excluirEscola', () => {
  const rowSemVinculos = {
    total_alunos: '0', total_turmas: '0', total_resultados: '0',
    total_consolidados: '0', total_usuarios: '0', total_notas: '0',
    total_frequencia: '0', total_documentos: '0',
  }

  it('faz soft delete (ativo=false) quando escola não tem vínculos', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [rowSemVinculos], rowCount: 1 } as any) // verificação
      .mockResolvedValueOnce({ rows: [{ nome: 'Escola A' }], rowCount: 1 } as any) // UPDATE

    const result = await excluirEscola('e1')

    expect(result.sucesso).toBe(true)
    expect(result.mensagem).toMatch(/desativada com sucesso/)

    // UPDATE deve usar ativo = false, não DELETE
    const chamadas = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)
    const updateSql = chamadas.find(s => /UPDATE escolas/i.test(s))
    expect(updateSql).toBeDefined()
    expect(updateSql).toMatch(/ativo = false/)
    expect(chamadas.some(s => /DELETE FROM escolas/i.test(s))).toBe(false)
  })

  it('bloqueia exclusão quando escola tem alunos (retorna sucesso=false + vinculos)', async () => {
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_alunos: '5', total_turmas: '2' }], rowCount: 1,
    } as any)

    const result = await excluirEscola('e1')

    expect(result.sucesso).toBe(false)
    expect(result.mensagem).toMatch(/vínculos pedagógicos/)
    expect(result.vinculos?.totalAlunos).toBe(5)
    expect(result.vinculos?.totalTurmas).toBe(2)
  })

  it('bloqueia exclusão quando escola tem notas (novo bloqueio — bug #16 auditoria)', async () => {
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_notas: '50' }], rowCount: 1,
    } as any)

    const result = await excluirEscola('e1')

    expect(result.sucesso).toBe(false)
    expect(result.vinculos?.totalNotas).toBe(50)
  })

  it('bloqueia exclusão quando escola tem frequência', async () => {
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_frequencia: '100' }], rowCount: 1,
    } as any)

    const result = await excluirEscola('e1')

    expect(result.sucesso).toBe(false)
    expect(result.vinculos?.totalFrequencia).toBe(100)
  })

  it('bloqueia exclusão quando escola tem documentos emitidos', async () => {
    mockClient.query.mockResolvedValueOnce({
      rows: [{ ...rowSemVinculos, total_documentos: '3' }], rowCount: 1,
    } as any)

    const result = await excluirEscola('e1')

    expect(result.sucesso).toBe(false)
  })

  it('retorna sucesso=false com mensagem "Escola não encontrada" quando UPDATE não encontra a linha', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [rowSemVinculos], rowCount: 1 } as any) // verificação OK
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)               // UPDATE sem resultado

    const result = await excluirEscola('escola-fantasma')

    expect(result.sucesso).toBe(false)
    expect(result.mensagem).toMatch(/não encontrada/)
  })
})
