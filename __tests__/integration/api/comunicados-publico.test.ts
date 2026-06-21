/**
 * Testes de integração — GET /api/comunicados (rota pública)
 *
 * Endpoint sem auth — para pais visualizarem via boletim.
 * Cobre: validação de turma_id, UUID inválido, caminho feliz, erro de banco.
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

import { GET } from '@/app/api/comunicados/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

const fakeComunicados = [
  {
    id: 'com-1',
    titulo: 'Reunião de Pais',
    mensagem: 'Haverá reunião na sexta-feira.',
    tipo: 'reuniao',
    data_publicacao: '2026-06-15T10:00:00Z',
    professor_nome: 'Maria Silva',
    turma_nome: '5º Ano A',
  },
]

describe('GET /api/comunicados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 400 quando turma_id nao e fornecido', async () => {
    const request = createRequest('http://localhost:3000/api/comunicados')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('turma_id')
  })

  it('retorna 400 para turma_id com formato invalido (nao-UUID)', async () => {
    const request = createRequest('http://localhost:3000/api/comunicados?turma_id=nao-e-uuid')
    const response = await GET(request)

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('inválido')
  })

  it('retorna 400 para turma_id com string vazia', async () => {
    const request = createRequest('http://localhost:3000/api/comunicados?turma_id=')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('retorna 400 para turma_id com SQL injection tentativo', async () => {
    const request = createRequest(
      "http://localhost:3000/api/comunicados?turma_id=1' OR '1'='1"
    )
    const response = await GET(request)

    expect(response.status).toBe(400)
    // Garante que banco NAO foi chamado (validação antes da query)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('retorna 200 com comunicados para UUID válido', async () => {
    mockPool.query.mockResolvedValue({ rows: fakeComunicados, rowCount: 1 } as any)

    const request = createRequest(
      `http://localhost:3000/api/comunicados?turma_id=${VALID_UUID}`
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.comunicados).toHaveLength(1)
    expect(body.comunicados[0].titulo).toBe('Reunião de Pais')
  })

  it('retorna array vazio quando nao ha comunicados ativos', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest(
      `http://localhost:3000/api/comunicados?turma_id=${VALID_UUID}`
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.comunicados).toEqual([])
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('DB error'))

    const request = createRequest(
      `http://localhost:3000/api/comunicados?turma_id=${VALID_UUID}`
    )
    const response = await GET(request)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.mensagem).toBeDefined()
  })

  it('chama pool.query com o turma_id como parametro (nao interpolado)', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest(
      `http://localhost:3000/api/comunicados?turma_id=${VALID_UUID}`
    )
    await GET(request)

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.any(String),
      [VALID_UUID]
    )
  })
})
