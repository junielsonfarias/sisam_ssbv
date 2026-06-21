/**
 * Testes de integração — GET /api/polo/escolas
 *
 * Cobre: autenticação, escopo IDOR (polo_id), caminho feliz, erro de banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import { GET } from '@/app/api/polo/escolas/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

function createRequest(url = 'http://localhost:3000/api/polo/escolas'): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

const fakePolo = {
  id: 'user-polo',
  nome: 'Polo Central',
  email: 'polo@semed.gov.br',
  tipo_usuario: 'polo',
  polo_id: 'polo-1',
  escola_id: null,
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
}

const fakeEscolas = [
  { id: 'escola-1', nome: 'EM Teste A', codigo_inep: '11111', endereco: 'Rua A', polo_id: 'polo-1', ativo: true, gestor_escolar_habilitado: false },
  { id: 'escola-2', nome: 'EM Teste B', codigo_inep: '22222', endereco: 'Rua B', polo_id: 'polo-1', ativo: true, gestor_escolar_habilitado: true },
]

describe('GET /api/polo/escolas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 403 para usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)
    mockVerificarPermissao.mockReturnValue(false)

    const response = await GET(createRequest())
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.mensagem).toContain('autorizado')
  })

  it('retorna 403 para usuario sem perfil polo (admin tentando acessar)', async () => {
    mockGetUsuario.mockResolvedValue({
      ...fakePolo,
      tipo_usuario: 'administrador',
      polo_id: null,
    } as any)
    mockVerificarPermissao.mockReturnValue(false)

    const response = await GET(createRequest())
    expect(response.status).toBe(403)
  })

  it('retorna 403 para usuario polo sem polo_id (IDOR — escopo ausente)', async () => {
    mockGetUsuario.mockResolvedValue({
      ...fakePolo,
      polo_id: null,
    } as any)
    mockVerificarPermissao.mockReturnValue(true)

    const response = await GET(createRequest())
    expect(response.status).toBe(403)
    // Banco NAO deve ser chamado quando polo_id é null
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('retorna 200 com escolas do polo autenticado', async () => {
    mockGetUsuario.mockResolvedValue(fakePolo as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockPool.query.mockResolvedValue({ rows: fakeEscolas, rowCount: 2 } as any)

    const response = await GET(createRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    expect(body[0].polo_id).toBe('polo-1')
  })

  it('chama pool.query com polo_id como parametro (nao interpolado)', async () => {
    mockGetUsuario.mockResolvedValue(fakePolo as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockPool.query.mockResolvedValue({ rows: fakeEscolas, rowCount: 2 } as any)

    await GET(createRequest())

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('polo_id = $1'),
      ['polo-1']
    )
  })

  it('retorna array vazio quando polo nao tem escolas', async () => {
    mockGetUsuario.mockResolvedValue(fakePolo as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const response = await GET(createRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual([])
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockGetUsuario.mockResolvedValue(fakePolo as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockPool.query.mockRejectedValue(new Error('DB connection error'))

    const response = await GET(createRequest())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.mensagem).toBeDefined()
  })
})
