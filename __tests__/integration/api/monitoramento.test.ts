import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks devem ser declarados antes dos imports
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
  cacheDelPattern: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/services/monitoramento.service', () => ({
  buscarConfigMonitoramento: vi.fn(),
  verificarSaude: vi.fn(),
}))

import { GET, PUT } from '@/app/api/admin/monitoramento/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { buscarConfigMonitoramento, verificarSaude } from '@/lib/services/monitoramento.service'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockBuscarConfig = vi.mocked(buscarConfigMonitoramento)
const mockVerificarSaude = vi.mocked(verificarSaude)

function createRequest(url: string, options?: { method?: string; body?: Record<string, unknown> }): NextRequest {
  const init: RequestInit = { method: options?.method || 'GET' }
  if (options?.body) {
    init.body = JSON.stringify(options.body)
    init.headers = { 'content-type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

const adminUser = {
  id: 'user-001',
  nome: 'Admin Teste',
  email: 'admin@test.com',
  tipo_usuario: 'administrador',
  polo_id: null,
  escola_id: null,
  ativo: true,
}

describe('GET /api/admin/monitoramento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(adminUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/admin/monitoramento')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('retorna config e saude do sistema', async () => {
    const configMock = {
      emails_alerta: ['admin@test.com'],
      intervalo_min: 5,
      alertar_banco: true,
      alertar_redis: true,
      alertar_erro: true,
    }
    const saudeMock = {
      banco: 'ok',
      redis: 'ok',
      memoria: { usada: '50MB', total: '100MB' },
    }

    mockBuscarConfig.mockResolvedValue(configMock as any)
    mockVerificarSaude.mockResolvedValue(saudeMock as any)

    const request = createRequest('http://localhost:3000/api/admin/monitoramento')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.config).toBeDefined()
    expect(body.saude).toBeDefined()
    expect(body.config.emails_alerta).toEqual(['admin@test.com'])
  })

  it('retorna 500 quando service lanca erro', async () => {
    mockBuscarConfig.mockRejectedValue(new Error('Service error'))

    const request = createRequest('http://localhost:3000/api/admin/monitoramento')
    const response = await GET(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
  })
})

describe('PUT /api/admin/monitoramento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(adminUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/admin/monitoramento', {
      method: 'PUT',
      body: { emails_alerta: [], intervalo_min: 5 },
    })
    const response = await PUT(request)
    expect(response.status).toBe(401)
  })

  it('atualiza config com dados validos', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{
        id: '1',
        secao: 'monitoramento',
        conteudo: { emails_alerta: ['novo@test.com'], intervalo_min: 10 },
        atualizado_em: new Date().toISOString(),
      }],
      rowCount: 1,
    } as any)

    const request = createRequest('http://localhost:3000/api/admin/monitoramento', {
      method: 'PUT',
      body: {
        emails_alerta: ['novo@test.com'],
        intervalo_min: 10,
        alertar_banco: true,
        alertar_redis: false,
        alertar_erro: true,
      },
    })
    const response = await PUT(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.secao).toBe('monitoramento')
  })

  it('retorna 400 para intervalo_min invalido', async () => {
    const request = createRequest('http://localhost:3000/api/admin/monitoramento', {
      method: 'PUT',
      body: { intervalo_min: 999 },
    })
    const response = await PUT(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.mensagem).toBe('Dados inválidos')
  })

  it('retorna 400 para email invalido na lista', async () => {
    const request = createRequest('http://localhost:3000/api/admin/monitoramento', {
      method: 'PUT',
      body: { emails_alerta: ['nao-e-email'] },
    })
    const response = await PUT(request)
    expect(response.status).toBe(400)
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database error'))

    const request = createRequest('http://localhost:3000/api/admin/monitoramento', {
      method: 'PUT',
      body: { emails_alerta: [], intervalo_min: 5 },
    })
    const response = await PUT(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
  })
})
