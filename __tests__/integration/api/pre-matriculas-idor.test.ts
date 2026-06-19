/**
 * Testes de regressão — C2: IDOR em pré-matrículas (GET e PUT)
 *
 * Correção aplicada em app/api/admin/pre-matriculas/route.ts:
 *  - GET e PUT agora usam withAuth([...], async (request, usuario) => {...})
 *    (antes usavam (request as any).usuario — sempre undefined, zerando o filtro).
 *  - GET: perfil 'escola' ganha filtro automático por usuario.escola_id.
 *  - PUT: analisado_por = usuario.id (não NULL); perfil 'escola' ganha
 *    cláusula AND escola_pretendida_id = $6 no UPDATE (impede IDOR de escrita).
 *
 * Estratégia: chamar o handler exportado; mockar pool.query + lib/auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/cache', () => ({
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/crypto', () => ({
  decryptCPFSeguro: (v: string) => v,   // no-op: devolve o valor como está
}))

// ------------------------------------------------------------------ imports --

import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'

const mockPoolQuery = vi.mocked(pool.query)
const mockGetUser = vi.mocked(getUsuarioFromRequest)

// ------------------------------------------------------------------ fixtures --

function adminUser() {
  return {
    id: 'admin-uuid-001',
    nome: 'Administrador',
    email: 'admin@semed.edu',
    tipo_usuario: 'administrador',
    ativo: true,
    escola_id: null,
    polo_id: null,
  }
}

function escolaUser(escolaId = 'esc-a-uuid') {
  return {
    id: 'user-escola-uuid-001',
    nome: 'Gestora Escola A',
    email: 'ga@escola.edu',
    tipo_usuario: 'escola',
    ativo: true,
    escola_id: escolaId,
    polo_id: null,
  }
}

function getReq(url = '/api/admin/pre-matriculas') {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

function putReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/pre-matriculas', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Resposta genérica de KPIs para o GET */
const kpisRow = {
  pendentes: '2', em_analise: '1', aprovadas: '0', rejeitadas: '0', total: '3',
}

// ================================================================ testes ===

describe('C2 IDOR: GET /api/admin/pre-matriculas — filtro de escopo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C2 IDOR: perfil escola enxerga apenas pré-matrículas da própria escola (filtro automático)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(escolaUser('esc-a-uuid') as any)

    // 1ª query: KPIs (não filtrado por escola — KPIs são globais do ano)
    mockPoolQuery.mockResolvedValueOnce({ rows: [kpisRow] } as any)
    // 2ª query: COUNT filtrado
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
    // 3ª query: dados paginados
    mockPoolQuery.mockResolvedValueOnce({ rows: [
      { id: 'pm-001', nome_aluno: 'Lucas', escola_pretendida_id: 'esc-a-uuid', cpf_responsavel: null, cpf_aluno: null },
    ] } as any)

    const { GET } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await GET(getReq('/api/admin/pre-matriculas?ano=2026'))

    expect(res.status).toBe(200)

    // Verifica que o WHERE da query de dados contém o filtro de escola
    // A 3ª chamada ao pool.query é a de dados paginados (index 2)
    const dadosCall = mockPoolQuery.mock.calls[2]
    const sql = dadosCall[0] as string
    const params = dadosCall[1] as any[]

    // O sql deve ter referência a escola_pretendida_id
    expect(sql).toContain('escola_pretendida_id')
    // O valor 'esc-a-uuid' deve estar nos parâmetros da query de dados
    expect(params).toContain('esc-a-uuid')
  })

  it('C2 administrador: sem filtro automático de escola na query de dados', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(adminUser() as any)

    mockPoolQuery.mockResolvedValueOnce({ rows: [kpisRow] } as any)
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ count: '5' }] } as any)
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { GET } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await GET(getReq('/api/admin/pre-matriculas?ano=2026'))

    expect(res.status).toBe(200)

    // Para admin, escola_id do usuário é null → filtro NÃO deve ser injetado
    const dadosCall = mockPoolQuery.mock.calls[2]
    const params = dadosCall[1] as any[]

    // null não deve aparecer nos params (admin não injeta escola_id)
    expect(params).not.toContain(null)
  })

  it('C2 escola: resultado JSON contém apenas dados da própria escola (paginação correta)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(escolaUser('esc-b-uuid') as any)

    mockPoolQuery.mockResolvedValueOnce({ rows: [kpisRow] } as any)
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] } as any)
    mockPoolQuery.mockResolvedValueOnce({ rows: [
      { id: 'pm-002', nome_aluno: 'Beatriz', escola_pretendida_id: 'esc-b-uuid', cpf_responsavel: null, cpf_aluno: null },
    ] } as any)

    const { GET } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await GET(getReq())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.dados).toHaveLength(1)
    expect(body.dados[0].escola_pretendida_id).toBe('esc-b-uuid')
    expect(body.paginacao).toBeDefined()
  })
})

