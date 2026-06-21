/**
 * Testes unitários/integração — lib/services/pdde.service.ts
 *
 * Cobre:
 *   registrarOrcamento — caminho feliz
 *   listarOrcamentosEscola — com e sem anoLetivo
 *   listarDespesas — passagem de parâmetro
 *   consultarSaldos — agregação client-side (parseFloat, aritmética, percentual)
 *   listarTiposVerba — simples
 *   registrarDespesa — caminho feliz, saldo insuficiente, orçamento não encontrado, rollback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

import pool from '@/database/connection'
import {
  registrarOrcamento,
  listarOrcamentosEscola,
  listarDespesas,
  consultarSaldos,
  listarTiposVerba,
  registrarDespesa,
} from '@/lib/services/pdde.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>
const mockConnect = pool.connect as ReturnType<typeof vi.fn>

function makeMockClient(overrides: { query?: ReturnType<typeof vi.fn> } = {}) {
  const q = overrides.query ?? vi.fn()
  return { query: q, release: vi.fn() }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// registrarOrcamento
// ============================================================================

describe('registrarOrcamento', () => {
  it('retorna o id do orçamento criado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'orc-001' }] })

    const id = await registrarOrcamento({
      escola_id: 'escola-1',
      ano_letivo: '2026',
      tipo_verba_id: 'verba-1',
      valor_recebido: 15000,
      data_credito: '2026-03-01',
    })

    expect(id).toBe('orc-001')
  })

  it('passa campos opcionais como null quando omitidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'orc-002' }] })

    await registrarOrcamento({
      escola_id: 'escola-1',
      ano_letivo: '2026',
      tipo_verba_id: 'v1',
      valor_recebido: 5000,
      data_credito: '2026-03-01',
    })

    const [, params] = mockQuery.mock.calls[0]
    // conta_bancaria e observacoes e criado_por devem ser null
    expect(params[5]).toBeNull()  // conta_bancaria
    expect(params[6]).toBeNull()  // observacoes
    expect(params[7]).toBeNull()  // criado_por
  })
})

// ============================================================================
// listarOrcamentosEscola
// ============================================================================

describe('listarOrcamentosEscola', () => {
  it('sem anoLetivo: busca todos os orçamentos da escola', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarOrcamentosEscola('escola-abc')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(1)
    expect(params[0]).toBe('escola-abc')
    expect(sql).not.toContain('ano_letivo = $2')
  })

  it('com anoLetivo: adiciona filtro de ano', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarOrcamentosEscola('escola-abc', '2026')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toHaveLength(2)
    expect(params[1]).toBe('2026')
    expect(sql).toContain('ano_letivo = $2')
  })

  it('ordena por data_credito DESC', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarOrcamentosEscola('e1')

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('data_credito DESC')
  })
})

// ============================================================================
// listarDespesas
// ============================================================================

describe('listarDespesas', () => {
  it('retorna despesas do orçamento em ordem cronológica inversa', async () => {
    const rows = [
      { id: 'd1', descricao: 'Pintura', valor: '3000' },
      { id: 'd2', descricao: 'Cadeiras', valor: '2000' },
    ]
    mockQuery.mockResolvedValueOnce({ rows })

    const result = await listarDespesas('orc-123')

    expect(result).toHaveLength(2)
    expect(result[0].descricao).toBe('Pintura')
  })

  it('passa orcamentoId como parâmetro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarDespesas('orc-xyz')

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('orc-xyz')
  })
})

// ============================================================================
// consultarSaldos — lógica de agregação client-side (parseFloat, percentual)
// ============================================================================

describe('consultarSaldos', () => {
  it('soma total_recebido e total_executado dos orçamentos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { valor_recebido: '10000', valor_executado: '3000', natureza: 'custeio', verba_nome: 'V1' },
        { valor_recebido: '5000',  valor_executado: '2500', natureza: 'capital', verba_nome: 'V2' },
      ],
    })

    const result = await consultarSaldos('escola-1', '2026')

    expect(result.resumo.total_recebido).toBe(15000)
    expect(result.resumo.total_executado).toBe(5500)
    expect(result.resumo.saldo_total).toBe(9500)
  })

  it('calcula percentual de execução corretamente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { valor_recebido: '1000', valor_executado: '250', natureza: 'custeio', verba_nome: 'V1' },
      ],
    })

    const result = await consultarSaldos('escola-1', '2026')

    // 250/1000 = 25%
    expect(result.resumo.execucao_percentual).toBe(25)
  })

  it('retorna execucao_percentual=0 quando total_recebido=0 (sem divisão por zero)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { valor_recebido: '0', valor_executado: '0', natureza: 'custeio', verba_nome: 'V1' },
      ],
    })

    const result = await consultarSaldos('escola-1', '2026')

    expect(result.resumo.execucao_percentual).toBe(0)
    // Não deve lançar NaN ou Infinity
    expect(Number.isFinite(result.resumo.execucao_percentual)).toBe(true)
  })

  it('arredonda valores para 2 casas decimais (erro de ponto flutuante)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { valor_recebido: '1000.10', valor_executado: '333.33', natureza: 'custeio', verba_nome: 'V1' },
        { valor_recebido: '0.05',    valor_executado: '0.02',   natureza: 'capital', verba_nome: 'V2' },
      ],
    })

    const result = await consultarSaldos('escola-1', '2026')

    // Verifica que não há imprecisão de ponto flutuante absurda (ex: 1000.1500000001)
    expect(result.resumo.total_recebido.toString()).not.toContain('00000')
    expect(result.resumo.total_executado.toString()).not.toContain('00000')
  })

  it('retorna orçamentos e resumo na mesma resposta', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ valor_recebido: '5000', valor_executado: '1000', natureza: 'custeio', verba_nome: 'V1' }],
    })

    const result = await consultarSaldos('e1', '2026')

    expect(result).toHaveProperty('orcamentos')
    expect(result).toHaveProperty('resumo')
    expect(Array.isArray(result.orcamentos)).toBe(true)
  })
})

// ============================================================================
// listarTiposVerba
// ============================================================================

describe('listarTiposVerba', () => {
  it('retorna tipos de verba ordenados por id', async () => {
    const tipos = [{ id: 'T1', nome: 'Custeio' }, { id: 'T2', nome: 'Capital' }]
    mockQuery.mockResolvedValueOnce({ rows: tipos })

    const result = await listarTiposVerba()

    expect(result).toEqual(tipos)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ORDER BY id')
  })
})

// ============================================================================
// registrarDespesa — transação com validação de saldo
// ============================================================================

describe('registrarDespesa', () => {
  it('registra despesa quando há saldo suficiente', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'orc-1', valor_recebido: '5000' }] }) // SELECT orc
        .mockResolvedValueOnce({ rows: [{ executado: '1000' }] }) // SELECT executado
        .mockResolvedValueOnce({ rows: [{ id: 'desp-001' }] }) // INSERT despesa
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    const id = await registrarDespesa({
      orcamento_id: 'orc-1',
      data_despesa: '2026-06-01',
      descricao: 'Tintas para pintura',
      valor: 500,
    })

    expect(id).toBe('desp-001')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('lança erro quando orçamento não é encontrado', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // orçamento não existe
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarDespesa({
      orcamento_id: 'inexistente',
      data_despesa: '2026-06-01',
      descricao: 'Compra',
      valor: 100,
    })).rejects.toThrow('Orçamento não encontrado')

    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ROLLBACK')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('lança erro de saldo insuficiente quando despesa excede saldo disponível', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'orc-2', valor_recebido: '1000' }] }) // orc
        .mockResolvedValueOnce({ rows: [{ executado: '950' }] }) // executado = 950
        // saldo = 1000 - 950 = 50; despesa = 200 > 50 → erro
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(registrarDespesa({
      orcamento_id: 'orc-2',
      data_despesa: '2026-06-01',
      descricao: 'Material',
      valor: 200,
    })).rejects.toThrow('Saldo insuficiente')

    const calls = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('ROLLBACK')
  })

  it('mensagem de saldo insuficiente inclui valor disponível e valor da despesa', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'orc-3', valor_recebido: '500' }] })
        .mockResolvedValueOnce({ rows: [{ executado: '400' }] }) // saldo = 100
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    try {
      await registrarDespesa({ orcamento_id: 'orc-3', data_despesa: '2026-06-01', descricao: 'X', valor: 200 })
    } catch (e) {
      const msg = (e as Error).message
      expect(msg).toContain('100.00')  // saldo disponível
      expect(msg).toContain('200.00')  // valor da despesa
    }
  })

  it('normaliza CNPJ removendo pontuação antes de gravar', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'orc-4', valor_recebido: '10000' }] })
        .mockResolvedValueOnce({ rows: [{ executado: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'desp-002' }] })
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await registrarDespesa({
      orcamento_id: 'orc-4',
      data_despesa: '2026-06-01',
      descricao: 'Pintura',
      fornecedor_cnpj: '12.345.678/0001-90',
      valor: 500,
    })

    // Procura a chamada de INSERT da despesa (4ª query: BEGIN, orc, executado, INSERT)
    const insertCall = clientMock.query.mock.calls[3]
    const params = insertCall[1] as unknown[]
    // fornecedor_cnpj é o 5º parâmetro ($5) e deve estar sem pontuação
    expect(params[4]).toBe('12345678000190')
  })
})
