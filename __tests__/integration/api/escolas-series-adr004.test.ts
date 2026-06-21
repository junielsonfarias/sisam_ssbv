/**
 * Testes de integração — GET / POST / DELETE /api/admin/escolas/[id]/series
 *
 * ADR-004 (fonte canônica de séries): o POST deve resolver `serie_escolar_id`
 * via `resolverSerieId` antes do UPSERT, garantindo que a chave canônica seja
 * gravada na origem e não nasça NULL a cada nova oferta de série.
 * O GET deve usar o join por `serie_escolar_id` com fallback textual para
 * linhas legadas.
 *
 * Cobre:
 *   - Caminho feliz (GET, POST, DELETE) com respostas e campos corretos.
 *   - Autorização: GET permite polo/escola; POST/DELETE exige admin/tecnico.
 *   - Regressão ADR-004: POST inclui serie_escolar_id resolvido no INSERT.
 *   - Regressão ADR-004: GET usa join canônico (serie_escolar_id) + fallback.
 *   - Validação Zod: POST com payload inválido → 400 { mensagem }.
 *   - Série já vinculada → 200 (ON CONFLICT DO NOTHING).
 *   - Escola inexistente → 404.
 *   - DELETE sem parâmetros → 400; série não encontrada → 404.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ----------------------------------------------------------------- mocks ---

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  cacheDelPattern: vi.fn(),
  withRedisCache: vi.fn((_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
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

// ---------------------------------------------------------------- imports ---

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { GET, POST, DELETE } from '@/app/api/admin/escolas/[id]/series/route'

const mockPool = vi.mocked(pool)
const mockGetUser = vi.mocked(getUsuarioFromRequest)
const mockVerificar = vi.mocked(verificarPermissao)

// --------------------------------------------------------------- fixtures ---

const ESCOLA_ID = 'escola-uuid-001'
const SERIE_ESCOLAR_ID = 'series-escolares-uuid-5ano'

function userAdmin() {
  return { id: 'u-1', nome: 'Admin', email: 'admin@semed.edu', tipo_usuario: 'administrador', ativo: true, escola_id: null, polo_id: null }
}

function userEscola() {
  return { id: 'u-2', nome: 'Escola', email: 'escola@semed.edu', tipo_usuario: 'escola', ativo: true, escola_id: ESCOLA_ID, polo_id: null }
}

function getReq(path = `/api/admin/escolas/${ESCOLA_ID}/series`) {
  return new NextRequest(`http://localhost${path}`, { method: 'GET' })
}

function postReq(body: unknown) {
  return new NextRequest(`http://localhost/api/admin/escolas/${ESCOLA_ID}/series`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function deleteReq(params: string) {
  return new NextRequest(`http://localhost/api/admin/escolas/${ESCOLA_ID}/series?${params}`, { method: 'DELETE' })
}

const routeParams = { params: { id: ESCOLA_ID } }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue(userAdmin() as any)
  mockVerificar.mockReturnValue(true)
})

// ================================================================= GET ====

describe('GET /api/admin/escolas/[id]/series', () => {
  it('caminho feliz: retorna lista de séries com total', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [
        { id: 'se-1', escola_id: ESCOLA_ID, serie: '5', serie_escolar_id: SERIE_ESCOLAR_ID, ano_letivo: '2026', nome_serie: '5º Ano', media_aprovacao: 5 },
      ],
    } as any)

    const res = await GET(getReq(), routeParams)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('series')
    expect(json).toHaveProperty('total', 1)
    expect(json.series[0].serie).toBe('5')
  })

  it('retorna 403 para usuário sem permissão', async () => {
    mockVerificar.mockReturnValue(false)
    const res = await GET(getReq(), routeParams)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('retorna 403 quando não autenticado', async () => {
    mockGetUser.mockResolvedValue(null as any)
    const res = await GET(getReq(), routeParams)
    expect(res.status).toBe(403)
  })

  it('usuário tipo escola consegue listar (GET permite polo/escola)', async () => {
    mockGetUser.mockResolvedValue(userEscola() as any)
    // verificarPermissao com lógica real de membership — escola está na lista
    mockVerificar.mockImplementation((user: any, tipos: string[]) =>
      !!user && tipos.includes(user.tipo_usuario)
    )
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await GET(getReq(), routeParams)
    expect(res.status).toBe(200)
  })

  it('regressão ADR-004: SQL do GET usa join por serie_escolar_id (chave canônica)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    await GET(getReq(), routeParams)

    const sql = String(mockPool.query.mock.calls[0][0])
    // O join canônico deve estar presente
    expect(sql).toContain('serie_escolar_id')
    // E o fallback textual para linhas legadas
    expect(sql).toContain('serie_escolar_id IS NULL')
  })

  it('retorna lista vazia sem erro quando escola não tem séries', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    const res = await GET(getReq(), routeParams)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.total).toBe(0)
    expect(json.series).toHaveLength(0)
  })
})

// ================================================================ POST ====

describe('POST /api/admin/escolas/[id]/series', () => {
  it('caminho feliz: vincula série e retorna 201 com o registro', async () => {
    // 1. SELECT escolas (escola existe)
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: ESCOLA_ID }] } as any)
    // 2. SELECT series_escolares (resolverSerieId)
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_ESCOLAR_ID }] } as any)
    // 3. INSERT series_escola (UPSERT)
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'se-novo', escola_id: ESCOLA_ID, serie: '5', serie_escolar_id: SERIE_ESCOLAR_ID, ano_letivo: '2026' }],
    } as any)

    const res = await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.serie).toBe('5')
    expect(json.serie_escolar_id).toBe(SERIE_ESCOLAR_ID)
  })

  it('regressão ADR-004: INSERT inclui serie_escolar_id resolvido como parâmetro', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: ESCOLA_ID }] } as any)
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_ESCOLAR_ID }] } as any)
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'se-novo', escola_id: ESCOLA_ID, serie: '5', serie_escolar_id: SERIE_ESCOLAR_ID, ano_letivo: '2026' }],
    } as any)

    await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)

    // O SQL do INSERT deve mencionar serie_escolar_id
    const insertSql = mockPool.query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes('INSERT INTO series_escola'))
    expect(insertSql).toBeTruthy()
    expect(insertSql).toContain('serie_escolar_id')

    // O uuid resolvido deve estar nos parâmetros do INSERT
    const insertParams = mockPool.query.mock.calls
      .find((c) => String(c[0]).includes('INSERT INTO series_escola'))
    expect(insertParams?.[1]).toContain(SERIE_ESCOLAR_ID)
  })

  it('regressão ADR-004: quando série não está no catálogo, serie_escolar_id é null (não quebra)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: ESCOLA_ID }] } as any)
    // resolverSerieId → catálogo vazio para esta série
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'se-novo', escola_id: ESCOLA_ID, serie: '10', serie_escolar_id: null, ano_letivo: '2026' }],
    } as any)

    const res = await POST(postReq({ serie: '10', ano_letivo: '2026' }), routeParams)
    // Deve retornar 201 mesmo sem uuid canônico (coluna é NULLABLE durante transição)
    expect(res.status).toBe(201)

    // serie_escolar_id=null deve ter sido passado para o INSERT
    const insertParams = mockPool.query.mock.calls
      .find((c) => String(c[0]).includes('INSERT INTO series_escola'))
    expect(insertParams?.[1]).toContain(null)
  })

  it('série já vinculada → 200 (ON CONFLICT DO NOTHING retorna linhas vazias)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: ESCOLA_ID }] } as any)
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_ESCOLAR_ID }] } as any)
    // UPSERT sem linhas retornadas = conflito
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('escola não encontrada → 404', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('validação Zod: serie vazia → 400 com mensagem', async () => {
    const res = await POST(postReq({ serie: '', ano_letivo: '2026' }), routeParams)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('validação Zod: ano_letivo ausente → 400 com mensagem', async () => {
    const res = await POST(postReq({ serie: '5' }), routeParams)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('autorização: usuario sem permissão → 403', async () => {
    mockVerificar.mockReturnValue(false)
    const res = await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)
    expect(res.status).toBe(403)
  })

  it('autorização: não autenticado → 403', async () => {
    mockGetUser.mockResolvedValue(null as any)
    const res = await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)
    expect(res.status).toBe(403)
  })

  it('autorização: usuario tipo escola não pode fazer POST (só admin/tecnico)', async () => {
    mockGetUser.mockResolvedValue(userEscola() as any)
    mockVerificar.mockImplementation((user: any, tipos: string[]) =>
      !!user && tipos.includes(user.tipo_usuario)
    )

    const res = await POST(postReq({ serie: '5', ano_letivo: '2026' }), routeParams)
    expect(res.status).toBe(403)
  })
})

// ============================================================== DELETE ====

describe('DELETE /api/admin/escolas/[id]/series', () => {
  it('caminho feliz: remove série existente → 200 com mensagem', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'se-1', escola_id: ESCOLA_ID, serie: '5', ano_letivo: '2026' }],
    } as any)

    const res = await DELETE(deleteReq('serie=5&ano_letivo=2026'), routeParams)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toHaveProperty('mensagem')
    expect(json).toHaveProperty('serie')
  })

  it('parâmetros ausentes → 400 com mensagem', async () => {
    const res = await DELETE(deleteReq(''), routeParams)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('apenas serie sem ano_letivo → 400', async () => {
    const res = await DELETE(deleteReq('serie=5'), routeParams)
    expect(res.status).toBe(400)
  })

  it('série não encontrada para a escola → 404', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    const res = await DELETE(deleteReq('serie=9&ano_letivo=2026'), routeParams)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
  })

  it('autorização: não autenticado → 403', async () => {
    mockGetUser.mockResolvedValue(null as any)
    const res = await DELETE(deleteReq('serie=5&ano_letivo=2026'), routeParams)
    expect(res.status).toBe(403)
  })

  it('autorização: usuario tipo polo não pode fazer DELETE (só admin/tecnico)', async () => {
    mockGetUser.mockResolvedValue({ ...userAdmin(), tipo_usuario: 'polo' } as any)
    mockVerificar.mockImplementation((user: any, tipos: string[]) =>
      !!user && tipos.includes(user.tipo_usuario)
    )

    const res = await DELETE(deleteReq('serie=5&ano_letivo=2026'), routeParams)
    expect(res.status).toBe(403)
  })
})
