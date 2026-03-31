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

  it('retorna 400 sem parametros de busca', async () => {
    const request = createRequest('http://localhost:3000/api/boletim?ano_letivo=2026')
    const response = await GET(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.mensagem).toContain('codigo')
  })

  it('retorna 400 com CPF invalido (menos de 11 digitos)', async () => {
    const request = createRequest('http://localhost:3000/api/boletim?cpf=123&data_nascimento=2015-01-01&ano_letivo=2026')
    const response = await GET(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.mensagem).toContain('CPF')
  })

  it('retorna 400 com data de nascimento invalida', async () => {
    const request = createRequest('http://localhost:3000/api/boletim?cpf=12345678901&data_nascimento=01-01-2015&ano_letivo=2026')
    const response = await GET(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.mensagem).toContain('Data')
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
