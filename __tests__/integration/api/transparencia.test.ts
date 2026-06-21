/**
 * Testes de integração — GET /api/transparencia
 *
 * Endpoint público (sem auth): dados agregados por escola para transparência.
 * Cobre: caminho feliz, cache, ano default, erro de banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { GET } from '@/app/api/transparencia/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

const fakeEscolas = [
  {
    id: 'escola-1',
    nome: 'EM Teste A',
    codigo: 'EA01',
    endereco: 'Rua A, 1',
    codigo_inep: '12345',
    localizacao: 'urbana',
    situacao_funcionamento: 'ativa',
    agua_potavel: true,
    energia_eletrica: true,
    internet: true,
    biblioteca: false,
    quadra_esportiva: false,
    acessibilidade_deficiente: false,
    alimentacao_escolar: true,
    polo_nome: 'Polo Central',
    total_alunos: '120',
    total_turmas: '6',
  },
]

describe('GET /api/transparencia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 200 com lista de escolas e ano_letivo', async () => {
    mockPool.query.mockResolvedValue({ rows: fakeEscolas, rowCount: 1 } as any)

    const request = createRequest('http://localhost:3000/api/transparencia?ano_letivo=2026')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.escolas).toHaveLength(1)
    expect(body.escolas[0].nome).toBe('EM Teste A')
    expect(body.ano_letivo).toBe('2026')
  })

  it('usa ano corrente como default quando nao informado', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/transparencia')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ano_letivo).toBe(String(new Date().getFullYear()))
  })

  it('retorna array vazio quando nao ha escolas ativas', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/transparencia?ano_letivo=2020')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.escolas).toEqual([])
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database connection failed'))

    const request = createRequest('http://localhost:3000/api/transparencia')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.mensagem).toBeDefined()
  })

  it('chama pool.query com o ano_letivo correto como parametro', async () => {
    mockPool.query.mockResolvedValue({ rows: fakeEscolas, rowCount: 1 } as any)

    const request = createRequest('http://localhost:3000/api/transparencia?ano_letivo=2025')
    await GET(request)

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('FROM escolas'),
      ['2025']
    )
  })
})
