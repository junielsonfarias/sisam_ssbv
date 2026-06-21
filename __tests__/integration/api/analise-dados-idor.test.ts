/**
 * Testes de regressão — S1: vazamento de PII / IDOR em GET /api/analise/dados
 *
 * Correção aplicada em app/api/analise/dados/route.ts:
 *  - GET passou a usar withAuth(['administrador','tecnico','polo','escola'], ...)
 *    → professor/responsavel/editor/publicador recebem 403 ANTES de qualquer
 *    query (não usa mais getUsuarioFromRequest direto, que só autenticava).
 *  - Defesa em profundidade (fail-closed): além do escopo de polo/escola, um
 *    ramo final injeta `1 = 0` no WHERE para qualquer caso não coberto
 *    (inclusive polo sem polo_id / escola sem escola_id) → resultado vazio,
 *    nunca a tabela inteira.
 *
 * Estratégia: chamar o handler exportado; mockar pool.query + lib/auth.
 * O verificarPermissao mockado replica a lógica real de membership para que
 * o caminho 403 do withAuth seja exercitado de verdade.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

// verificarPermissao com a lógica real (membership) para exercitar o 403.
// getUsuarioFromRequest controlado por teste. podeAcessar* default true
// (só importam quando filtros.escola_id/polo_id são passados na URL).
vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: (usuario: any, tipos: string[]) =>
    !!usuario && tipos.includes(usuario.tipo_usuario),
  podeAcessarEscola: vi.fn().mockResolvedValue(true),
  podeAcessarPolo: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// ------------------------------------------------------------------ imports --

import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'

const mockPoolQuery = vi.mocked(pool.query)
const mockGetUser = vi.mocked(getUsuarioFromRequest)

// ------------------------------------------------------------------ fixtures --

function user(tipo: string, extra: Record<string, unknown> = {}) {
  return {
    id: `user-${tipo}`,
    nome: `Usuário ${tipo}`,
    email: `${tipo}@semed.edu`,
    tipo_usuario: tipo,
    ativo: true,
    escola_id: null,
    polo_id: null,
    ...extra,
  }
}

function getReq(url = '/api/analise/dados') {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

/** Resposta padrão de resultados_provas (vazia — suficiente para os testes) */
function mockResultadosVazio() {
  mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
}

// ================================================================ testes ===

describe('S1 IDOR/PII: GET /api/analise/dados — restrição de perfil (403)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['professor', 'responsavel', 'editor', 'publicador'])(
    'S1: perfil %s → 403 e pool.query NÃO é chamado',
    async (tipo) => {
      mockGetUser.mockResolvedValue(user(tipo) as any)

      const { GET } = await import('@/app/api/analise/dados/route')
      const res = await GET(getReq())

      expect(res.status).toBe(403)
      expect(mockPoolQuery).not.toHaveBeenCalled()
    }
  )

  it('S1: sem autenticação → 401 e pool.query NÃO é chamado', async () => {
    mockGetUser.mockResolvedValue(null)

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(401)
    expect(mockPoolQuery).not.toHaveBeenCalled()
  })
})

describe('S1 escopo: GET /api/analise/dados — filtro por unidade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('administrador → 200 com escopo total (sem condição de escopo no WHERE)', async () => {
    mockGetUser.mockResolvedValue(user('administrador') as any)
    mockResultadosVazio()

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(200)
    const sql = mockPoolQuery.mock.calls[0][0] as string
    const params = mockPoolQuery.mock.calls[0][1] as any[]

    // sem fail-closed e sem escopo de unidade
    expect(sql).not.toContain('1 = 0')
    expect(sql).not.toContain('polo_id =')
    expect(params).toHaveLength(0)
  })

  it('tecnico → 200 com escopo total', async () => {
    mockGetUser.mockResolvedValue(user('tecnico') as any)
    mockResultadosVazio()

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(200)
    const sql = mockPoolQuery.mock.calls[0][0] as string
    expect(sql).not.toContain('1 = 0')
  })

  it('escola → 200 e WHERE filtra por escola_id do usuário', async () => {
    mockGetUser.mockResolvedValue(
      user('escola', { escola_id: 'esc-a-uuid' }) as any
    )
    mockResultadosVazio()

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(200)
    const sql = mockPoolQuery.mock.calls[0][0] as string
    const params = mockPoolQuery.mock.calls[0][1] as any[]

    expect(sql).toContain('escola_id')
    expect(sql).not.toContain('1 = 0')
    expect(params).toContain('esc-a-uuid')
  })

  it('polo → 200 e WHERE usa subselect por polo_id do usuário', async () => {
    mockGetUser.mockResolvedValue(
      user('polo', { polo_id: 'polo-1-uuid' }) as any
    )
    mockResultadosVazio()

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(200)
    const sql = mockPoolQuery.mock.calls[0][0] as string
    const params = mockPoolQuery.mock.calls[0][1] as any[]

    expect(sql).toContain('SELECT id FROM escolas WHERE polo_id =')
    expect(sql).not.toContain('1 = 0')
    expect(params).toContain('polo-1-uuid')
  })
})

describe('S1 fail-closed: GET /api/analise/dados — escopo não resolvível', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('polo com polo_id null → WHERE com condição impossível (1 = 0), resultado vazio', async () => {
    mockGetUser.mockResolvedValue(
      user('polo', { polo_id: null }) as any
    )
    mockResultadosVazio()

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(200)
    const sql = mockPoolQuery.mock.calls[0][0] as string
    expect(sql).toContain('1 = 0')

    const body = await res.json()
    expect(body.resultados).toHaveLength(0)
    expect(body.totalQuestoes).toBe(0)
  })

  it('escola com escola_id null → WHERE com condição impossível (1 = 0)', async () => {
    mockGetUser.mockResolvedValue(
      user('escola', { escola_id: null }) as any
    )
    mockResultadosVazio()

    const { GET } = await import('@/app/api/analise/dados/route')
    const res = await GET(getReq())

    expect(res.status).toBe(200)
    const sql = mockPoolQuery.mock.calls[0][0] as string
    expect(sql).toContain('1 = 0')
  })
})
