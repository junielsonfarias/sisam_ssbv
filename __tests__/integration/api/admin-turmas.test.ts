/**
 * Testes de integração — POST/PUT/DELETE/GET /api/admin/turmas
 *
 * Cobre:
 *  - POST: Zod inválido (400), UNIQUE_VIOLATION (409), criação feliz (201),
 *    isolamento por escola (403), erro de servidor (500)
 *  - PUT: sem id (400), nenhum campo (400), turma não encontrada (404),
 *    IDOR escola → outra escola (403), mover turma (403), caminho feliz (200),
 *    UNIQUE_VIOLATION (409)
 *  - DELETE: sem id (400), turma com alunos (409), não encontrada (404),
 *    soft-delete feliz (204), apenas administrador (401/403)
 *  - GET mode=listagem (200), GET detalhado (200), autenticação (401/403)
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
import { POST, PUT, DELETE, GET } from '@/app/api/admin/turmas/route'
import { cacheDelPattern } from '@/lib/cache'

const mockQuery = vi.mocked(pool.query)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

// ------------------------------------------------------------------ fixtures --
// UUIDs válidos para passar na validação Zod
const TURMA_UUID = '11111111-1111-1111-1111-111111111111'
const ESCOLA_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const OUTRA_ESCOLA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

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

const ESCOLA_USER = {
  id: 'esc-1', nome: 'Escola A', email: 'ea@semed.edu',
  tipo_usuario: 'escola', ativo: true,
  escola_id: ESCOLA_UUID, // mesmo UUID usado no body
  polo_id: null,
}

const turmaBody = {
  codigo: 'T2026-001',
  nome: 'Turma A',
  escola_id: ESCOLA_UUID,
  serie: '5 Ano',
  ano_letivo: '2026',
  capacidade_maxima: 30,
}

const turmaRow = {
  id: TURMA_UUID,
  codigo: 'T2026-001',
  nome: 'Turma A',
  escola_id: ESCOLA_UUID,
  serie: '5 Ano',
  ano_letivo: '2026',
  capacidade_maxima: 30,
  multiserie: false,
  multietapa: false,
  ativo: true,
}

// ------------------------------------------------------------------ helpers --
function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/turmas', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makePutRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/turmas', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteRequest(id?: string) {
  const url = id
    ? `http://localhost/api/admin/turmas?id=${id}`
    : 'http://localhost/api/admin/turmas'
  return new NextRequest(url, { method: 'DELETE' })
}

function makeGetRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = `http://localhost/api/admin/turmas${qs ? '?' + qs : ''}`
  return new NextRequest(url, { method: 'GET' })
}

// ================================================================ testes ===

describe('POST /api/admin/turmas', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await POST(makePostRequest(turmaBody))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.mensagem).toMatch(/não autorizado/i)
  })

  it('403 quando perfil sem permissão', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'professor' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await POST(makePostRequest(turmaBody))
    expect(res.status).toBe(403)
  })

  it('400 quando Zod inválido — codigo ausente', async () => {
    const { codigo: _c, ...semCodigo } = turmaBody
    const res = await POST(makePostRequest(semCodigo))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('400 quando Zod inválido — escola_id não é UUID', async () => {
    const res = await POST(makePostRequest({ ...turmaBody, escola_id: 'nao-um-uuid' }))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('400 quando Zod inválido — ano_letivo inválido', async () => {
    const res = await POST(makePostRequest({ ...turmaBody, ano_letivo: 'abcd' }))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('403 quando usuário escola tenta criar turma em outra escola', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    const res = await POST(makePostRequest({ ...turmaBody, escola_id: OUTRA_ESCOLA }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/própria escola/i)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('201 caminho feliz — administrador cria turma', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [turmaRow] } as any)
    const res = await POST(makePostRequest(turmaBody))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.codigo).toBe('T2026-001')
    expect(body.escola_id).toBe(ESCOLA_UUID)
    expect(cacheDelPattern).toHaveBeenCalledWith('turmas:*')
  })

  it('201 usuário escola cria turma na PRÓPRIA escola', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    mockQuery.mockResolvedValueOnce({ rows: [turmaRow] } as any)
    const res = await POST(makePostRequest({ ...turmaBody, escola_id: ESCOLA_UUID }))
    expect(res.status).toBe(201)
  })

  it('201 capacidade_maxima padrão 35 quando não informada', async () => {
    const { capacidade_maxima: _c, ...semCap } = turmaBody
    mockQuery.mockResolvedValueOnce({ rows: [{ ...turmaRow, capacidade_maxima: 35 }] } as any)
    const res = await POST(makePostRequest(semCap))
    expect(res.status).toBe(201)
    // Verifica que o INSERT foi chamado com capacidade 35
    const queryCall = mockQuery.mock.calls[0][1] as unknown[]
    expect(queryCall).toContain(35)
  })

  it('409 quando UNIQUE_VIOLATION (código duplicado)', async () => {
    const pgError = Object.assign(new Error('unique'), { code: '23505' })
    mockQuery.mockRejectedValueOnce(pgError)
    const res = await POST(makePostRequest(turmaBody))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.mensagem).toMatch(/já existe/i)
  })

  it('500 em erro inesperado de banco', async () => {
    mockQuery.mockRejectedValueOnce(new Error('conexão encerrada'))
    const res = await POST(makePostRequest(turmaBody))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})

// ------------------------------------------------------------------ PUT --

describe('PUT /api/admin/turmas', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('400 quando id não informado', async () => {
    const res = await PUT(makePutRequest({ codigo: 'NOVO' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/id/i)
  })

  it('400 quando nenhum campo enviado além do id', async () => {
    const res = await PUT(makePutRequest({ id: TURMA_UUID }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/nenhum campo/i)
  })

  it('403 quando usuário escola tenta editar turma de outra escola — IDOR', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    // SELECT escola_id da turma → retorna outra escola
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: OUTRA_ESCOLA }] } as any)
    const res = await PUT(makePutRequest({ id: TURMA_UUID, codigo: 'MODIFICADO' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/própria escola/i)
  })

  it('403 quando usuário escola tenta mover turma para outra escola', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    // SELECT escola_id da turma → pertence à escola do usuário (OK)
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: ESCOLA_UUID }] } as any)
    // body tenta mover para outra escola, mas fornece outro campo (codigo) para não cair em "nenhum campo"
    const res = await PUT(makePutRequest({ id: TURMA_UUID, escola_id: OUTRA_ESCOLA, codigo: 'X' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/não pode mover/i)
  })

  it('404 quando turma não encontrada na verificação IDOR (escola user)', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await PUT(makePutRequest({ id: TURMA_UUID, codigo: 'NOVO' }))
    expect(res.status).toBe(404)
  })

  it('404 quando UPDATE não encontra a turma (admin)', async () => {
    // admin pula verificação de escola, vai direto ao UPDATE que retorna vazio
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await PUT(makePutRequest({ id: TURMA_UUID, codigo: 'NOVO' }))
    expect(res.status).toBe(404)
  })

  it('200 caminho feliz — admin atualiza turma', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...turmaRow, codigo: 'T2026-002' }] } as any)
    const res = await PUT(makePutRequest({ id: TURMA_UUID, codigo: 'T2026-002' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.codigo).toBe('T2026-002')
    expect(cacheDelPattern).toHaveBeenCalledWith('turmas:*')
  })

  it('200 usuário escola atualiza turma da própria escola', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    // SELECT escola_id → ok (mesma escola)
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: ESCOLA_UUID }] } as any)
    // UPDATE → sucesso
    mockQuery.mockResolvedValueOnce({ rows: [{ ...turmaRow, nome: 'Turma Atualizada' }] } as any)
    const res = await PUT(makePutRequest({ id: TURMA_UUID, nome: 'Turma Atualizada' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.nome).toBe('Turma Atualizada')
  })

  it('409 UNIQUE_VIOLATION na atualização', async () => {
    const pgError = Object.assign(new Error('unique'), { code: '23505' })
    mockQuery.mockRejectedValueOnce(pgError)
    const res = await PUT(makePutRequest({ id: TURMA_UUID, codigo: 'DUPLICADO' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.mensagem).toMatch(/já existe/i)
  })

  it('500 em erro inesperado no PUT', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'))
    const res = await PUT(makePutRequest({ id: TURMA_UUID, codigo: 'X' }))
    expect(res.status).toBe(500)
  })
})

// ------------------------------------------------------------------ DELETE --

describe('DELETE /api/admin/turmas', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await DELETE(makeDeleteRequest(TURMA_UUID))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil não é administrador', async () => {
    mockGetUsuario.mockResolvedValue(TECNICO as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await DELETE(makeDeleteRequest(TURMA_UUID))
    expect(res.status).toBe(403)
  })

  it('400 quando id não informado na query', async () => {
    const res = await DELETE(makeDeleteRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/id/i)
  })

  it('409 quando turma possui alunos vinculados', async () => {
    // COUNT alunos → 5 alunos
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
    const res = await DELETE(makeDeleteRequest(TURMA_UUID))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.mensagem).toMatch(/5 aluno/i)
    // Não chegou no UPDATE (verificar que foi chamado apenas 1x = COUNT)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('404 quando turma não encontrada no soft-delete', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] } as any) // COUNT = 0
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)                // UPDATE vazio
    const res = await DELETE(makeDeleteRequest(TURMA_UUID))
    expect(res.status).toBe(404)
  })

  it('204 soft-delete feliz', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)  // sem alunos
    mockQuery.mockResolvedValueOnce({ rows: [{ id: TURMA_UUID }] } as any) // UPDATE ok
    const res = await DELETE(makeDeleteRequest(TURMA_UUID))
    expect(res.status).toBe(204)
    expect(cacheDelPattern).toHaveBeenCalledWith('turmas:*')
  })

  it('500 em erro inesperado no DELETE', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db error'))
    const res = await DELETE(makeDeleteRequest(TURMA_UUID))
    expect(res.status).toBe(500)
  })
})

// ------------------------------------------------------------------ GET --

describe('GET /api/admin/turmas', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    // Reconfigurar o mock de withRedisCache para chamar a função interna
    const cacheModule = await import('@/lib/cache')
    vi.mocked(cacheModule.withRedisCache).mockImplementation(
      (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn() as any
    )
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await GET(makeGetRequest({ mode: 'listagem' }))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil sem permissão de leitura', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'publicador' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await GET(makeGetRequest({ mode: 'listagem' }))
    expect(res.status).toBe(403)
  })

  it('200 mode=listagem retorna array de turmas com campos convertidos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: TURMA_UUID, codigo: 'T2026-001', nome: 'Turma A',
        serie: '5 Ano', ano_letivo: '2026', escola_id: ESCOLA_UUID,
        capacidade_maxima: '30', multiserie: false, multietapa: false,
        escola_nome: 'Escola A', polo_nome: 'Polo P1',
        total_alunos: '25',
      }],
    } as any)
    const res = await GET(makeGetRequest({ mode: 'listagem' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].total_alunos).toBe(25) // convertido de string para número
    expect(body[0].capacidade_maxima).toBe(30)
    expect(body[0].multiserie).toBe(false)
  })

  it('200 mode=listagem com filtros escola_id e ano_letivo inclui parâmetros na query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await GET(makeGetRequest({
      mode: 'listagem', escola_id: ESCOLA_UUID, ano_letivo: '2026'
    }))
    expect(res.status).toBe(200)
    const queryParams = mockQuery.mock.calls[0][1] as unknown[]
    expect(queryParams).toContain(ESCOLA_UUID)
    expect(queryParams).toContain('2026')
  })

  it('200 GET detalhado retorna array de turmas com médias como números', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: TURMA_UUID, codigo: 'T2026-001', nome: 'Turma A',
        serie: '5 Ano', escola_id: ESCOLA_UUID, escola_nome: 'Escola A',
        total_alunos: '20', media_geral: '7.50', media_lp: '7.0', media_mat: '8.0',
        media_prod: '7.5', media_ch: null, media_cn: null,
        presentes: '18', faltantes: '2',
      }],
    } as any)
    const res = await GET(makeGetRequest({ ano_letivo: '2026' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].media_geral).toBe(7.5)
    expect(body[0].total_alunos).toBe(20)
    expect(body[0].presentes).toBe(18)
  })

  it('200 GET detalhado: série 5 (anos iniciais) — media_ch e media_cn retornam null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: TURMA_UUID, codigo: 'T2026-001', nome: 'Turma A',
        serie: '5 Ano', escola_id: ESCOLA_UUID, escola_nome: 'Escola A',
        total_alunos: '20', media_geral: '7.50', media_lp: '7.0', media_mat: '8.0',
        media_prod: '7.5', media_ch: '6.5', media_cn: '6.0',
        presentes: '18', faltantes: '2',
      }],
    } as any)
    const res = await GET(makeGetRequest({ ano_letivo: '2026', serie: '5' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    // série 5 = anos iniciais → CH e CN devem ser null
    expect(body[0].media_ch).toBeNull()
    expect(body[0].media_cn).toBeNull()
    // PROD deve aparecer
    expect(body[0].media_prod).toBe(7.5)
  })

  it('200 GET detalhado: série 6 (anos finais) — media_prod retorna null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: TURMA_UUID, codigo: 'T2026-009', nome: 'Turma 6A',
        serie: '6 Ano', escola_id: ESCOLA_UUID, escola_nome: 'Escola A',
        total_alunos: '22', media_geral: '6.80', media_lp: '6.5', media_mat: '7.1',
        media_prod: '5.9', media_ch: '6.8', media_cn: '6.9',
        presentes: '20', faltantes: '2',
      }],
    } as any)
    const res = await GET(makeGetRequest({ ano_letivo: '2026', serie: '6' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    // série 6 = anos finais → PROD deve ser null
    expect(body[0].media_prod).toBeNull()
    // CH e CN devem aparecer
    expect(body[0].media_ch).toBe(6.8)
    expect(body[0].media_cn).toBe(6.9)
  })

  it('200 GET detalhado: lista vazia quando nenhuma turma encontrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await GET(makeGetRequest({ ano_letivo: '2099' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('200 mode=listagem com escolas_ids filtra por IDs especificados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await GET(makeGetRequest({
      mode: 'listagem',
      escolas_ids: `${ESCOLA_UUID},${OUTRA_ESCOLA}`,
    }))
    expect(res.status).toBe(200)
  })
})
