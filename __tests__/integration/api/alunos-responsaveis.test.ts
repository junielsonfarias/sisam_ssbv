import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'
import { GET, POST } from '@/app/api/admin/alunos/[id]/responsaveis/route'

const mockQuery = vi.mocked(pool.query)
const mockUser = vi.mocked(getUsuarioFromRequest)

const ADMIN = { id: 'admin-1', nome: 'Admin', email: 'a@t.com', tipo_usuario: 'administrador', ativo: true } as any
const PARAMS = { params: { id: 'al-1' } }

function req(body?: unknown) {
  return new NextRequest('http://localhost/api/admin/alunos/al-1/responsaveis', {
    method: body ? 'POST' : 'GET',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
}

describe('GET /api/admin/alunos/[id]/responsaveis (Fase 3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockResolvedValue(ADMIN)
  })

  it('lista responsáveis vinculados ao aluno', async () => {
    // admin não consulta podeAcessarAluno; só a query de listagem roda.
    mockQuery.mockResolvedValueOnce({
      rows: [{
        vinculo_id: 'v1', responsavel_id: 'r1', nome: 'Ana', cpf: '12345678909',
        telefone: '91999', email: null, data_nascimento: null,
        parentesco: 'mae', principal: true, ativo: true, usuario_id: null,
      }],
      rowCount: 1,
    } as any)

    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.responsaveis).toHaveLength(1)
    expect(body.responsaveis[0].nome).toBe('Ana')
    expect(body.responsaveis[0].principal).toBe(true)
  })

  it('403 quando não autenticado', async () => {
    mockUser.mockResolvedValue(null)
    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/admin/alunos/[id]/responsaveis (Fase 3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockResolvedValue(ADMIN)
  })

  it('400 com nome ausente', async () => {
    const res = await POST(req({ telefone: '9199' }), PARAMS)
    expect(res.status).toBe(400)
  })

  it('400 com nome curto', async () => {
    const res = await POST(req({ nome: 'Jo' }), PARAMS)
    expect(res.status).toBe(400)
  })
})
