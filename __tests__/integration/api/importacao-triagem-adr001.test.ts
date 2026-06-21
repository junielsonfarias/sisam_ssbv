/**
 * ADR-001 — API de triagem de divergências de importação.
 *
 * Cobre os endpoints que operam sobre `importacao_divergencias`:
 *   - GET  /api/admin/importacoes/[id]/triagem            (listar)
 *   - PATCH /api/admin/importacoes/[id]/triagem/[divId]   (resolver)
 *
 * Estratégia: chamar os handlers exportados; mockar pool (query + connect) e
 * lib/auth. Verifica status HTTP + corpo + os UPDATE/INSERT disparados.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
}

vi.mock('@/database/connection', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(async () => mockClient),
  },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/auth/validar-modulo', () => ({
  validarModulo: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/services/gestor/mestre.service', () => ({
  ORIGEM_GESTOR: 'gestor',
  resolverAnoLetivoId: vi.fn().mockResolvedValue('ano-2026-uuid'),
  resolverSerieId: vi.fn().mockResolvedValue('serie-uuid'),
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
import { GET } from '@/app/api/admin/importacoes/[id]/triagem/route'
import { PATCH } from '@/app/api/admin/importacoes/[id]/triagem/[divergenciaId]/route'

const mockPoolQuery = vi.mocked(pool.query)
const mockGetUser = vi.mocked(getUsuarioFromRequest)

// ------------------------------------------------------------------ fixtures --

const IMP_ID = '11111111-1111-4111-8111-111111111111'
const DIV_ID = '22222222-2222-4222-8222-222222222222'
const ALVO_ID = '33333333-3333-4333-8333-333333333333'
const ESCOLA_ID = '44444444-4444-4444-8444-444444444444'

function adminUser() {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nome: 'Admin',
    email: 'admin@semed.edu',
    tipo_usuario: 'administrador',
    ativo: true,
    escola_id: null,
    polo_id: null,
  }
}

function reqGet(qs = '') {
  return new NextRequest(`http://localhost/api/admin/importacoes/${IMP_ID}/triagem${qs}`)
}

function reqPatch(body: unknown) {
  return new NextRequest(
    `http://localhost/api/admin/importacoes/${IMP_ID}/triagem/${DIV_ID}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
  mockClient.release.mockReset()
  mockGetUser.mockResolvedValue(adminUser() as any)
})

// ------------------------------------------------------------------ GET --

describe('GET /api/admin/importacoes/[id]/triagem', () => {
  it('lista divergências com totais por status', async () => {
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: IMP_ID, nome_arquivo: 'x.csv', ano_letivo: '2026', status: 'concluida' }] } as any)
      .mockResolvedValueOnce({
        rows: [
          { id: DIV_ID, tipo: 'turma', status: 'pendente', dado_etl: {} },
          { id: 'd2', tipo: 'aluno', status: 'vinculado', dado_etl: {} },
        ],
      } as any)

    const res = await GET(reqGet())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.totais).toEqual({ total: 2, pendentes: 1, vinculadas: 1, ignoradas: 0 })
    expect(json.divergencias).toHaveLength(2)
  })

  it('rejeita id de importação inválido com 400', async () => {
    const req = new NextRequest('http://localhost/api/admin/importacoes/nao-uuid/triagem')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('retorna 404 quando a importação não existe', async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await GET(reqGet())
    expect(res.status).toBe(404)
  })
})

// ------------------------------------------------------------------ PATCH --

describe('PATCH /api/admin/importacoes/[id]/triagem/[divergenciaId]', () => {
  it('vincular_a_existente: valida alvo e marca vinculado', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: DIV_ID, importacao_id: IMP_ID, tipo: 'turma', dado_etl: {}, status: 'pendente' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: ALVO_ID }] })                    // SELECT alvo
      .mockResolvedValueOnce({ rows: [{ id: DIV_ID, status: 'vinculado', vinculado_a_id: ALVO_ID }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] })                                   // COMMIT

    const res = await PATCH(reqPatch({ acao: 'vincular_a_existente', vinculado_a_id: ALVO_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.divergencia.status).toBe('vinculado')
    expect(json.divergencia.vinculado_a_id).toBe(ALVO_ID)
    expect(mockClient.release).toHaveBeenCalled()
  })

  it('vincular_a_existente sem vinculado_a_id retorna 400', async () => {
    const res = await PATCH(reqPatch({ acao: 'vincular_a_existente' }))
    expect(res.status).toBe(400)
  })

  it('cadastrar_no_gestor: cria turma e vincula ao novo id', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: DIV_ID, importacao_id: IMP_ID, tipo: 'turma', status: 'pendente', dado_etl: { codigo: 'T1', nome: 'Turma 1', escola_id: ESCOLA_ID, serie: '5', ano_letivo: '2026' } }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 'nova-turma-uuid' }] })          // INSERT turmas
      .mockResolvedValueOnce({ rows: [{ id: DIV_ID, status: 'vinculado', vinculado_a_id: 'nova-turma-uuid' }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] })                                   // COMMIT

    const res = await PATCH(reqPatch({ acao: 'cadastrar_no_gestor' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.divergencia.vinculado_a_id).toBe('nova-turma-uuid')
    const sqls = mockClient.query.mock.calls.map((c) => String(c[0]))
    expect(sqls.some((s) => s.includes('INSERT INTO turmas'))).toBe(true)
  })

  it('divergência já resolvida retorna 409 e faz rollback', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })                                   // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: DIV_ID, importacao_id: IMP_ID, tipo: 'turma', dado_etl: {}, status: 'vinculado' }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [] })                                   // ROLLBACK

    const res = await PATCH(reqPatch({ acao: 'vincular_a_existente', vinculado_a_id: ALVO_ID }))
    expect(res.status).toBe(409)
    const sqls = mockClient.query.mock.calls.map((c) => String(c[0]))
    expect(sqls).toContain('ROLLBACK')
  })

  it('divergência inexistente retorna 404', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })   // BEGIN
      .mockResolvedValueOnce({ rows: [] })   // SELECT FOR UPDATE (vazio)
      .mockResolvedValueOnce({ rows: [] })   // ROLLBACK

    const res = await PATCH(reqPatch({ acao: 'vincular_a_existente', vinculado_a_id: ALVO_ID }))
    expect(res.status).toBe(404)
  })
})
