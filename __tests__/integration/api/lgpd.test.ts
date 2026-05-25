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
  registrarAuditoria: vi.fn(),
}))

vi.mock('@/lib/rate-limiter', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'

const mockPool = vi.mocked(pool)
const mockGetUser = vi.mocked(getUsuarioFromRequest)

const USER_RESPONSAVEL = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Maria Mae',
  email: 'mae@test.com',
  tipo_usuario: 'responsavel',
  ativo: true,
}

function request(method = 'POST', body?: any) {
  return new NextRequest('http://localhost/api/lgpd/test', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/lgpd/exportar-dados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER_RESPONSAVEL as any)
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any)
  })

  it('retorna 401 sem autenticacao', async () => {
    mockGetUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/lgpd/exportar-dados/route')
    const res = await POST(request())
    expect(res.status).toBe(401)
  })

  it('retorna JSON com metadados quando autenticado', async () => {
    // Mock para usuario
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: USER_RESPONSAVEL.id, nome: USER_RESPONSAVEL.nome, email: USER_RESPONSAVEL.email,
              tipo_usuario: 'responsavel', criado_em: '2026-01-01' }],
      rowCount: 1,
    } as any)
    // Mock logs_acesso vazio
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    // Mock registrarSolicitacaoExportacao
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'sol-1' }], rowCount: 1 } as any)

    const { POST } = await import('@/app/api/lgpd/exportar-dados/route')
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
    expect(res.headers.get('Content-Disposition')).toContain('attachment')
  })
})

describe('/api/lgpd/solicitar-exclusao', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUser.mockResolvedValue(USER_RESPONSAVEL as any)
    // Mock generico que satisfaz INSERT (RETURNING id) e UPDATE
    mockPool.query.mockImplementation(((sql: string) => {
      const s = String(sql)
      if (s.includes('INSERT INTO lgpd_solicitacoes')) {
        return Promise.resolve({
          rows: [{ id: 'sol-uuid', prevista_para: new Date(Date.now() + 15 * 86400000) }],
          rowCount: 1,
        })
      }
      if (s.includes('UPDATE lgpd_solicitacoes')) {
        return Promise.resolve({ rows: [{ id: 'sol-uuid' }], rowCount: 1 })
      }
      return Promise.resolve({ rows: [], rowCount: 0 })
    }) as any)
  })

  it('POST agenda exclusao com carencia de 15 dias', async () => {
    const { POST } = await import('@/app/api/lgpd/solicitar-exclusao/route')
    const res = await POST(request('POST', { motivo: 'Não quero mais usar' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mensagem).toContain('15 dias')
    expect(body.solicitacaoId).toBeDefined()
  })

  it('POST aceita sem motivo (opcional)', async () => {
    const { POST } = await import('@/app/api/lgpd/solicitar-exclusao/route')
    const res = await POST(request('POST', {}))
    expect(res.status).toBe(200)
  })

  it('GET lista solicitacoes do usuario', async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        { id: 's1', tipo: 'exclusao', status: 'pendente', criada_em: '2026-05-01' },
        { id: 's2', tipo: 'exportar', status: 'concluida', criada_em: '2026-04-15' },
      ],
      rowCount: 2,
    } as any)

    const { GET } = await import('@/app/api/lgpd/solicitar-exclusao/route')
    const res = await GET(request('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.solicitacoes).toHaveLength(2)
  })

  it('DELETE com UUID invalido retorna 400', async () => {
    const { DELETE } = await import('@/app/api/lgpd/solicitar-exclusao/route')
    const res = await DELETE(request('DELETE', { solicitacaoId: 'nao-eh-uuid' }))
    expect(res.status).toBe(400)
  })

  it('DELETE cancela solicitacao existente', async () => {
    const { DELETE } = await import('@/app/api/lgpd/solicitar-exclusao/route')
    const res = await DELETE(request('DELETE', {
      solicitacaoId: '00000000-0000-0000-0000-000000000099',
    }))
    expect(res.status).toBe(200)
  })
})

describe('/api/lgpd/portabilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER_RESPONSAVEL as any)
  })

  it('POST gera JSON formato portabilidade', async () => {
    // coletarDadosTitular: usuario
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: USER_RESPONSAVEL.id, nome: USER_RESPONSAVEL.nome, email: USER_RESPONSAVEL.email,
              tipo_usuario: 'responsavel' }],
      rowCount: 1,
    } as any)
    // logs_acesso
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    // registrarSolicitacaoExportacao
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'sol-uuid' }], rowCount: 1 } as any)

    const { POST } = await import('@/app/api/lgpd/portabilidade/route')
    const res = await POST(request())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')
  })
})
