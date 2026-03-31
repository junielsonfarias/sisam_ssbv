import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
  cacheDelPattern: vi.fn(),
}))

import { GET } from '@/app/api/site-config/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/site-config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna todas as secoes quando nao especifica secao', async () => {
    mockPool.query.mockImplementation((sql: string) => {
      if (typeof sql === 'string' && sql.includes('site_config')) {
        return Promise.resolve({
          rows: [
            { id: '1', secao: 'hero', conteudo: { titulo: 'Bem-vindo' }, atualizado_em: new Date() },
            { id: '2', secao: 'about', conteudo: { titulo: 'Sobre' }, atualizado_em: new Date() },
          ],
          rowCount: 2,
        } as any)
      }
      if (typeof sql === 'string' && sql.includes('escolas')) {
        return Promise.resolve({ rows: [{ total: 5 }], rowCount: 1 } as any)
      }
      if (typeof sql === 'string' && sql.includes('alunos')) {
        return Promise.resolve({ rows: [{ total: 100 }], rowCount: 1 } as any)
      }
      if (typeof sql === 'string' && sql.includes('turmas')) {
        return Promise.resolve({ rows: [{ total: 20 }], rowCount: 1 } as any)
      }
      return Promise.resolve({ rows: [], rowCount: 0 } as any)
    })

    const request = createRequest('http://localhost:3000/api/site-config')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.secoes).toBeDefined()
    expect(body.stats).toBeDefined()
  })

  it('retorna secao especifica quando query param secao e fornecido', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: '1', secao: 'hero', conteudo: { titulo: 'Teste' }, atualizado_em: new Date() }],
      rowCount: 1,
    } as any)

    const request = createRequest('http://localhost:3000/api/site-config?secao=hero')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.secao).toBe('hero')
  })

  it('retorna 404 quando secao nao existe', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/site-config?secao=inexistente')
    const response = await GET(request)
    expect(response.status).toBe(404)
  })

  it('retorna dados vazios se tabela nao existe', async () => {
    const error = new Error('relation "site_config" does not exist') as any
    error.code = '42P01'
    mockPool.query.mockRejectedValue(error)

    const request = createRequest('http://localhost:3000/api/site-config')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.secoes).toEqual([])
  })
})
