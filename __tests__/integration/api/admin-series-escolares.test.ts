/**
 * Testes de integração — GET/POST/PUT/DELETE /api/admin/series-escolares
 *
 * Cobre:
 *  - GET: autenticação (401/403), feliz com e sem filtro etapa (200), erro (500)
 *  - POST: Zod inválido (400), UNIQUE_VIOLATION (409), caminho feliz (201),
 *    perfil polo/escola sem permissão (403), erro (500)
 *  - PUT: sem id (400), nenhum campo (400), não encontrado (404),
 *    caminho feliz (200), erro (500)
 *  - DELETE: sem id (400), não encontrado (404), feliz (204),
 *    apenas administrador (403), erro (500)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
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

// ------------------------------------------------------------------ imports --
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { GET, POST, PUT, DELETE } from '@/app/api/admin/series-escolares/route'
import { cacheDelPattern } from '@/lib/cache'

const mockQuery = vi.mocked(pool.query)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

// ------------------------------------------------------------------ fixtures --
const SERIE_UUID = '22222222-2222-2222-2222-222222222222'

const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@semed.edu',
  tipo_usuario: 'administrador', ativo: true,
  escola_id: null, polo_id: null,
}

const TECNICO = {
  id: 'tec-1', nome: 'Tecnico', email: 'tec@semed.edu',
  tipo_usuario: 'tecnico', ativo: true,
  escola_id: null, polo_id: null,
}

const serieBody = {
  codigo: '5ANO',
  nome: '5º Ano',
  etapa: 'ANOS_INICIAIS',
  ordem: 5,
  media_aprovacao: 6.0,
}

const serieRow = {
  id: SERIE_UUID,
  codigo: '5ANO',
  nome: '5º Ano',
  etapa: 'ANOS_INICIAIS',
  ordem: 5,
  media_aprovacao: '6.0',
  media_recuperacao: '5.0',
  nota_maxima: '10.0',
  ativo: true,
  total_disciplinas: '3',
}

// ------------------------------------------------------------------ helpers --
function makeGetRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  return new NextRequest(
    `http://localhost/api/admin/series-escolares${qs ? '?' + qs : ''}`,
    { method: 'GET' }
  )
}

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/series-escolares', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makePutRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/series-escolares', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteRequest(id?: string) {
  const url = id
    ? `http://localhost/api/admin/series-escolares?id=${id}`
    : 'http://localhost/api/admin/series-escolares'
  return new NextRequest(url, { method: 'DELETE' })
}

// ================================================================ testes ===

describe('GET /api/admin/series-escolares', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const cacheModule = await import('@/lib/cache')
    vi.mocked(cacheModule.withRedisCache).mockImplementation(
      (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn() as any
    )
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('403 quando perfil não tem permissão', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'publicador' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(403)
  })

  it('200 retorna lista de séries', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [serieRow] } as any)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].codigo).toBe('5ANO')
    expect(body[0].nome).toBe('5º Ano')
  })

  it('200 retorna lista filtrada por etapa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [serieRow] } as any)
    const res = await GET(makeGetRequest({ etapa: 'ANOS_INICIAIS' }))
    expect(res.status).toBe(200)
    const queryParams = mockQuery.mock.calls[0][1] as unknown[]
    expect(queryParams).toContain('ANOS_INICIAIS')
  })

  it('200 retorna lista vazia quando sem séries cadastradas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('500 em erro inesperado de banco', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'))
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})

// ------------------------------------------------------------------ POST --

describe('POST /api/admin/series-escolares', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await POST(makePostRequest(serieBody))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil polo ou escola tenta criar série', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'polo' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await POST(makePostRequest(serieBody))
    expect(res.status).toBe(403)
  })

  it('400 quando Zod inválido — codigo ausente', async () => {
    const { codigo: _c, ...semCodigo } = serieBody
    const res = await POST(makePostRequest(semCodigo))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/inválid/i)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('400 quando Zod inválido — nome ausente', async () => {
    const { nome: _n, ...semNome } = serieBody
    const res = await POST(makePostRequest(semNome))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('400 quando Zod inválido — ordem não é número', async () => {
    const res = await POST(makePostRequest({ ...serieBody, ordem: 'cinco' }))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('201 caminho feliz — administrador cria série', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [serieRow] } as any)
    const res = await POST(makePostRequest(serieBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.codigo).toBe('5ANO')
    expect(body.nome).toBe('5º Ano')
    expect(cacheDelPattern).toHaveBeenCalledWith('series-escolares:*')
  })

  it('201 técnico cria série (também tem permissão)', async () => {
    mockGetUsuario.mockResolvedValue(TECNICO as any)
    mockQuery.mockResolvedValueOnce({ rows: [serieRow] } as any)
    const res = await POST(makePostRequest(serieBody))
    expect(res.status).toBe(201)
  })

  it('201 cria série com valores opcionais padrão (media_aprovacao 6.0)', async () => {
    const { media_aprovacao: _m, ...semMedia } = serieBody
    mockQuery.mockResolvedValueOnce({ rows: [{ ...serieRow, media_aprovacao: '6.0' }] } as any)
    const res = await POST(makePostRequest(semMedia))
    expect(res.status).toBe(201)
    // verifica que o INSERT inclui 6.0 como default
    const queryParams = mockQuery.mock.calls[0][1] as unknown[]
    expect(queryParams).toContain(6.0)
  })

  it('409 quando UNIQUE_VIOLATION (código duplicado)', async () => {
    const pgError = Object.assign(new Error('unique'), { code: '23505' })
    mockQuery.mockRejectedValueOnce(pgError)
    const res = await POST(makePostRequest(serieBody))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.mensagem).toMatch(/já existe/i)
  })

  it('500 em erro inesperado de banco', async () => {
    mockQuery.mockRejectedValueOnce(new Error('conexão perdida'))
    const res = await POST(makePostRequest(serieBody))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})

// ------------------------------------------------------------------ PUT --

describe('PUT /api/admin/series-escolares', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await PUT(makePutRequest({ id: SERIE_UUID, nome: 'Novo Nome' }))
    expect(res.status).toBe(401)
  })

  it('400 quando id não informado', async () => {
    const res = await PUT(makePutRequest({ nome: 'Novo Nome' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/id/i)
  })

  it('400 quando nenhum campo permitido enviado', async () => {
    const res = await PUT(makePutRequest({ id: SERIE_UUID, campoNaoExiste: 'teste' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/nenhum campo/i)
  })

  it('404 quando série não encontrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await PUT(makePutRequest({ id: SERIE_UUID, nome: 'Atualizado' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toMatch(/não encontrada/i)
  })

  it('200 caminho feliz — atualiza nome da série', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...serieRow, nome: '5º Ano Atualizado' }]
    } as any)
    const res = await PUT(makePutRequest({ id: SERIE_UUID, nome: '5º Ano Atualizado' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nome).toBe('5º Ano Atualizado')
    expect(cacheDelPattern).toHaveBeenCalledWith('series-escolares:*')
  })

  it('200 atualiza múltiplos campos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ...serieRow, media_aprovacao: '7.0', ativo: false }]
    } as any)
    const res = await PUT(makePutRequest({
      id: SERIE_UUID,
      media_aprovacao: 7.0,
      ativo: false,
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ativo).toBe(false)
  })

  it('500 em erro inesperado no PUT', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db error'))
    const res = await PUT(makePutRequest({ id: SERIE_UUID, nome: 'Teste' }))
    expect(res.status).toBe(500)
  })
})

// ------------------------------------------------------------------ DELETE --

describe('DELETE /api/admin/series-escolares', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await DELETE(makeDeleteRequest(SERIE_UUID))
    expect(res.status).toBe(401)
  })

  it('403 quando técnico tenta deletar série (apenas admin)', async () => {
    mockGetUsuario.mockResolvedValue(TECNICO as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await DELETE(makeDeleteRequest(SERIE_UUID))
    expect(res.status).toBe(403)
  })

  it('400 quando id não informado', async () => {
    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/id/i)
  })

  it('404 quando série não encontrada no soft-delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await DELETE(makeDeleteRequest(SERIE_UUID))
    expect(res.status).toBe(404)
  })

  it('204 soft-delete feliz — serie desativada', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: SERIE_UUID, ativo: false }]
    } as any)
    const res = await DELETE(makeDeleteRequest(SERIE_UUID))
    expect(res.status).toBe(204)
    expect(cacheDelPattern).toHaveBeenCalledWith('series-escolares:*')
  })

  it('500 em erro inesperado no DELETE', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'))
    const res = await DELETE(makeDeleteRequest(SERIE_UUID))
    expect(res.status).toBe(500)
  })
})
