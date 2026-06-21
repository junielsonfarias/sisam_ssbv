/**
 * Testes de integração — GET /api/eventos
 *
 * Endpoint público (sem auth). Filtra por mes e ano.
 * Cobre: caminho feliz, filtro por mes, ano default, validação, erro de banco.
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

import { GET } from '@/app/api/eventos/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

const fakeEventos = [
  {
    id: 'ev-1',
    titulo: 'Reunião Pedagógica',
    descricao: 'Reunião mensal',
    tipo: 'institucional',
    data_inicio: '2026-03-15T08:00:00Z',
    data_fim: '2026-03-15T12:00:00Z',
    local: 'Auditório',
  },
]

describe('GET /api/eventos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 200 com lista de eventos para mes e ano válidos', async () => {
    mockPool.query.mockResolvedValue({ rows: fakeEventos, rowCount: 1 } as any)

    const request = createRequest('http://localhost:3000/api/eventos?mes=3&ano=2026')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.eventos).toHaveLength(1)
    expect(body.eventos[0].titulo).toBe('Reunião Pedagógica')
  })

  it('retorna 200 sem filtro de mes (todos os eventos do ano)', async () => {
    mockPool.query.mockResolvedValue({ rows: fakeEventos, rowCount: 1 } as any)

    const request = createRequest('http://localhost:3000/api/eventos?ano=2026')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.eventos).toBeDefined()
  })

  it('usa ano corrente como default quando nao informado', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/eventos')
    const response = await GET(request)

    expect(response.status).toBe(200)
    // Verifica que a query foi chamada com o ano corrente
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([new Date().getFullYear()])
    )
  })

  it('retorna 400 para mes invalido — 0', async () => {
    const request = createRequest('http://localhost:3000/api/eventos?mes=0&ano=2026')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('ês')
  })

  it('retorna 400 para mes invalido — 13', async () => {
    const request = createRequest('http://localhost:3000/api/eventos?mes=13&ano=2026')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('ês')
  })

  it('retorna 400 para mes nao-numérico', async () => {
    const request = createRequest('http://localhost:3000/api/eventos?mes=abc&ano=2026')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('retorna 200 para mes valido nos limites — 1 e 12', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const req1 = createRequest('http://localhost:3000/api/eventos?mes=1&ano=2026')
    const res1 = await GET(req1)
    expect(res1.status).toBe(200)

    const req12 = createRequest('http://localhost:3000/api/eventos?mes=12&ano=2026')
    const res12 = await GET(req12)
    expect(res12.status).toBe(200)
  })

  it('retorna array vazio quando nao ha eventos', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/eventos?mes=1&ano=2025')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.eventos).toEqual([])
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Connection refused'))

    const request = createRequest('http://localhost:3000/api/eventos?mes=3&ano=2026')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.mensagem).toBeDefined()
  })

  it('inclui mes na query SQL quando informado', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/eventos?mes=6&ano=2026')
    await GET(request)

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('MONTH'),
      expect.arrayContaining([2026, 6])
    )
  })

  it('NAO inclui mes na query SQL quando mes e string vazia', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/eventos?mes=&ano=2026')
    const response = await GET(request)

    // mes vazio não deve gerar 400
    expect(response.status).toBe(200)
    // A query deve conter apenas YEAR, não MONTH
    const callArgs = mockPool.query.mock.calls[0]
    expect(callArgs[0]).not.toContain('MONTH')
  })
})
