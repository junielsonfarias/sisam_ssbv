/**
 * Testes unitários — patrimonio.service
 *
 * Cobre:
 *  - cadastrarBem: estado_conservacao padrao 'bom', campos nulos
 *  - buscarBemPorTombo: encontrado, nao encontrado
 *  - listarBens: sem filtros, todos os filtros, limite max
 *  - registrarMovimentacao: transferencia, manutencao_envio, manutencao_retorno, baixa, reativacao, mudanca_estado_conservacao, bem nao encontrado
 *  - historicoBem
 *  - inventarioEscola
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import pool from '@/database/connection'
import {
  cadastrarBem,
  buscarBemPorTombo,
  listarBens,
  registrarMovimentacao,
  historicoBem,
  inventarioEscola,
} from '@/lib/services/patrimonio.service'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)

function criarClientFake(respostas: any[]) {
  let idx = 0
  const client = {
    query: vi.fn().mockImplementation(() => {
      const resp = respostas[idx] ?? { rows: [], rowCount: 0 }
      idx++
      return Promise.resolve(resp)
    }),
    release: vi.fn(),
  }
  mockConnect.mockResolvedValueOnce(client as any)
  return client
}

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// cadastrarBem
// ============================================================================

describe('cadastrarBem', () => {
  it('insere bem e retorna id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'bem-1' }], rowCount: 1 } as any)

    const id = await cadastrarBem({
      tombo: 'TOM-001',
      descricao: 'Cadeira escolar',
      categoria: 'mobiliario',
    })

    expect(id).toBe('bem-1')
  })

  it('usa estado_conservacao bom por padrao', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'bem-2' }], rowCount: 1 } as any)

    await cadastrarBem({
      tombo: 'TOM-002',
      descricao: 'Mesa',
      categoria: 'mobiliario',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[12]).toBe('bom')  // estado_conservacao
  })

  it('aceita estado_conservacao personalizado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'bem-3' }], rowCount: 1 } as any)

    await cadastrarBem({
      tombo: 'TOM-003',
      descricao: 'Computador antigo',
      categoria: 'eletronico',
      estado_conservacao: 'regular',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[12]).toBe('regular')
  })

  it('insere null para campos opcionais nao fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'bem-4' }], rowCount: 1 } as any)

    await cadastrarBem({
      tombo: 'TOM-004',
      descricao: 'Item basico',
      categoria: 'outro',
    })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[3]).toBeNull()   // marca
    expect(params[4]).toBeNull()   // modelo
    expect(params[5]).toBeNull()   // numero_serie
    expect(params[6]).toBeNull()   // valor_aquisicao
    expect(params[10]).toBeNull()  // escola_id
  })
})

// ============================================================================
// buscarBemPorTombo
// ============================================================================

describe('buscarBemPorTombo', () => {
  it('retorna bem com escola quando encontrado', async () => {
    const fakeBem = { id: 'bem-1', tombo: 'TOM-001', escola_nome: 'Escola A' }
    mockQuery.mockResolvedValueOnce({ rows: [fakeBem], rowCount: 1 } as any)

    const result = await buscarBemPorTombo('TOM-001')

    expect(result).not.toBeNull()
    expect(result!.tombo).toBe('TOM-001')
    expect(result!.escola_nome).toBe('Escola A')
  })

  it('retorna null quando tombo nao encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarBemPorTombo('TOM-999')

    expect(result).toBeNull()
  })
})

// ============================================================================
// listarBens
// ============================================================================

describe('listarBens', () => {
  it('lista bens sem filtros', async () => {
    const fakeBens = [{ id: 'bem-1', tombo: 'TOM-001' }]
    mockQuery.mockResolvedValueOnce({ rows: fakeBens, rowCount: 1 } as any)

    const result = await listarBens()

    expect(result).toHaveLength(1)
    // Sem WHERE deve haver apenas o LIMIT
    const params = mockQuery.mock.calls[0][1]!
    expect(params).toHaveLength(1)
    expect(params[0]).toBe(100)  // limite padrao
  })

  it('filtra por escola, categoria e status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarBens({ escolaId: 'esc-1', categoria: 'eletronico', status: 'ativo' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('b.escola_id = $')
    expect(sql).toContain('b.categoria = $')
    expect(sql).toContain('b.status = $')
    expect(params).toContain('esc-1')
    expect(params).toContain('eletronico')
    expect(params).toContain('ativo')
  })

  it('filtra por busca com ILIKE em descricao, tombo e numero_serie', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarBens({ busca: 'mesa' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ILIKE')
    expect(sql).toContain('b.descricao')
    expect(sql).toContain('b.tombo')
    expect(sql).toContain('b.numero_serie')
  })

  it('ignora busca com 2 chars ou menos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarBens({ busca: 'me' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ILIKE')
  })

  it('limita a 1000 quando limite excede maximo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarBens({ limite: 9999 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[params.length - 1]).toBe(1000)
  })
})

// ============================================================================
// registrarMovimentacao
// ============================================================================

describe('registrarMovimentacao', () => {
  it('registra transferencia e atualiza escola do bem', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },  // BEGIN
      { rows: [{ escola_id: 'esc-orig', sala_localizacao: 'Sala 1', estado_conservacao: 'bom', status: 'ativo' }], rowCount: 1 },  // SELECT bem FOR UPDATE
      { rows: [{ id: 'mov-1' }], rowCount: 1 },  // INSERT movimentacao
      { rows: [], rowCount: 1 },  // UPDATE bem (transferencia)
      { rows: [], rowCount: 0 },  // COMMIT
    ])

    const id = await registrarMovimentacao({
      bem_id: 'bem-1',
      tipo: 'transferencia',
      escola_destino_id: 'esc-dest',
      sala_destino: 'Sala 5',
      motivo: 'Redistribuicao de bens',
    })

    expect(id).toBe('mov-1')
    // Verifica UPDATE de transferencia
    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('UPDATE patrimonio_bens') && c[0].includes('escola_id')
    )
    expect(updateCall).toBeTruthy()
  })

  it('marca bem como em_manutencao no manutencao_envio', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ escola_id: 'esc-1', sala_localizacao: null, estado_conservacao: 'bom', status: 'ativo' }], rowCount: 1 },
      { rows: [{ id: 'mov-2' }], rowCount: 1 },
      { rows: [], rowCount: 1 },  // UPDATE status = em_manutencao
      { rows: [], rowCount: 0 },
    ])

    await registrarMovimentacao({
      bem_id: 'bem-1',
      tipo: 'manutencao_envio',
      motivo: 'Reparo necessario',
    })

    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes("status = 'em_manutencao'")
    )
    expect(updateCall).toBeTruthy()
  })

  it('reativa bem (status ativo) no manutencao_retorno', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ escola_id: 'esc-1', sala_localizacao: null, estado_conservacao: 'bom', status: 'em_manutencao' }], rowCount: 1 },
      { rows: [{ id: 'mov-3' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    await registrarMovimentacao({
      bem_id: 'bem-1',
      tipo: 'manutencao_retorno',
      motivo: 'Reparo concluido',
    })

    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes("status = 'ativo'") && !c[0].includes('baixado')
    )
    expect(updateCall).toBeTruthy()
  })

  it('marca bem como baixado no tipo baixa', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ escola_id: 'esc-1', sala_localizacao: null, estado_conservacao: 'inservivel', status: 'ativo' }], rowCount: 1 },
      { rows: [{ id: 'mov-4' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    await registrarMovimentacao({
      bem_id: 'bem-1',
      tipo: 'baixa',
      motivo: 'Bem inservivel',
    })

    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes("status = 'baixado'")
    )
    expect(updateCall).toBeTruthy()
  })

  it('atualiza estado_conservacao no tipo mudanca_estado_conservacao', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ escola_id: 'esc-1', sala_localizacao: null, estado_conservacao: 'bom', status: 'ativo' }], rowCount: 1 },
      { rows: [{ id: 'mov-5' }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    await registrarMovimentacao({
      bem_id: 'bem-1',
      tipo: 'mudanca_estado_conservacao',
      estado_novo: 'regular',
      motivo: 'Desgaste natural',
    })

    const updateCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('estado_conservacao = $2')
    )
    expect(updateCall).toBeTruthy()
    expect(updateCall![1][1]).toBe('regular')
  })

  it('lanca erro e faz rollback quando bem nao encontrado', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },   // BEGIN
      { rows: [], rowCount: 0 },   // SELECT FOR UPDATE (vazio)
      { rows: [], rowCount: 0 },   // ROLLBACK
    ])

    await expect(
      registrarMovimentacao({
        bem_id: 'bem-nao-existe',
        tipo: 'transferencia',
        motivo: 'Teste',
      })
    ).rejects.toThrow('Bem não encontrado')
  })
})

// ============================================================================
// historicoBem
// ============================================================================

describe('historicoBem', () => {
  it('retorna historico de movimentacoes do bem em ordem decrescente', async () => {
    const fakeHistorico = [
      { id: 'mov-2', tipo: 'transferencia', realizado_em: '2026-06-01', escola_destino_nome: 'Escola B' },
      { id: 'mov-1', tipo: 'manutencao_envio', realizado_em: '2026-03-15', escola_destino_nome: null },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeHistorico, rowCount: 2 } as any)

    const result = await historicoBem('bem-1')

    expect(result).toHaveLength(2)
    expect(result[0].tipo).toBe('transferencia')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE m.bem_id = $1')
    expect(params[0]).toBe('bem-1')
  })
})

// ============================================================================
// inventarioEscola
// ============================================================================

describe('inventarioEscola', () => {
  it('retorna resumo por categoria/estado/status da escola', async () => {
    const fakeInventario = [
      { categoria: 'mobiliario', estado_conservacao: 'bom', status: 'ativo', quantidade: '50', valor_total: '25000.00' },
      { categoria: 'eletronico', estado_conservacao: 'regular', status: 'ativo', quantidade: '10', valor_total: '50000.00' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeInventario, rowCount: 2 } as any)

    const result = await inventarioEscola('esc-1')

    expect(result).toHaveLength(2)
    expect(result[0].categoria).toBe('mobiliario')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE escola_id = $1')
    expect(params[0]).toBe('esc-1')
    expect(sql).toContain('GROUP BY categoria, estado_conservacao, status')
  })
})
