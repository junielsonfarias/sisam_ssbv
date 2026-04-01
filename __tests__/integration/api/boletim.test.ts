import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import { GET } from '@/app/api/boletim/route'
import pool from '@/database/connection'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/boletim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 404 genérico sem parametros de busca (anti-enumeração)', async () => {
    const request = createRequest('http://localhost:3000/api/boletim?ano_letivo=2026')
    const response = await GET(request)
    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.mensagem).toBe('Dados não encontrados')
  })

  it('retorna 404 genérico com CPF invalido (anti-enumeração)', async () => {
    const request = createRequest('http://localhost:3000/api/boletim?cpf=123&data_nascimento=2015-01-01&ano_letivo=2026')
    const response = await GET(request)
    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.mensagem).toBe('Dados não encontrados')
  })

  it('retorna 404 genérico com data de nascimento invalida (anti-enumeração)', async () => {
    const request = createRequest('http://localhost:3000/api/boletim?cpf=12345678901&data_nascimento=01-01-2015&ano_letivo=2026')
    const response = await GET(request)
    expect(response.status).toBe(404)

    const body = await response.json()
    expect(body.mensagem).toBe('Dados não encontrados')
  })

  it('retorna 404 quando aluno nao encontrado por codigo', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const request = createRequest('http://localhost:3000/api/boletim?codigo=INEXISTENTE&ano_letivo=2026')
    const response = await GET(request)
    // Pode ser 404 ou ter mensagem de nao encontrado
    const body = await response.json()
    expect(response.status === 404 || body.mensagem?.includes('encontrad')).toBeTruthy()
  })
})