describe('C2 IDOR: PUT /api/admin/pre-matriculas — analisado_por e escopo de escrita', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('C2 IDOR: PUT com escola — UPDATE inclui AND escola_pretendida_id = $6 e analisado_por = usuario.id (não NULL)', async () => {
    // Arrange
    const escola = escolaUser('esc-a-uuid')
    mockGetUser.mockResolvedValue(escola as any)

    // UPDATE retorna a linha atualizada
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'pm-100', status: 'em_analise', analisado_por: escola.id, escola_pretendida_id: 'esc-a-uuid' }],
    } as any)

    const { PUT } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await PUT(putReq({
      id: 'a0000000-0000-0000-0000-000000000100',
      status: 'em_analise',
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mensagem).toMatch(/atualizado/i)

    // Inspecionar a query real chamada
    const call = mockPoolQuery.mock.calls[0]
    const sql = call[0] as string
    const params = call[1] as any[]

    // A cláusula de escopo de escola DEVE estar no SQL
    expect(sql).toContain('escola_pretendida_id')
    expect(sql).toContain('$6')

    // analisado_por = usuario.id (4º parâmetro, índice 3)
    expect(params[3]).toBe(escola.id)

    // O 6º parâmetro (índice 5) deve ser o escola_id do usuário
    expect(params[5]).toBe('esc-a-uuid')
  })

  it('C2 IDOR: PUT escola em pré-matrícula de outra escola → 404 (0 linhas atualizadas)', async () => {
    // Arrange — usuário é escola A, mas a pré-matrícula pertence à escola B
    mockGetUser.mockResolvedValue(escolaUser('esc-a-uuid') as any)

    // UPDATE com AND escola_pretendida_id = 'esc-a-uuid' não casa → 0 linhas
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { PUT } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await PUT(putReq({
      id: 'b0000000-0000-0000-0000-000000000200',
      status: 'aprovada',
    }))

    // Assert — 404 por escopo (simula IDOR bloqueado)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toMatch(/não encontrada/i)
  })

  it('C2 administrador: PUT sem cláusula $6 — qualquer pré-matrícula pode ser atualizada', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(adminUser() as any)

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'pm-300', status: 'aprovada', analisado_por: 'admin-uuid-001' }],
    } as any)

    const { PUT } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await PUT(putReq({
      id: 'c0000000-0000-0000-0000-000000000300',
      status: 'aprovada',
    }))

    expect(res.status).toBe(200)

    // Para admin, SQL NÃO deve ter AND escola_pretendida_id = $6
    const sql = mockPoolQuery.mock.calls[0][0] as string
    expect(sql).not.toContain('$6')

    // analisado_por deve ser o id do admin (índice 3)
    const params = mockPoolQuery.mock.calls[0][1] as any[]
    expect(params[3]).toBe('admin-uuid-001')
  })

  it('C2 validação Zod: PUT com status inválido → 400 { mensagem }', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(adminUser() as any)

    const { PUT } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await PUT(putReq({
      id: 'c0000000-0000-0000-0000-000000000300',
      status: 'cancelada', // não está no enum do schema
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('C2 validação Zod: PUT rejeitada sem motivo → 400 { mensagem }', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(adminUser() as any)

    const { PUT } = await import('@/app/api/admin/pre-matriculas/route')
    const res = await PUT(putReq({
      id: 'c0000000-0000-0000-0000-000000000300',
      status: 'rejeitada',
      // sem motivo_rejeicao
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/motivo/i)
  })

  it('C2 sem autenticação: GET e PUT retornam 401', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null)

    const { GET, PUT } = await import('@/app/api/admin/pre-matriculas/route')

    const resGet = await GET(getReq())
    const resPut = await PUT(putReq({ id: 'a0000000-0000-0000-0000-000000000001', status: 'aprovada' }))

    expect(resGet.status).toBe(401)
    expect(resPut.status).toBe(401)
  })
})
