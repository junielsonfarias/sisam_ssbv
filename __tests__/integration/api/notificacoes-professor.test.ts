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

import { GET, PUT } from '@/app/api/professor/notificacoes/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

function createRequest(url: string, options?: { method?: string; body?: Record<string, unknown> }): NextRequest {
  const init: RequestInit = { method: options?.method || 'GET' }
  if (options?.body) {
    init.body = JSON.stringify(options.body)
    init.headers = { 'content-type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

const professorUser = {
  id: 'user-prof',
  nome: 'Professor Teste',
  email: 'prof@test.com',
  tipo_usuario: 'professor',
  polo_id: null,
  escola_id: 'escola-1',
  ativo: true,
}

describe('GET /api/professor/notificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(professorUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/professor/notificacoes')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('retorna notificacoes do professor', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Buscar escola_ids do professor (professor_turmas)
        return Promise.resolve({
          rows: [{ escola_id: 'escola-1' }],
          rowCount: 1,
        } as any)
      }
      if (callCount === 2) {
        // Buscar notificacoes
        return Promise.resolve({
          rows: [
            {
              id: 'notif-1',
              tipo: 'aviso',
              titulo: 'Aviso importante',
              mensagem: 'Conteudo do aviso',
              prioridade: 'normal',
              lida: false,
              lida_em: null,
              criado_em: '2026-04-01T10:00:00Z',
              escola_id: 'escola-1',
              escola_nome: 'Escola Teste',
              aluno_id: null,
              aluno_nome: null,
              turma_id: null,
              turma_codigo: null,
            },
          ],
          rowCount: 1,
        } as any)
      }
      // COUNT de nao lidas
      return Promise.resolve({
        rows: [{ total: '1' }],
        rowCount: 1,
      } as any)
    })

    const request = createRequest('http://localhost:3000/api/professor/notificacoes')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.notificacoes).toBeDefined()
    expect(body.notificacoes.length).toBe(1)
    expect(body.nao_lidas).toBe(1)
    expect(body.notificacoes[0].titulo).toBe('Aviso importante')
  })

  it('retorna notificacoes vazias quando professor nao tem turmas', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // professor sem turmas
        return Promise.resolve({ rows: [], rowCount: 0 } as any)
      }
      if (callCount === 2) {
        // Notificacoes (só diretas)
        return Promise.resolve({ rows: [], rowCount: 0 } as any)
      }
      // COUNT
      return Promise.resolve({ rows: [{ total: '0' }], rowCount: 1 } as any)
    })

    const request = createRequest('http://localhost:3000/api/professor/notificacoes')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.notificacoes).toEqual([])
    expect(body.nao_lidas).toBe(0)
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database error'))

    const request = createRequest('http://localhost:3000/api/professor/notificacoes')
    const response = await GET(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno')
  })
})

describe('PUT /api/professor/notificacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(professorUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/professor/notificacoes', {
      method: 'PUT',
      body: { ids: ['notif-1'] },
    })
    const response = await PUT(request)
    expect(response.status).toBe(401)
  })

  it('marca notificacoes especificas como lidas', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 2 } as any)

    const request = createRequest('http://localhost:3000/api/professor/notificacoes', {
      method: 'PUT',
      body: { ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'] },
    })
    const response = await PUT(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.mensagem).toContain('2')
    expect(body.mensagem).toContain('lida')
  })

  it('marca todas as notificacoes como lidas', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Buscar escola_ids
        return Promise.resolve({
          rows: [{ escola_id: 'escola-1' }],
          rowCount: 1,
        } as any)
      }
      // UPDATE notificacoes
      return Promise.resolve({ rows: [], rowCount: 5 } as any)
    })

    const request = createRequest('http://localhost:3000/api/professor/notificacoes', {
      method: 'PUT',
      body: { marcar_todas: true },
    })
    const response = await PUT(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.mensagem).toContain('Todas')
  })

  it('retorna 400 quando body invalido (sem ids nem marcar_todas)', async () => {
    const request = createRequest('http://localhost:3000/api/professor/notificacoes', {
      method: 'PUT',
      body: {},
    })
    const response = await PUT(request)
    // Deve retornar 400 pela validacao do schema (refine)
    expect(response.status).toBe(400)
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database error'))

    const request = createRequest('http://localhost:3000/api/professor/notificacoes', {
      method: 'PUT',
      body: { marcar_todas: true },
    })
    const response = await PUT(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno')
  })
})
