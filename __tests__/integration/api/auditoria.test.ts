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

import { GET } from '@/app/api/admin/auditoria/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
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

describe('GET /api/admin/auditoria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(adminUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/admin/auditoria')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('retorna 403 quando usuario nao tem permissao', async () => {
    mockVerificarPermissao.mockReturnValue(false)
    const request = createRequest('http://localhost:3000/api/admin/auditoria')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('retorna lista de logs com paginacao', async () => {
    let callCount = 0
    mockPool.query.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // COUNT query
        return Promise.resolve({ rows: [{ count: '2' }], rowCount: 1 } as any)
      }
      if (callCount === 2) {
        // Dados
        return Promise.resolve({
          rows: [
            {
              id: 'log-1',
              usuario_id: 'user-001',
              usuario_email: 'admin@test.com',
              usuario_nome: 'Admin',
              acao: 'criar',
              entidade: 'aluno',
              entidade_id: 'aluno-1',
              detalhes: { nome: 'Teste' },
              ip: '127.0.0.1',
              criado_em: '2026-04-01T10:00:00Z',
            },
          ],
          rowCount: 1,
        } as any)
      }
      // Usuarios para filtro
      return Promise.resolve({
        rows: [{ usuario_id: 'user-001', usuario_email: 'admin@test.com', usuario_nome: 'Admin' }],
        rowCount: 1,
      } as any)
    })

    const request = createRequest('http://localhost:3000/api/admin/auditoria')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.logs).toBeDefined()
    expect(body.logs.length).toBe(1)
    expect(body.total).toBe(2)
    expect(body.pagina).toBe(1)
    expect(body.totalPaginas).toBe(1)
    expect(body.usuarios).toBeDefined()
  })

  it('aceita filtros de acao e entidade', async () => {
    let queriesExecutadas: string[] = []
    mockPool.query.mockImplementation((sql: string) => {
      queriesExecutadas.push(sql)
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any)
      }
      return Promise.resolve({ rows: [], rowCount: 0 } as any)
    })

    const request = createRequest('http://localhost:3000/api/admin/auditoria?acao=criar&entidade=aluno')
    const response = await GET(request)
    expect(response.status).toBe(200)

    // Verificar que os filtros foram aplicados na query
    const countQuery = queriesExecutadas.find(q => q.includes('COUNT'))
    expect(countQuery).toContain('la.acao')
    expect(countQuery).toContain('la.entidade')
  })

  it('aceita filtros de data_inicio e data_fim', async () => {
    mockPool.query.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 } as any)
      }
      return Promise.resolve({ rows: [], rowCount: 0 } as any)
    })

    const request = createRequest('http://localhost:3000/api/admin/auditoria?data_inicio=2026-01-01&data_fim=2026-12-31')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('retorna 400 para data_inicio em formato invalido', async () => {
    const request = createRequest('http://localhost:3000/api/admin/auditoria?data_inicio=01-01-2026')
    const response = await GET(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.mensagem).toBe('Parâmetros inválidos')
  })

  it('respeita paginacao com pagina e limite', async () => {
    mockPool.query.mockImplementation((sql: string) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ count: '100' }], rowCount: 1 } as any)
      }
      if (sql.includes('DISTINCT')) {
        return Promise.resolve({ rows: [], rowCount: 0 } as any)
      }
      return Promise.resolve({ rows: [], rowCount: 0 } as any)
    })

    const request = createRequest('http://localhost:3000/api/admin/auditoria?pagina=3&limite=10')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.pagina).toBe(3)
    expect(body.totalPaginas).toBe(10)
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database error'))

    const request = createRequest('http://localhost:3000/api/admin/auditoria')
    const response = await GET(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
  })
})
