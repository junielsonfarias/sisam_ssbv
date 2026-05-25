import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/email/sender', () => ({
  enviarEmail: vi.fn().mockResolvedValue({ id: 'mock', enviado: true }),
}))

vi.mock('@/lib/rate-limiter-async', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true, remaining: 5 }),
  resetRateLimitAsync: vi.fn(),
  createRateLimitKeyPorUsuario: vi.fn((e) => `usuario:${e}`),
}))

vi.mock('@/lib/rate-limiter', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('$2b$10$hashed'),
}))

import pool from '@/database/connection'
const mockPool = vi.mocked(pool)

function request(method = 'POST', body?: any, urlPath = '/api/auth/test') {
  const url = `http://localhost${urlPath}`
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/auth/recuperar-senha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejeita email invalido', async () => {
    const { POST } = await import('@/app/api/auth/recuperar-senha/route')
    const res = await POST(request('POST', { email: 'nao-eh-email' }))
    expect(res.status).toBe(400)
  })

  it('retorna 200 generico mesmo se email nao existe (anti-vazamento)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // usuario nao existe

    const { POST } = await import('@/app/api/auth/recuperar-senha/route')
    const res = await POST(request('POST', { email: 'inexistente@test.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mensagem).toContain('Se este e-mail')
  })

  it('gera token e envia email para usuario existente', async () => {
    // Busca usuario
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'user-1', nome: 'Joao', email: 'joao@test.com' }],
      rowCount: 1,
    } as any)
    // Invalida tokens antigos
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    // Insere novo token
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'tok-1' }], rowCount: 1 } as any)

    const { POST } = await import('@/app/api/auth/recuperar-senha/route')
    const res = await POST(request('POST', { email: 'joao@test.com' }))
    expect(res.status).toBe(200)
  })
})

describe('/api/auth/redefinir-senha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejeita token com formato invalido', async () => {
    const { POST } = await import('@/app/api/auth/redefinir-senha/route')
    const res = await POST(request('POST', {
      token: 'token-invalido',
      novaSenha: 'Pq#9mLwT3Yr$kF',
      confirmarSenha: 'Pq#9mLwT3Yr$kF',
    }))
    expect(res.status).toBe(400)
  })

  it('rejeita senhas que nao coincidem', async () => {
    const { POST } = await import('@/app/api/auth/redefinir-senha/route')
    const token = 'a'.repeat(64)
    const res = await POST(request('POST', {
      token,
      novaSenha: 'Pq#9mLwT3Yr$kF',
      confirmarSenha: 'OutraSenha123!@',
    }))
    expect(res.status).toBe(400)
  })

  it('rejeita senha fraca', async () => {
    const { POST } = await import('@/app/api/auth/redefinir-senha/route')
    const token = 'a'.repeat(64)
    const res = await POST(request('POST', {
      token,
      novaSenha: '12345678',
      confirmarSenha: '12345678',
    }))
    expect(res.status).toBe(400)
  })

  it('rejeita token nao encontrado/expirado', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const { POST } = await import('@/app/api/auth/redefinir-senha/route')
    const token = 'a'.repeat(64)
    const res = await POST(request('POST', {
      token,
      novaSenha: 'Pq#9mLwT3Yr$kF',
      confirmarSenha: 'Pq#9mLwT3Yr$kF',
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toContain('inválido')
  })
})
