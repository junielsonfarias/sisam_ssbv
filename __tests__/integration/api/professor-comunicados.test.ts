/**
 * Testes de integração — /api/professor/comunicados (GET, POST, DELETE)
 *
 * Cobre: autenticação via withAuth, vínculo de professor com turma (IDOR),
 *        validação Zod, caminho feliz, 404, cache invalidation.
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

vi.mock('@/lib/professor-auth', () => ({
  verificarVinculoProfessor: vi.fn(),
}))

import { GET, POST, DELETE } from '@/app/api/professor/comunicados/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { verificarVinculoProfessor } from '@/lib/professor-auth'
import { cacheDelPattern } from '@/lib/cache'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockVerificarVinculo = vi.mocked(verificarVinculoProfessor)
const mockCacheDelPattern = vi.mocked(cacheDelPattern)

const TURMA_ID = '550e8400-e29b-41d4-a716-446655440001'

const fakeProfessor = {
  id: 'user-prof',
  nome: 'Prof. João',
  email: 'joao@escola.edu.br',
  tipo_usuario: 'professor',
  polo_id: null,
  escola_id: 'escola-1',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
}

const fakeComunicados = [
  {
    id: 'com-1',
    turma_id: TURMA_ID,
    professor_id: 'user-prof',
    titulo: 'Reunião de Pais',
    mensagem: 'Haverá reunião na sexta.',
    tipo: 'reuniao',
    ativo: true,
    data_publicacao: '2026-06-15',
    turma_nome: '5º Ano A',
    professor_nome: 'Prof. João',
  },
]

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

describe('GET /api/professor/comunicados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeProfessor as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 para usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)

    const response = await GET(createRequest(
      `http://localhost:3000/api/professor/comunicados?turma_id=${TURMA_ID}`
    ))
    expect(response.status).toBe(401)
  })

  it('retorna 400 quando turma_id nao e fornecido', async () => {
    const response = await GET(createRequest(
      'http://localhost:3000/api/professor/comunicados'
    ))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('turma_id')
  })

  it('retorna 403 quando professor nao tem vinculo com a turma', async () => {
    mockVerificarVinculo.mockResolvedValue(false)

    const response = await GET(createRequest(
      `http://localhost:3000/api/professor/comunicados?turma_id=${TURMA_ID}`
    ))
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.mensagem).toContain('vínculo')
  })

  it('retorna 200 com comunicados para professor com vinculo', async () => {
    mockVerificarVinculo.mockResolvedValue(true)
    mockPool.query.mockResolvedValue({ rows: fakeComunicados, rowCount: 1 } as any)

    const response = await GET(createRequest(
      `http://localhost:3000/api/professor/comunicados?turma_id=${TURMA_ID}`
    ))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.comunicados).toHaveLength(1)
    expect(body.comunicados[0].titulo).toBe('Reunião de Pais')
  })

  it('administrador nao precisa de vinculo para acessar', async () => {
    mockGetUsuario.mockResolvedValue({
      ...fakeProfessor,
      tipo_usuario: 'administrador',
    } as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockPool.query.mockResolvedValue({ rows: fakeComunicados, rowCount: 1 } as any)

    const response = await GET(createRequest(
      `http://localhost:3000/api/professor/comunicados?turma_id=${TURMA_ID}`
    ))
    expect(response.status).toBe(200)
    // verificarVinculoProfessor nao deve ter sido chamado
    expect(mockVerificarVinculo).not.toHaveBeenCalled()
  })
})

describe('POST /api/professor/comunicados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeProfessor as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 400 para dados invalidos — sem titulo', async () => {
    const response = await POST(createRequest(
      'http://localhost:3000/api/professor/comunicados',
      { method: 'POST', body: { turma_id: TURMA_ID, mensagem: 'Texto', tipo: 'aviso' } }
    ))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('inválidos')
  })

  it('retorna 400 para tipo invalido', async () => {
    const response = await POST(createRequest(
      'http://localhost:3000/api/professor/comunicados',
      {
        method: 'POST',
        body: { turma_id: TURMA_ID, titulo: 'Aviso', mensagem: 'Texto', tipo: 'tipo_invalido' },
      }
    ))
    expect(response.status).toBe(400)
  })

  it('retorna 403 quando professor nao tem vinculo com a turma no POST', async () => {
    mockVerificarVinculo.mockResolvedValue(false)

    const response = await POST(createRequest(
      'http://localhost:3000/api/professor/comunicados',
      {
        method: 'POST',
        body: { turma_id: TURMA_ID, titulo: 'Aviso', mensagem: 'Texto da mensagem', tipo: 'aviso' },
      }
    ))
    expect(response.status).toBe(403)
  })

  it('retorna 200 com comunicado criado e invalida cache', async () => {
    mockVerificarVinculo.mockResolvedValue(true)
    mockPool.query.mockResolvedValue({ rows: [fakeComunicados[0]], rowCount: 1 } as any)

    const response = await POST(createRequest(
      'http://localhost:3000/api/professor/comunicados',
      {
        method: 'POST',
        body: { turma_id: TURMA_ID, titulo: 'Reunião de Pais', mensagem: 'Haverá reunião na sexta.', tipo: 'reuniao' },
      }
    ))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mensagem).toContain('sucesso')
    expect(body.comunicado).toBeDefined()
    // Deve invalidar o cache após criar
    expect(mockCacheDelPattern).toHaveBeenCalledWith('comunicados:*')
  })
})

describe('DELETE /api/professor/comunicados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(fakeProfessor as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 400 quando id nao e fornecido', async () => {
    const response = await DELETE(createRequest(
      'http://localhost:3000/api/professor/comunicados',
      { method: 'DELETE' }
    ))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('id')
  })

  it('retorna 404 quando comunicado nao pertence ao professor', async () => {
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const response = await DELETE(createRequest(
      `http://localhost:3000/api/professor/comunicados?id=com-inexistente`,
      { method: 'DELETE' }
    ))
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.mensagem).toContain('não encontrado')
  })

  it('retorna 204 ao excluir (soft delete) comunicado existente', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 'com-1' }], rowCount: 1 } as any)

    const response = await DELETE(createRequest(
      'http://localhost:3000/api/professor/comunicados?id=com-1',
      { method: 'DELETE' }
    ))
    expect(response.status).toBe(204)
    // Deve invalidar o cache
    expect(mockCacheDelPattern).toHaveBeenCalledWith('comunicados:*')
  })

  it('chama UPDATE com ativo=false (soft delete, nao hard delete)', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ id: 'com-1' }], rowCount: 1 } as any)

    await DELETE(createRequest(
      'http://localhost:3000/api/professor/comunicados?id=com-1',
      { method: 'DELETE' }
    ))

    const callArgs = mockPool.query.mock.calls[0]
    expect(callArgs[0]).toContain('ativo = false')
    expect(callArgs[1]).toContain('user-prof')
  })
})
