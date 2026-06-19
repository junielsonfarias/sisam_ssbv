import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
  hashPassword: vi.fn().mockResolvedValue('hash-bcrypt'),
}))

vi.mock('@/lib/utils/gerar-senha', () => ({
  gerarSenhaForte: vi.fn().mockReturnValue('Senha-Provisoria-123!'),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'
import { GET, POST } from '@/app/api/admin/alunos/[id]/responsaveis/route'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)
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

/** Client mock para transações cujo query é roteado por matcher. */
function fakeClient(handler: (sql: string) => any) {
  const query = vi.fn(async (sql: string) => {
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [], rowCount: 0 }
    return handler(sql)
  })
  return { query, release: vi.fn() }
}

describe('GET /api/admin/alunos/[id]/responsaveis (modelo unificado)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockResolvedValue(ADMIN)
  })

  it('lista responsáveis vinculados ao aluno (responsavel_id = usuario_id)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        vinculo_id: 'v1', usuario_id: 'u1', nome: 'Ana', cpf: '12345678909',
        telefone: '91999', email: null, data_nascimento: null,
        parentesco: 'mae', principal: true, ativo: true,
      }],
      rowCount: 1,
    } as any)

    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.responsaveis).toHaveLength(1)
    expect(body.responsaveis[0].nome).toBe('Ana')
    expect(body.responsaveis[0].principal).toBe(true)
    expect(body.responsaveis[0].responsavel_id).toBe('u1')
    expect(body.responsaveis[0].usuario_id).toBe('u1')
  })

  it('403 quando não autenticado', async () => {
    mockUser.mockResolvedValue(null)
    const res = await GET(req(), PARAMS)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/admin/alunos/[id]/responsaveis (modelo unificado)', () => {
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

  it('201 criando conta nova de usuário e vínculo aprovado', async () => {
    const client = fakeClient((sql) => {
      if (/SELECT id FROM usuarios WHERE cpf/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/SELECT id FROM usuarios WHERE email/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/INSERT INTO usuarios/i.test(sql)) return { rows: [{ id: 'novo-user' }], rowCount: 1 }
      if (/INSERT INTO responsaveis_alunos/i.test(sql)) return { rows: [{ id: 'vinc-1' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const res = await POST(req({
      nome: 'João Silva', email: 'joao@x.com', parentesco: 'pai', principal: true,
    }), PARAMS)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.responsavel_id).toBe('novo-user')
    expect(body.vinculo_id).toBe('vinc-1')
  })

  it('409 quando o e-mail/cpf colide com conta existente (23505)', async () => {
    const client = fakeClient((sql) => {
      if (/SELECT id FROM usuarios WHERE cpf/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/SELECT id FROM usuarios WHERE email/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/INSERT INTO usuarios/i.test(sql)) {
        const err: any = new Error('duplicate'); err.code = '23505'; throw err
      }
      return { rows: [], rowCount: 0 }
    })
    mockConnect.mockResolvedValue(client as any)

    const res = await POST(req({ nome: 'Zé Silva', email: 'ze@x.com' }), PARAMS)
    expect(res.status).toBe(409)
  })
})
