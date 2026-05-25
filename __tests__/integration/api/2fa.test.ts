import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
  generateToken: vi.fn().mockReturnValue('mock-jwt'),
  verifyPreAuthToken: vi.fn(),
}))

vi.mock('@/lib/services/dois-fatores.service', () => ({
  setup2FA: vi.fn(),
  ativar2FA: vi.fn(),
  verificarCodigo2FA: vi.fn(),
  desativar2FA: vi.fn(),
  status2FA: vi.fn(),
  tipoExige2FA: vi.fn().mockReturnValue(false),
  TIPOS_OBRIGATORIOS_2FA: new Set(['administrador', 'tecnico']),
}))

vi.mock('@/lib/rate-limiter', () => ({
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/rate-limiter-async', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
  resetRateLimitAsync: vi.fn(),
  createRateLimitKeyPorUsuario: vi.fn((e) => `usuario:${e}`),
}))

vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>()
  return { ...actual, SESSAO: { COOKIE_MAX_AGE: 86400 } }
})

import { getUsuarioFromRequest } from '@/lib/auth'
import * as dois from '@/lib/services/dois-fatores.service'

const mockGetUser = vi.mocked(getUsuarioFromRequest)
const mockSetup = vi.mocked(dois.setup2FA)
const mockAtivar = vi.mocked(dois.ativar2FA)
const mockStatus = vi.mocked(dois.status2FA)
const mockDesativar = vi.mocked(dois.desativar2FA)
const mockVerificar = vi.mocked(dois.verificarCodigo2FA)

const USER = {
  id: 'u-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true,
}

function req(method = 'POST', body?: any) {
  return new NextRequest('http://localhost/api/auth/2fa/x', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/auth/2fa/setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER as any)
  })

  it('rejeita usuario nao autenticado', async () => {
    mockGetUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/auth/2fa/setup/route')
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it('gera secret + QR code + codigos de backup', async () => {
    mockSetup.mockResolvedValue({
      secret: 'ABCD1234',
      otpauthUrl: 'otpauth://totp/...',
      qrCodeDataUrl: 'data:image/png;base64,...',
      backupCodes: ['CODE1-12345', 'CODE2-67890'],
    } as any)

    const { POST } = await import('@/app/api/auth/2fa/setup/route')
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.secret).toBe('ABCD1234')
    expect(body.backupCodes).toHaveLength(2)
    expect(body.qrCodeDataUrl).toContain('data:image')
  })
})

describe('/api/auth/2fa/ativar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER as any)
  })

  it('rejeita codigo invalido (regex)', async () => {
    const { POST } = await import('@/app/api/auth/2fa/ativar/route')
    const res = await POST(req('POST', { codigo: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('rejeita codigo incorreto', async () => {
    mockAtivar.mockResolvedValue({ ok: false, mensagem: 'Código inválido' } as any)
    const { POST } = await import('@/app/api/auth/2fa/ativar/route')
    const res = await POST(req('POST', { codigo: '999999' }))
    expect(res.status).toBe(400)
  })

  it('ativa com codigo correto', async () => {
    mockAtivar.mockResolvedValue({ ok: true } as any)
    const { POST } = await import('@/app/api/auth/2fa/ativar/route')
    const res = await POST(req('POST', { codigo: '123456' }))
    expect(res.status).toBe(200)
  })
})

describe('/api/auth/2fa/status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER as any)
  })

  it('retorna estado completo', async () => {
    mockStatus.mockResolvedValue({
      configurado: true, ativado: true,
      backupCodesRestantes: 8, ultimoUsoEm: new Date(),
    } as any)

    const { GET } = await import('@/app/api/auth/2fa/status/route')
    const res = await GET(req('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configurado).toBe(true)
    expect(body.backupCodesRestantes).toBe(8)
    expect(body.obrigatorio).toBe(false) // mock retorna false
  })
})

describe('/api/auth/2fa/desativar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue(USER as any)
  })

  it('exige codigo de confirmacao', async () => {
    const { POST } = await import('@/app/api/auth/2fa/desativar/route')
    const res = await POST(req('POST', {}))
    expect(res.status).toBe(400)
  })

  it('rejeita codigo incorreto', async () => {
    mockVerificar.mockResolvedValue({ ok: false, usouBackup: false } as any)
    const { POST } = await import('@/app/api/auth/2fa/desativar/route')
    const res = await POST(req('POST', { codigo: '999999' }))
    expect(res.status).toBe(401)
  })

  it('bloqueia desativacao para tipo obrigatorio', async () => {
    mockVerificar.mockResolvedValue({ ok: true, usouBackup: false } as any)
    mockDesativar.mockResolvedValue({
      ok: false,
      mensagem: '2FA é obrigatório para este perfil',
    } as any)

    const { POST } = await import('@/app/api/auth/2fa/desativar/route')
    const res = await POST(req('POST', { codigo: '123456' }))
    expect(res.status).toBe(403)
  })

  it('desativa com sucesso para tipo opcional', async () => {
    mockVerificar.mockResolvedValue({ ok: true, usouBackup: false } as any)
    mockDesativar.mockResolvedValue({ ok: true } as any)

    const { POST } = await import('@/app/api/auth/2fa/desativar/route')
    const res = await POST(req('POST', { codigo: '123456' }))
    expect(res.status).toBe(200)
  })
})
