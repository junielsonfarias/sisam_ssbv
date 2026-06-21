/**
 * Testes de integração — GET /api/perfil e PUT /api/perfil
 *
 * Cobre: autenticação, campos retornados, validação de nome/telefone, erros de banco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}))

import { GET, PUT } from '@/app/api/perfil/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/perfil', { method: 'GET' })
}

function createPutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/perfil', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const fakeUsuario = {
  id: 'user-001',
  nome: 'Maria Santos',
  email: 'maria@escola.edu.br',
  tipo_usuario: 'escola',
  polo_id: null,
  escola_id: 'escola-1',
  ativo: true,
  criado_em: new Date('2026-01-01'),
  atualizado_em: new Date('2026-01-01'),
}

const fakePerfilRow = {
  id: 'user-001',
  nome: 'Maria Santos',
  email: 'maria@escola.edu.br',
  tipo_usuario: 'escola',
  telefone: '91999990000',
  polo_id: null,
  escola_id: 'escola-1',
  foto_url: null,
  criado_em: new Date('2026-01-01'),
  polo_nome: null,
  escola_nome: 'EM São João',
  gestor_escolar_habilitado: true,
}

describe('GET /api/perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)

    const response = await GET(createGetRequest())

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.mensagem).toContain('autorizado')
  })

  it('retorna 200 com dados do perfil', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)
    mockPool.query.mockResolvedValue({ rows: [fakePerfilRow], rowCount: 1 } as any)

    const response = await GET(createGetRequest())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.nome).toBe('Maria Santos')
    expect(body.email).toBe('maria@escola.edu.br')
    expect(body.escola_id).toBe('escola-1')
    expect(body.gestor_escolar_habilitado).toBe(true)
  })

  it('retorna 404 quando usuario nao existe no banco', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)

    const response = await GET(createGetRequest())

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.mensagem).toContain('não encontrado')
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)
    mockPool.query.mockRejectedValue(new Error('DB connection failed'))

    const response = await GET(createGetRequest())

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.mensagem).toBeDefined()
  })
})

describe('PUT /api/perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null)

    const response = await PUT(createPutRequest({ nome: 'Novo Nome' }))

    expect(response.status).toBe(401)
  })

  it('atualiza perfil com nome valido — retorna 200 e mensagem', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)
    mockPool.query.mockResolvedValue({
      rows: [{ nome: 'Novo Nome', telefone: '91999990000' }],
      rowCount: 1,
    } as any)

    const response = await PUT(createPutRequest({ nome: 'Novo Nome' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.mensagem).toContain('sucesso')
    expect(body.nome).toBe('Novo Nome')
  })

  it('retorna 400 para nome vazio', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)

    const response = await PUT(createPutRequest({ nome: '' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toBeDefined()
  })

  it('retorna 400 para nome com menos de 3 caracteres', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)

    const response = await PUT(createPutRequest({ nome: 'Ab' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('3 caracteres')
  })

  it('retorna 400 para nome somente com espacos', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)

    const response = await PUT(createPutRequest({ nome: '   ' }))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.mensagem).toContain('obrigatório')
  })

  it('atualiza nome e telefone juntos', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)
    mockPool.query.mockResolvedValue({
      rows: [{ nome: 'Maria Oliveira', telefone: '91888880000' }],
      rowCount: 1,
    } as any)

    const response = await PUT(createPutRequest({ nome: 'Maria Oliveira', telefone: '91888880000' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.telefone).toBe('91888880000')
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockGetUsuario.mockResolvedValue(fakeUsuario as any)
    mockPool.query.mockRejectedValue(new Error('DB error'))

    const response = await PUT(createPutRequest({ nome: 'Nome Válido' }))

    expect(response.status).toBe(500)
  })
})
