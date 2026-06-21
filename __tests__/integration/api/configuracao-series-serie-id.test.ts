/**
 * Testes de integração — POST / PUT /api/admin/configuracao-series
 *
 * ADR-004 (fonte canônica de séries): as portas de ESCRITA de
 * `configuracao_series` devem preencher `serie_escolar_id` na origem,
 * resolvendo a chave canônica (`series_escolares.id`) via `resolverSerieId`.
 * Sem isso, o backfill é efêmero (a escrita volta a produzir a coluna NULL).
 *
 * Tolerância (mesma do ADR-004): se a série não casar no catálogo, a coluna
 * fica NULL e a operação NÃO quebra.
 *
 * Cobre (mockando pool.query):
 *   - POST: INSERT inclui serie_escolar_id com o uuid resolvido.
 *   - POST: série sem match → serie_escolar_id NULL no INSERT (sem erro, 201).
 *   - PUT: UPDATE inclui serie_escolar_id resolvido na lista de colunas.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ----------------------------------------------------------------- mocks ---

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  cacheDelPattern: vi.fn(),
  cacheKey: (...parts: string[]) => parts.join(':'),
  withRedisCache: vi.fn((_k: string, _t: number, fn: () => Promise<unknown>) => fn()),
}))

vi.mock('@/lib/config-series', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config-series')>()
  return { ...actual, limparCacheConfigSeries: vi.fn() }
})

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

// ---------------------------------------------------------------- imports ---

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { POST, PUT } from '@/app/api/admin/configuracao-series/route'

const mockPool = vi.mocked(pool)
const mockGetUser = vi.mocked(getUsuarioFromRequest)
const mockVerificar = vi.mocked(verificarPermissao)

// --------------------------------------------------------------- fixtures ---

const SERIE_ESCOLAR_ID = 'series-escolares-uuid-1ano'

function userAdmin() {
  return {
    id: 'u-1', nome: 'Admin', email: 'admin@semed.edu',
    tipo_usuario: 'administrador', ativo: true, escola_id: null, polo_id: null,
  }
}

/** Payload válido mínimo para o configuracaoSeriePostSchema. */
function payloadValido(overrides: Record<string, unknown> = {}) {
  return {
    serie: '1',
    nome_serie: '1º Ano',
    qtd_questoes_lp: 10,
    qtd_questoes_mat: 10,
    ...overrides,
  }
}

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/configuracao-series', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

function putReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/configuracao-series', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/** Captura os parâmetros da 1ª query cujo SQL casa o predicado. */
function paramsDe(predicado: (sql: string) => boolean): unknown[] | null {
  for (const call of mockPool.query.mock.calls) {
    if (predicado(String(call[0]))) return (call[1] as unknown[]) ?? []
  }
  return null
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue(userAdmin() as any)
  mockVerificar.mockReturnValue(true)
})

// ================================================================ POST ====

describe('POST /api/admin/configuracao-series — ADR-004 serie_escolar_id', () => {
  it('INSERT inclui serie_escolar_id com o uuid resolvido do catálogo', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      // checagem de série já existente → não existe
      if (texto.includes('SELECT id FROM configuracao_series')) return { rows: [] } as any
      // resolverSerieId → casa no catálogo
      if (texto.includes('FROM series_escolares')) return { rows: [{ id: SERIE_ESCOLAR_ID }] } as any
      if (texto.includes('INSERT INTO configuracao_series')) {
        return { rows: [{ id: 'cs-novo-1', serie: '1', serie_escolar_id: SERIE_ESCOLAR_ID }] } as any
      }
      return { rows: [] } as any
    }) as any)

    const res = await POST(postReq(payloadValido()))
    expect(res.status).toBe(201)

    const insertSql = mockPool.query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes('INSERT INTO configuracao_series'))
    expect(insertSql).toContain('serie_escolar_id')

    const params = paramsDe((s) => s.includes('INSERT INTO configuracao_series'))
    expect(params).not.toBeNull()
    expect(params).toContain(SERIE_ESCOLAR_ID)
  })

  it('série sem match no catálogo → serie_escolar_id NULL no INSERT (sem quebrar, 201)', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('SELECT id FROM configuracao_series')) return { rows: [] } as any
      // resolverSerieId → catálogo não casa
      if (texto.includes('FROM series_escolares')) return { rows: [] } as any
      if (texto.includes('INSERT INTO configuracao_series')) {
        return { rows: [{ id: 'cs-novo-2', serie: '1', serie_escolar_id: null }] } as any
      }
      return { rows: [] } as any
    }) as any)

    const res = await POST(postReq(payloadValido()))
    expect(res.status).toBe(201)

    const params = paramsDe((s) => s.includes('INSERT INTO configuracao_series'))
    expect(params).not.toBeNull()
    // último parâmetro é serie_escolar_id ($20) → NULL quando não casa
    expect(params!.at(-1)).toBeNull()
  })
})

// ================================================================= PUT ====

describe('PUT /api/admin/configuracao-series — ADR-004 serie_escolar_id', () => {
  it('UPDATE inclui serie_escolar_id resolvido na lista de colunas', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM series_escolares')) return { rows: [{ id: SERIE_ESCOLAR_ID }] } as any
      if (texto.includes('UPDATE configuracao_series')) {
        return { rows: [{ id: 'cs-1', serie: '1', serie_escolar_id: SERIE_ESCOLAR_ID }] } as any
      }
      return { rows: [] } as any
    }) as any)

    const res = await PUT(putReq({ serie: '1', nome_serie: '1º Ano', media_aprovacao: 6 }))
    expect(res.status).toBe(200)

    const updateSql = mockPool.query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes('UPDATE configuracao_series'))
    expect(updateSql).toContain('serie_escolar_id')

    const params = paramsDe((s) => s.includes('UPDATE configuracao_series'))
    expect(params).not.toBeNull()
    expect(params).toContain(SERIE_ESCOLAR_ID)
  })
})
