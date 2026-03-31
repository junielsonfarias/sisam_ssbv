import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
}))

import { GET } from '@/app/api/publicacoes/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/publicacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna lista de publicacoes', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // COUNT query
        return Promise.resolve({ rows: [{ count: '2' }], rowCount: 1 } as any)
      }
      // Data query
      return Promise.resolve({
        rows: [
          { id: '1', tipo: 'Portaria', numero: '001/2026', titulo: 'Portaria Teste', orgao: 'SEMED', data_publicacao: '2026-01-15', url_arquivo: null },
          { id: '2', tipo: 'Resolucao', numero: '002/2026', titulo: 'Resolucao Teste', orgao: 'CME', data_publicacao: '2026-02-01', url_arquivo: null },
        ],
        rowCount: 2,
      } as any)
    })

    const request = createRequest('http://localhost:3000/api/publicacoes')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.publicacoes).toBeDefined()
    expect(body.publicacoes.length).toBe(2)
    expect(body.total).toBe(2)
  })

  it('suporta filtro por tipo', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve({ rows: [{ count: '1' }], rowCount: 1 } as any)
      return Promise.resolve({
        rows: [{ id: '1', tipo: 'Portaria', numero: '001/2026', titulo: 'Portaria Teste', orgao: 'SEMED', data_publicacao: '2026-01-15', url_arquivo: null }],
        rowCount: 1,
      } as any)
    })

    const request = createRequest('http://localhost:3000/api/publicacoes?tipo=Portaria')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.publicacoes).toBeDefined()
  })

  it('suporta paginacao com limit', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any)
      return Promise.resolve({ rows: [], rowCount: 0 } as any)
    })

    const request = createRequest('http://localhost:3000/api/publicacoes?limite=5')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.publicacoes).toEqual([])
    expect(body.total).toBe(0)
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database error'))

    const request = createRequest('http://localhost:3000/api/publicacoes')
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
