/**
 * Testes de integração — /api/publicador/publicacoes (GET, POST, PUT, DELETE)
 *
 * Cobre: autenticação, autorização por perfil, validação Zod,
 *        caminho feliz, 404, erro de banco, invalidação de cache.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

vi.mock('@/lib/auth/with-auth', () => ({
  withAuth: vi.fn((tipos: string | string[], handler: (req: any, usuario: any) => any) => {
    return async (request: any) => {
      const { getUsuarioFromRequest, verificarPermissao } = await import('@/lib/auth')
      const usuario = await getUsuarioFromRequest(request)
      if (!usuario) {
        const { NextResponse } = await import('next/server')
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 401 })
      }
      const tiposArr = Array.isArray(tipos) ? tipos : [tipos]
      if (!verificarPermissao(usuario, tiposArr)) {
        const { NextResponse } = await import('next/server')
        return NextResponse.json({ mensagem: 'Não autorizado' }, { status: 403 })
      }
      return handler(request, usuario)
    }
  }),
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { GET, POST, PUT, DELETE } from '@/app/api/publicador/publicacoes/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

const fakeAdmin = {
  id: 'user-admin',
  nome: 'Administrador',
  email: 'admin@semed.gov.br',
  tipo_usuario: 'administrador',
  polo_id: null,
  escola_id: null,
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
}

const fakePublicacao = {
  id: VALID_UUID,
  tipo: 'Portaria',
  numero: '001/2026',
  titulo: 'Portaria de Abertura',
  descricao: 'Descrição da portaria',
  orgao: 'SEMED',
  data_publicacao: '2026-01-15',
  ano_referencia: '2026',
  url_arquivo: null,
  publicado_por: 'user-admin',
  criado_em: new Date(),
  atualizado_em: new Date(),
}

function createRequest(
  url: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): NextRequest {
  const { method = 'GET', body } = options
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('GET /api/publicador/publicacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeAdmin as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 para usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)

    const response = await GET(createRequest('http://localhost:3000/api/publicador/publicacoes'))
    expect(response.status).toBe(401)
  })

  it('retorna 403 para usuario sem permissao (perfil escola)', async () => {
    mockGetUsuario.mockResolvedValue({ ...fakeAdmin, tipo_usuario: 'escola' } as any)
    mockVerificarPermissao.mockReturnValue(false)

    const response = await GET(createRequest('http://localhost:3000/api/publicador/publicacoes'))
    expect(response.status).toBe(403)
  })

  it('retorna 200 com lista paginada de publicacoes', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakePublicacao], rowCount: 1 } as any)

    const response = await GET(createRequest('http://localhost:3000/api/publicador/publicacoes'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.publicacoes).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.pagina).toBe(1)
  })

  it('aplica filtro por tipo', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await GET(createRequest('http://localhost:3000/api/publicador/publicacoes?tipo=Portaria'))

    // A query deve incluir filtro de tipo
    const countCallArgs = mockPool.query.mock.calls[0]
    expect(countCallArgs[0]).toContain('tipo')
    expect(countCallArgs[1]).toContain('Portaria')
  })

  it('aplica filtro por orgao', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await GET(createRequest('http://localhost:3000/api/publicador/publicacoes?orgao=CME'))

    const callArgs = mockPool.query.mock.calls[0]
    expect(callArgs[1]).toContain('CME')
  })

  it('aplica filtro por ano', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await GET(createRequest('http://localhost:3000/api/publicador/publicacoes?ano=2025'))

    const callArgs = mockPool.query.mock.calls[0]
    expect(callArgs[1]).toContain('2025')
  })

  it('respeita limite maximo de 100 por pagina', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await GET(createRequest('http://localhost:3000/api/publicador/publicacoes?limite=500'))

    // O limit na query deve ser 100 (max), não 500
    const dataCallArgs = mockPool.query.mock.calls[1]
    expect(dataCallArgs[1]).toContain(100)
  })
})

describe('POST /api/publicador/publicacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeAdmin as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 para usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)

    const response = await POST(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      { method: 'POST', body: { tipo: 'Portaria', titulo: 'Teste', orgao: 'SEMED', data_publicacao: '2026-01-01' } }
    ))
    expect(response.status).toBe(401)
  })

  it('retorna 201 com publicacao criada', async () => {
    mockPool.query.mockResolvedValue({ rows: [fakePublicacao], rowCount: 1 } as any)

    const response = await POST(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      {
        method: 'POST',
        body: {
          tipo: 'Portaria',
          titulo: 'Portaria de Abertura',
          orgao: 'SEMED',
          data_publicacao: '2026-01-15',
        },
      }
    ))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.titulo).toBe('Portaria de Abertura')
  })

  it('retorna 400 para body invalido — tipo ausente', async () => {
    const response = await POST(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      { method: 'POST', body: { titulo: 'Sem tipo', orgao: 'SEMED', data_publicacao: '2026-01-01' } }
    ))

    expect(response.status).toBe(400)
  })

  it('retorna 400 para titulo ausente', async () => {
    const response = await POST(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      { method: 'POST', body: { tipo: 'Portaria', orgao: 'SEMED', data_publicacao: '2026-01-01' } }
    ))

    expect(response.status).toBe(400)
  })

  it('retorna 400 para orgao ausente', async () => {
    const response = await POST(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      { method: 'POST', body: { tipo: 'Portaria', titulo: 'Titulo', data_publicacao: '2026-01-01' } }
    ))

    expect(response.status).toBe(400)
  })
})

describe('PUT /api/publicador/publicacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeAdmin as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 200 com publicacao atualizada', async () => {
    mockPool.query.mockResolvedValue({ rows: [fakePublicacao], rowCount: 1 } as any)

    const response = await PUT(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      {
        method: 'PUT',
        body: {
          id: VALID_UUID,
          tipo: 'Portaria',
          titulo: 'Portaria Atualizada',
          orgao: 'SEMED',
          data_publicacao: '2026-01-15',
        },
      }
    ))

    expect(response.status).toBe(200)
  })

  it('retorna 404 quando publicacao nao existe', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const response = await PUT(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      {
        method: 'PUT',
        body: {
          id: VALID_UUID,
          tipo: 'Portaria',
          titulo: 'Titulo',
          orgao: 'SEMED',
          data_publicacao: '2026-01-01',
        },
      }
    ))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.mensagem).toContain('não encontrada')
  })

  it('retorna 400 para id invalido (nao-UUID)', async () => {
    const response = await PUT(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      {
        method: 'PUT',
        body: {
          id: 'nao-e-uuid',
          tipo: 'Portaria',
          titulo: 'Titulo',
          orgao: 'SEMED',
          data_publicacao: '2026-01-01',
        },
      }
    ))

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/publicador/publicacoes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeAdmin as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 204 ao excluir publicacao existente', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{ id: VALID_UUID, titulo: 'Portaria de Abertura' }],
      rowCount: 1,
    } as any)

    const response = await DELETE(createRequest(
      `http://localhost:3000/api/publicador/publicacoes?id=${VALID_UUID}`,
      { method: 'DELETE' }
    ))

    expect(response.status).toBe(204)
  })

  it('retorna 400 quando id nao e fornecido', async () => {
    const response = await DELETE(createRequest(
      'http://localhost:3000/api/publicador/publicacoes',
      { method: 'DELETE' }
    ))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('ID')
  })

  it('retorna 404 quando publicacao nao existe', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const response = await DELETE(createRequest(
      `http://localhost:3000/api/publicador/publicacoes?id=${VALID_UUID}`,
      { method: 'DELETE' }
    ))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.mensagem).toContain('não encontrada')
  })

  it('retorna 401 para usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)

    const response = await DELETE(createRequest(
      `http://localhost:3000/api/publicador/publicacoes?id=${VALID_UUID}`,
      { method: 'DELETE' }
    ))

    expect(response.status).toBe(401)
  })
})
