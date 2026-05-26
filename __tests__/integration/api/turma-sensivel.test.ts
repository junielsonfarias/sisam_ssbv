import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/cache', () => ({
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { registrarAuditoria } from '@/lib/services/auditoria.service'
import { cacheDelPattern } from '@/lib/cache'

const mockQuery = vi.mocked(pool.query)
const mockUser = vi.mocked(getUsuarioFromRequest)
const mockPerm = vi.mocked(verificarPermissao)
const mockAudit = vi.mocked(registrarAuditoria)
const mockCacheDel = vi.mocked(cacheDelPattern)

const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true,
} as const

const TECNICO = {
  id: 'tec-1', nome: 'Tecnico', email: 'tec@test.com',
  tipo_usuario: 'tecnico', ativo: true,
} as const

const TURMA_ID = '11111111-1111-1111-1111-111111111111'

function req(body: unknown, url = `/api/admin/turmas/${TURMA_ID}/sensivel`) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function rowsTurma(sensivel: boolean) {
  return {
    rows: [{
      id: TURMA_ID, codigo: 'IUMP01', sensivel,
      escola_id: 'escola-1', ano_letivo: '2026',
    }],
    rowCount: 1,
  } as any
}

describe('PATCH /api/admin/turmas/[id]/sensivel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockUser.mockResolvedValue(ADMIN as any)
    mockPerm.mockReturnValue(true)
    mockAudit.mockResolvedValue(undefined)
    mockCacheDel.mockResolvedValue(undefined as any)
  })

  it('400 quando body tem sensivel nao-booleano', async () => {
    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ sensivel: 'sim' }))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('400 quando body falta o campo sensivel', async () => {
    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ outraCoisa: true }))
    expect(res.status).toBe(400)
  })

  it('404 quando turma nao existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ sensivel: true }))
    expect(res.status).toBe(404)
  })

  it('no-op quando valor solicitado e igual ao atual (200 sem UPDATE nem auditoria)', async () => {
    mockQuery.mockResolvedValueOnce(rowsTurma(true)) // ja sensivel
    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ sensivel: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mensagem).toMatch(/nenhuma altera/i)
    // So fez SELECT da turma, nao chegou no UPDATE
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockAudit).not.toHaveBeenCalled()
    expect(mockCacheDel).not.toHaveBeenCalled()
  })

  it('200 ao marcar como sensivel: audita DIARIO_MARCAR_SENSIVEL e invalida cache', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma(false))                                  // SELECT
      .mockResolvedValueOnce({ rows: [{ id: TURMA_ID, sensivel: true }], rowCount: 1 } as any) // UPDATE

    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ sensivel: true }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sensivel).toBe(true)
    expect(body.mensagem).toMatch(/marcada como sens[ií]vel/i)

    expect(mockAudit).toHaveBeenCalledTimes(1)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'DIARIO_MARCAR_SENSIVEL',
      entidade: 'turma',
      entidadeId: TURMA_ID,
      detalhes: expect.objectContaining({ de: false, para: true }),
    }))
    expect(mockCacheDel).toHaveBeenCalledWith('turmas:*')
  })

  it('200 ao desmarcar: audita DIARIO_DESMARCAR_SENSIVEL', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma(true))
      .mockResolvedValueOnce({ rows: [{ id: TURMA_ID, sensivel: false }], rowCount: 1 } as any)

    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ sensivel: false }))

    expect(res.status).toBe(200)
    expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'DIARIO_DESMARCAR_SENSIVEL',
      detalhes: expect.objectContaining({ de: true, para: false }),
    }))
  })

  it('tecnico tem permissao (alem de administrador)', async () => {
    mockUser.mockResolvedValueOnce(TECNICO as any)
    mockQuery
      .mockResolvedValueOnce(rowsTurma(false))
      .mockResolvedValueOnce({ rows: [{ id: TURMA_ID, sensivel: true }], rowCount: 1 } as any)

    const { PATCH } = await import('@/app/api/admin/turmas/[id]/sensivel/route')
    const res = await PATCH(req({ sensivel: true }))
    expect(res.status).toBe(200)
  })
})
