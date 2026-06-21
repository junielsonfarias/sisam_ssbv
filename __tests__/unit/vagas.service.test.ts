/**
 * Testes unitários — vagas.service
 *
 * Cobre:
 *  - buscarFilaEspera: sem filtros, com filtros, calculo de resumo
 *  - adicionarNaFila: caminho feliz, ja na fila, ja matriculado
 *  - atualizarStatusFila: convocar, desistente, matriculado, nao encontrado
 *  - removerDaFila: caminho feliz, nao encontrado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

// withTransaction usa pool.connect internamente
vi.mock('@/lib/database/with-transaction', () => ({
  withTransaction: vi.fn(async (fn: (client: unknown) => Promise<void>) => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    }
    return fn(client)
  }),
}))

import pool from '@/database/connection'
import {
  buscarFilaEspera,
  adicionarNaFila,
  atualizarStatusFila,
  removerDaFila,
} from '@/lib/services/vagas.service'
import { withTransaction } from '@/lib/database/with-transaction'

const mockQuery = vi.mocked(pool.query)
const mockWithTransaction = vi.mocked(withTransaction)

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// buscarFilaEspera
// ============================================================================

describe('buscarFilaEspera', () => {
  const filaRows = [
    { id: 'f1', status: 'aguardando', posicao: 1, aluno_nome: 'João', escola_nome: 'Escola A' },
    { id: 'f2', status: 'convocado', posicao: 2, aluno_nome: 'Maria', escola_nome: 'Escola A' },
    { id: 'f3', status: 'matriculado', posicao: 0, aluno_nome: 'Pedro', escola_nome: 'Escola A' },
    { id: 'f4', status: 'desistente', posicao: 0, aluno_nome: 'Ana', escola_nome: 'Escola A' },
  ]

  it('retorna itens e resumo correto sem filtros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: filaRows, rowCount: 4 } as any)

    const result = await buscarFilaEspera({})

    expect(result.itens).toHaveLength(4)
    expect(result.resumo.total).toBe(4)
    expect(result.resumo.aguardando).toBe(1)
    expect(result.resumo.convocados).toBe(1)
    expect(result.resumo.matriculados).toBe(1)
    expect(result.resumo.desistentes).toBe(1)
  })

  it('retorna fila vazia com resumo zerado quando nao ha itens', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarFilaEspera({})

    expect(result.itens).toHaveLength(0)
    expect(result.resumo.total).toBe(0)
    expect(result.resumo.aguardando).toBe(0)
  })

  it('filtra por turmaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarFilaEspera({ turmaId: 'turma-1' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('fe.turma_id')
    expect(params).toContain('turma-1')
  })

  it('filtra por status quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarFilaEspera({ status: 'aguardando' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('fe.status')
    expect(params).toContain('aguardando')
  })

  it('inclui filtro de polo quando poloId fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarFilaEspera({ poloId: 'polo-1' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('e.polo_id')
    expect(params).toContain('polo-1')
  })
})

// ============================================================================
// adicionarNaFila
// ============================================================================

describe('adicionarNaFila', () => {
  it('adiciona aluno na posicao correta quando nao esta na fila e nao esta matriculado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)           // verifica fila
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)           // verifica matriculado
      .mockResolvedValueOnce({ rows: [{ proxima: 3 }], rowCount: 1 } as any)  // proxima posicao
      .mockResolvedValueOnce({ rows: [{ id: 'fila-1' }], rowCount: 1 } as any)  // INSERT

    const result = await adicionarNaFila({
      alunoId: 'aluno-1',
      turmaId: 'turma-1',
      escolaId: 'esc-1',
      observacao: 'Preferencia por periodo vespertino',
    })

    expect(result.id).toBe('fila-1')
    expect(result.posicao).toBe(3)
  })

  it('primeira posicao quando fila esta vazia (proxima = 1)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ proxima: 1 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'fila-novo' }], rowCount: 1 } as any)

    const result = await adicionarNaFila({
      alunoId: 'aluno-2',
      turmaId: 'turma-1',
      escolaId: 'esc-1',
    })

    expect(result.posicao).toBe(1)
  })

  it('lanca erro quando aluno ja esta na fila (status aguardando ou convocado)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'fila-existe', status: 'aguardando' }],
      rowCount: 1,
    } as any)

    await expect(
      adicionarNaFila({ alunoId: 'aluno-1', turmaId: 'turma-1', escolaId: 'esc-1' })
    ).rejects.toThrow('Aluno já está na fila desta turma')
  })

  it('lanca erro quando aluno ja esta matriculado na turma', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // nao esta na fila
      .mockResolvedValueOnce({ rows: [{ id: 'aluno-1' }], rowCount: 1 } as any)  // ja matriculado

    await expect(
      adicionarNaFila({ alunoId: 'aluno-1', turmaId: 'turma-1', escolaId: 'esc-1' })
    ).rejects.toThrow('Aluno já está matriculado nesta turma')
  })
})

// ============================================================================
// atualizarStatusFila
// ============================================================================

describe('atualizarStatusFila', () => {
  it('convoca aluno com sucesso (status convocado)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ aluno_id: 'a1', turma_id: 't1', escola_id: 'e1', serie: '5', ano_letivo: '2026' }],
      rowCount: 1,
    } as any)

    mockWithTransaction.mockImplementationOnce(async (fn: any) => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)  // UPDATE fila
      }
      return fn(client)
    })

    const result = await atualizarStatusFila('fila-1', 'convocado', 'Vaga disponivel')

    expect(result.mensagem).toContain('convocado')
  })

  it('lanca erro quando item nao encontrado na fila', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(
      atualizarStatusFila('fila-nao-existe', 'convocado')
    ).rejects.toThrow('Item não encontrado na fila')
  })

  it('matricula aluno e vincula a turma com verificacao de capacidade', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ aluno_id: 'a1', turma_id: 't1', escola_id: 'e1', serie: '5', ano_letivo: '2026' }],
      rowCount: 1,
    } as any)

    mockWithTransaction.mockImplementationOnce(async (fn: any) => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)  // UPDATE fila
          .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)  // FOR UPDATE
          .mockResolvedValueOnce({ rows: [{ total: 25 }], rowCount: 1 } as any)  // ocupacao
          .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)  // UPDATE alunos
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // reordenar
      }
      return fn(client)
    })

    const result = await atualizarStatusFila('fila-1', 'matriculado')

    expect(result.mensagem).toContain('matriculado')
  })

  it('lanca erro quando turma sem vagas (capacidade excedida)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ aluno_id: 'a1', turma_id: 't1', escola_id: 'e1', serie: '5', ano_letivo: '2026' }],
      rowCount: 1,
    } as any)

    mockWithTransaction.mockImplementationOnce(async (fn: any) => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)            // UPDATE fila
          .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)  // FOR UPDATE
          .mockResolvedValueOnce({ rows: [{ total: 30 }], rowCount: 1 } as any)  // ocupacao = cheio
      }
      return fn(client)
    })

    await expect(
      atualizarStatusFila('fila-1', 'matriculado')
    ).rejects.toThrow('Turma sem vagas disponíveis')
  })
})

// ============================================================================
// removerDaFila
// ============================================================================

describe('removerDaFila', () => {
  it('remove aluno da fila e reordena posicoes', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ turma_id: 't1', escola_id: 'e1' }],
      rowCount: 1,
    } as any)

    mockWithTransaction.mockImplementationOnce(async (fn: any) => {
      const client = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)  // DELETE
          .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // REORDENAR
      }
      return fn(client)
    })

    // Nao deve lancar erro
    await expect(removerDaFila('fila-1')).resolves.toBeUndefined()
  })

  it('lanca erro quando item nao encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(removerDaFila('fila-nao-existe')).rejects.toThrow('Item não encontrado')
  })
})
