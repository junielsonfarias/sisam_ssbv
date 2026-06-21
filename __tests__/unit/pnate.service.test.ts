/**
 * Testes unitários/integração — lib/services/pnate.service.ts
 *
 * Cobre:
 *   cadastrarVeiculo — caminho feliz, defaults (vinculo='proprio', acessivel_pcd=false)
 *   listarVeiculos — filtros: ativo (default), vencidos
 *   cadastrarMotorista — normalização CPF, defaults
 *   listarMotoristas — filtros: ativos (default), vencidos
 *   vincularAlunoRota — caminho feliz, tipo_uso padrão
 *   listarRotas — filtros: ativa, escolaId
 *   alertasVencimento — retorna veículos e motoristas
 *   criarRota — transação, rollback em erro
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
  cadastrarVeiculo,
  listarVeiculos,
  cadastrarMotorista,
  listarMotoristas,
  vincularAlunoRota,
  listarRotas,
  alertasVencimento,
  criarRota,
} from '@/lib/services/pnate.service'

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
// cadastrarVeiculo
// ============================================================================

describe('cadastrarVeiculo', () => {
  it('retorna o id do veículo cadastrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'veic-001' }] })

    const id = await cadastrarVeiculo({
      placa: 'ABC1234',
      tipo: 'onibus',
      capacidade: 50,
    })

    expect(id).toBe('veic-001')
  })

  it('usa vinculo="proprio" por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'v1' }] })

    await cadastrarVeiculo({ placa: 'ABC1234', tipo: 'van', capacidade: 15 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[7]).toBe('proprio') // vinculo
  })

  it('usa acessivel_pcd=false por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'v2' }] })

    await cadastrarVeiculo({ placa: 'DEF5678', tipo: 'micro_onibus', capacidade: 30 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[11]).toBe(false) // acessivel_pcd
  })

  it('marca, modelo e observações são null quando omitidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'v3' }] })

    await cadastrarVeiculo({ placa: 'GHI9012', tipo: 'barco', capacidade: 20 })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[2]).toBeNull() // marca
    expect(params[3]).toBeNull() // modelo
    expect(params[12]).toBeNull() // observacoes
  })
})

// ============================================================================
// listarVeiculos
// ============================================================================

describe('listarVeiculos', () => {
  it('por padrão filtra apenas veículos ativos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarVeiculos()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ativo = TRUE')
  })

  it('adiciona filtro de vistoria vencida quando vencidos=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarVeiculos({ vencidos: true })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('vistoria_validade < CURRENT_DATE')
  })

  it('ativo=false remove filtro de ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarVeiculos({ ativo: false })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ativo = TRUE')
  })

  it('ordena por placa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarVeiculos()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ORDER BY placa')
  })
})

// ============================================================================
// cadastrarMotorista
// ============================================================================

describe('cadastrarMotorista', () => {
  it('retorna o id do motorista cadastrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'mot-001' }] })

    const id = await cadastrarMotorista({
      nome: 'José Silva',
      cpf: '123.456.789-00',
      cnh_numero: '12345',
      cnh_categoria: 'D',
      cnh_validade: '2028-12-31',
    })

    expect(id).toBe('mot-001')
  })

  it('normaliza CPF removendo pontuação', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm1' }] })

    await cadastrarMotorista({
      nome: 'Maria',
      cpf: '987.654.321-00',
      cnh_numero: '99999',
      cnh_categoria: 'B',
      cnh_validade: '2030-06-30',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[1]).toBe('98765432100') // CPF sem pontuação
  })

  it('usa vinculo="concursado" por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm2' }] })

    await cadastrarMotorista({
      nome: 'Pedro',
      cpf: '11122233344',
      cnh_numero: '88888',
      cnh_categoria: 'D',
      cnh_validade: '2027-06-30',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[7]).toBe('concursado') // vinculo
  })

  it('curso_escolar_validade e telefone são null quando omitidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'm3' }] })

    await cadastrarMotorista({
      nome: 'Ana',
      cpf: '55566677788',
      cnh_numero: '77777',
      cnh_categoria: 'D',
      cnh_validade: '2026-12-31',
    })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[5]).toBeNull() // curso_escolar_validade
    expect(params[6]).toBeNull() // telefone
  })
})

// ============================================================================
// listarMotoristas
// ============================================================================

describe('listarMotoristas', () => {
  it('por padrão filtra apenas motoristas ativos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMotoristas()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ativo = TRUE')
  })

  it('adiciona filtro de CNH/curso vencido quando vencidos=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMotoristas({ vencidos: true })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('cnh_validade < CURRENT_DATE')
  })

  it('ativos=false remove filtro de ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMotoristas({ ativos: false })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ativo = TRUE')
  })
})

// ============================================================================
// vincularAlunoRota
// ============================================================================

describe('vincularAlunoRota', () => {
  it('retorna o id do vínculo criado/atualizado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'vinc-001' }] })

    const id = await vincularAlunoRota({
      aluno_id: 'a1',
      rota_id: 'rota-1',
    })

    expect(id).toBe('vinc-001')
  })

  it('usa tipo_uso="ida_volta" por padrão', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'v1' }] })

    await vincularAlunoRota({ aluno_id: 'a1', rota_id: 'r1' })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[3]).toBe('ida_volta') // tipo_uso
  })

  it('usa ON CONFLICT para upsert do vínculo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'v2' }] })

    await vincularAlunoRota({ aluno_id: 'a1', rota_id: 'r1' })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ON CONFLICT')
    expect(sql).toContain('DO UPDATE')
  })
})

// ============================================================================
// listarRotas
// ============================================================================

describe('listarRotas', () => {
  it('por padrão filtra rotas ativas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarRotas()

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('ativa = TRUE')
  })

  it('adiciona filtro por escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarRotas({ escolaId: 'escola-abc' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('escola-abc')
    expect(sql).toContain('ANY(escolas_ids)')
  })

  it('ativa=false remove o filtro de ativa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarRotas({ ativa: false })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('ativa = TRUE')
  })

  it('retorna dados com contagem de alunos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'r1', codigo: 'R001', qtd_alunos: '25' }],
    })

    const result = await listarRotas()
    expect(result[0].qtd_alunos).toBe('25')
  })
})

// ============================================================================
// alertasVencimento
// ============================================================================

describe('alertasVencimento', () => {
  it('retorna veículos e motoristas com vencimentos próximos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'v1', placa: 'ABC1234', status_vistoria: 'vencida' }] }) // veículos
      .mockResolvedValueOnce({ rows: [{ id: 'm1', nome: 'José', alerta: 'cnh_vencida' }] }) // motoristas

    const result = await alertasVencimento()

    expect(result.veiculos).toHaveLength(1)
    expect(result.motoristas).toHaveLength(1)
    expect(result.veiculos[0].status_vistoria).toBe('vencida')
    expect(result.motoristas[0].alerta).toBe('cnh_vencida')
  })

  it('retorna arrays vazios quando não há vencimentos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // veículos
      .mockResolvedValueOnce({ rows: [] }) // motoristas

    const result = await alertasVencimento()

    expect(result.veiculos).toHaveLength(0)
    expect(result.motoristas).toHaveLength(0)
  })

  it('faz duas queries (veículos + motoristas)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })

    await alertasVencimento()

    expect(mockQuery).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// criarRota — transação
// ============================================================================

describe('criarRota', () => {
  it('retorna o id da rota criada', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'rota-001' }] }) // INSERT rota
        .mockResolvedValueOnce({}) // INSERT parada
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    const id = await criarRota({
      codigo: 'R001',
      descricao: 'Rota Norte',
      escolas_ids: ['e1', 'e2'],
      paradas: [{ ordem: 1, endereco: 'Rua A, 100' }],
    })

    expect(id).toBe('rota-001')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })

  it('insere múltiplas paradas na rota', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'rota-002' }] }) // INSERT rota
        .mockResolvedValueOnce({}) // INSERT parada 1
        .mockResolvedValueOnce({}) // INSERT parada 2
        .mockResolvedValueOnce({}) // INSERT parada 3
        .mockResolvedValueOnce({}) // COMMIT
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await criarRota({
      codigo: 'R002',
      descricao: 'Rota Sul',
      escolas_ids: ['e1'],
      paradas: [
        { ordem: 1, endereco: 'Ponto A' },
        { ordem: 2, endereco: 'Ponto B' },
        { ordem: 3, endereco: 'Ponto C' },
      ],
    })

    // BEGIN + rota + 3 paradas + COMMIT = 6 queries
    expect(clientMock.query).toHaveBeenCalledTimes(6)
  })

  it('faz rollback quando ocorre erro na inserção das paradas', async () => {
    const clientMock = makeMockClient({
      query: vi.fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'rota-003' }] }) // INSERT rota
        .mockRejectedValueOnce(new Error('Erro ao inserir parada')) // parada falha
        .mockResolvedValueOnce({}) // ROLLBACK
    })
    mockConnect.mockResolvedValueOnce(clientMock)

    await expect(criarRota({
      codigo: 'R003',
      descricao: 'Rota Com Erro',
      escolas_ids: ['e1'],
      paradas: [{ ordem: 1, endereco: 'Rua Problemática' }],
    })).rejects.toThrow('Erro ao inserir parada')

    const queryNames = clientMock.query.mock.calls.map((c: unknown[]) => c[0])
    expect(queryNames).toContain('ROLLBACK')
    expect(clientMock.release).toHaveBeenCalledTimes(1)
  })
})
