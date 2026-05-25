import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/services/ficai.service', () => ({
  detectarInfrequencia: vi.fn(),
  abrirCaso: vi.fn(),
  listarCasos: vi.fn(),
  obterEstatisticas: vi.fn(),
  buscarCaso: vi.fn(),
  atualizarStatus: vi.fn(),
  registrarAcao: vi.fn(),
  STATUS_LABEL: { aberto: 'Aberto', contato_responsavel: 'Contato' },
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn(),
}))

import { getUsuarioFromRequest } from '@/lib/auth'
import * as ficai from '@/lib/services/ficai.service'

const mockGetUser = vi.mocked(getUsuarioFromRequest)

const USER_ADMIN = {
  id: 'a-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true,
}

function req(method = 'POST', body?: any, url = '/api/admin/ficai') {
  return new NextRequest(`http://localhost${url}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/admin/ficai', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER_ADMIN as any)
  })

  it('GET lista casos', async () => {
    vi.mocked(ficai.listarCasos).mockResolvedValue([
      { id: 'c1', aluno_nome: 'Joao', status: 'aberto', escola_nome: 'EM Tal' } as any,
    ])

    const { GET } = await import('@/app/api/admin/ficai/route')
    const res = await GET(req('GET', undefined, '/api/admin/ficai?apenasAbertos=true'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.casos).toHaveLength(1)
  })

  it('GET estatisticas retorna agregado', async () => {
    vi.mocked(ficai.obterEstatisticas).mockResolvedValue({
      total: 10, abertos: 4, resolvidos: 5, evasao_confirmada: 1, por_status: {},
    } as any)

    const { GET } = await import('@/app/api/admin/ficai/route')
    const res = await GET(req('GET', undefined, '/api/admin/ficai?estatisticas=true&ano=2026'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.estatisticas.total).toBe(10)
  })

  it('POST rejeita dados invalidos', async () => {
    const { POST } = await import('@/app/api/admin/ficai/route')
    const res = await POST(req('POST', { aluno_id: 'nao-uuid' }))
    expect(res.status).toBe(400)
  })

  it('POST abre novo caso', async () => {
    vi.mocked(ficai.abrirCaso).mockResolvedValue(true)

    const { POST } = await import('@/app/api/admin/ficai/route')
    const res = await POST(req('POST', {
      aluno_id: '00000000-0000-0000-0000-000000000001',
      escola_id: '00000000-0000-0000-0000-000000000002',
      ano_letivo: '2026',
      motivo: 'ausencia_consecutiva',
    }))
    expect(res.status).toBe(201)
  })

  it('POST retorna 409 se ja existe caso aberto', async () => {
    vi.mocked(ficai.abrirCaso).mockResolvedValue(false)

    const { POST } = await import('@/app/api/admin/ficai/route')
    const res = await POST(req('POST', {
      aluno_id: '00000000-0000-0000-0000-000000000001',
      escola_id: '00000000-0000-0000-0000-000000000002',
      ano_letivo: '2026',
      motivo: 'ausencia_consecutiva',
    }))
    expect(res.status).toBe(409)
  })
})

describe('/api/admin/ficai/detectar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER_ADMIN as any)
  })

  it('POST roda deteccao automatica', async () => {
    vi.mocked(ficai.detectarInfrequencia).mockResolvedValue({
      ausencias_consecutivas: 3,
      infrequencia_50pct: 1,
      total_casos_abertos: 4,
    } as any)

    const { POST } = await import('@/app/api/admin/ficai/detectar/route')
    const res = await POST(req('POST', { anoLetivo: '2026' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total_casos_abertos).toBe(4)
  })

  it('POST rejeita ano invalido', async () => {
    const { POST } = await import('@/app/api/admin/ficai/detectar/route')
    const res = await POST(req('POST', { anoLetivo: '202' }))
    expect(res.status).toBe(400)
  })
})
