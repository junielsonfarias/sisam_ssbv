import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRequest } from '@/__tests__/helpers/test-utils'

// Mock database
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

// Mock auth functions
vi.mock('@/lib/auth', () => ({
  comparePassword: vi.fn(),
  generateToken: vi.fn(),
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

// Mock rate limiter
vi.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 4 }),
  resetRateLimit: vi.fn(),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  createRateLimitKey: vi.fn().mockReturnValue('127.0.0.1:test@test.com'),
}))

// Mock constants
vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>()
  return {
    ...actual,
    SESSAO: { COOKIE_MAX_AGE: 86400 },
  }
})

import { POST } from '@/app/api/auth/login/route'
import pool from '@/database/connection'
import { comparePassword, generateToken } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limiter'

const mockPool = vi.mocked(pool)
const mockCompare = vi.mocked(comparePassword)
const mockGenToken = vi.mocked(generateToken)
const mockRateLimit = vi.mocked(checkRateLimit)

// ============================================================================
// FAKE DB USERS — one per type
// ============================================================================

const fakeDbAdmin = {
  id: 'uuid-admin',
  nome: 'Admin Teste',
  email: 'admin@test.com',
  tipo_usuario: 'administrador',
  polo_id: null,
  escola_id: null,
  senha: '$2b$10$hashedpassword',
  ativo: true,
}

const fakeDbTecnico = {
  id: 'uuid-tec',
  nome: 'Tecnico Teste',
  email: 'tecnico@test.com',
  tipo_usuario: 'tecnico',
  polo_id: null,
  escola_id: null,
  senha: '$2b$10$hashedpassword',
  ativo: true,
}

const fakeDbPolo = {
  id: 'uuid-polo',
  nome: 'Polo Teste',
  email: 'polo@test.com',
  tipo_usuario: 'polo',
  polo_id: 'polo-1',
  escola_id: null,
  senha: '$2b$10$hashedpassword',
  ativo: true,
}

const fakeDbEscola = {
  id: 'uuid-escola',
  nome: 'Escola Teste',
  email: 'escola@test.com',
  tipo_usuario: 'escola',
  polo_id: null,
  escola_id: 'escola-1',
  senha: '$2b$10$hashedpassword',
  ativo: true,
}

const fakeDbProfessor = {
  id: 'uuid-prof',
  nome: 'Professor Teste',
  email: 'professor@test.com',
  tipo_usuario: 'professor',
  polo_id: null,
  escola_id: 'escola-1',
  senha: '$2b$10$hashedpassword',
  ativo: true,
}

const fakeDbEditor = {
  id: 'uuid-editor',
  nome: 'Editor Teste',
  email: 'editor@test.com',
  tipo_usuario: 'editor',
  polo_id: null,
  escola_id: null,
  senha: '$2b$10$hashedpassword',
  ativo: true,
}

function loginRequest(body: Record<string, unknown>) {
  return createRequest('/api/auth/login', { method: 'POST', body })
}

/** Helper: configura mocks para login bem-sucedido de um usuario */
function setupSuccessfulLogin(dbUser: Record<string, unknown>) {
  mockPool.query
    .mockResolvedValueOnce({ rows: [dbUser], rowCount: 1 } as any)  // SELECT usuario
    .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)         // log acesso
  // Para escola, gestor_escolar_habilitado query
  if (dbUser.tipo_usuario === 'escola' && dbUser.escola_id) {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ gestor_escolar_habilitado: true }],
      rowCount: 1,
    } as any)
  }
  mockCompare.mockResolvedValue(true)
  mockGenToken.mockReturnValue('fake-jwt-token')
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.JWT_SECRET = 'um-segredo-super-longo-para-testes-ok'
    process.env.DB_HOST = 'localhost'
    process.env.DB_NAME = 'educatec'
    process.env.DB_USER = 'postgres'
    process.env.DB_PASSWORD = 'secret'
    mockRateLimit.mockReturnValue({ allowed: true, remaining: 4 } as any)
  })

  // ==========================================================================
  // SUCESSO — LOGIN POR TIPO
  // ==========================================================================

  describe('login bem-sucedido por tipo de usuario', () => {
    it('administrador — retorna 200 com tipo_usuario correto', async () => {
      setupSuccessfulLogin(fakeDbAdmin)
      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuario.tipo_usuario).toBe('administrador')
      expect(body.usuario.polo_id).toBeNull()
      expect(body.usuario.escola_id).toBeNull()
    })

    it('tecnico — retorna 200 com tipo_usuario correto', async () => {
      setupSuccessfulLogin(fakeDbTecnico)
      const response = await POST(loginRequest({ email: 'tecnico@test.com', senha: '123456' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuario.tipo_usuario).toBe('tecnico')
    })

    it('polo — retorna 200 com polo_id no response', async () => {
      setupSuccessfulLogin(fakeDbPolo)
      const response = await POST(loginRequest({ email: 'polo@test.com', senha: '123456' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuario.tipo_usuario).toBe('polo')
      expect(body.usuario.polo_id).toBe('polo-1')
    })

    it('escola — retorna 200 com escola_id e gestor_escolar_habilitado', async () => {
      // escola login triggers extra query for gestor_escolar_habilitado
      mockPool.query
        .mockResolvedValueOnce({ rows: [fakeDbEscola], rowCount: 1 } as any) // SELECT usuario
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)             // log acesso
      mockCompare.mockResolvedValue(true)
      mockGenToken.mockReturnValue('fake-jwt-token')
      // Gestor escolar query happens after token generation
      mockPool.query.mockResolvedValueOnce({
        rows: [{ gestor_escolar_habilitado: true }],
        rowCount: 1,
      } as any)

      const response = await POST(loginRequest({ email: 'escola@test.com', senha: '123456' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuario.tipo_usuario).toBe('escola')
      expect(body.usuario.escola_id).toBe('escola-1')
      expect(body.usuario.gestor_escolar_habilitado).toBe(true)
    })

    it('professor — retorna 200 com escola_id', async () => {
      setupSuccessfulLogin(fakeDbProfessor)
      const response = await POST(loginRequest({ email: 'professor@test.com', senha: '123456' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuario.tipo_usuario).toBe('professor')
      expect(body.usuario.escola_id).toBe('escola-1')
    })

    it('editor — retorna 200 com tipo_usuario correto', async () => {
      setupSuccessfulLogin(fakeDbEditor)
      const response = await POST(loginRequest({ email: 'editor@test.com', senha: '123456' }))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.usuario.tipo_usuario).toBe('editor')
    })
  })

  // ==========================================================================
  // COOKIE E TOKEN
  // ==========================================================================

  describe('token e cookie', () => {
    it('define cookie httpOnly na resposta de sucesso', async () => {
      setupSuccessfulLogin(fakeDbAdmin)
      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toBeTruthy()
      expect(setCookie).toContain('token=')
      expect(setCookie).toContain('HttpOnly')
    })

    it('generateToken recebe payload com polo_id para usuario polo', async () => {
      setupSuccessfulLogin(fakeDbPolo)
      await POST(loginRequest({ email: 'polo@test.com', senha: '123456' }))
      expect(mockGenToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'uuid-polo',
          tipoUsuario: 'polo',
          poloId: 'polo-1',
        })
      )
    })

    it('generateToken recebe payload com escolaId para usuario escola', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [fakeDbEscola], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      mockCompare.mockResolvedValue(true)
      mockGenToken.mockReturnValue('fake-jwt-token')
      mockPool.query.mockResolvedValueOnce({
        rows: [{ gestor_escolar_habilitado: false }],
        rowCount: 1,
      } as any)

      await POST(loginRequest({ email: 'escola@test.com', senha: '123456' }))
      expect(mockGenToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'uuid-escola',
          tipoUsuario: 'escola',
          escolaId: 'escola-1',
        })
      )
    })

    it('generateToken recebe payload com escolaId para professor', async () => {
      setupSuccessfulLogin(fakeDbProfessor)
      await POST(loginRequest({ email: 'professor@test.com', senha: '123456' }))
      expect(mockGenToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'uuid-prof',
          tipoUsuario: 'professor',
          escolaId: 'escola-1',
        })
      )
    })

    it('generateToken recebe poloId=null e escolaId=null para editor', async () => {
      setupSuccessfulLogin(fakeDbEditor)
      await POST(loginRequest({ email: 'editor@test.com', senha: '123456' }))
      expect(mockGenToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'uuid-editor',
          tipoUsuario: 'editor',
          poloId: null,
          escolaId: null,
        })
      )
    })
  })

  // ==========================================================================
  // VALIDACAO DE CAMPOS
  // ==========================================================================

  describe('validacao de campos', () => {
    it('retorna 400 quando email ausente', async () => {
      const response = await POST(loginRequest({ senha: '123456' }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.mensagem).toMatch(/obrigat|inválid/i)
    })

    it('retorna 400 quando senha ausente', async () => {
      const response = await POST(loginRequest({ email: 'admin@test.com' }))
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.mensagem).toMatch(/obrigat|inválid/i)
    })

    it('retorna 400 quando campos vazios', async () => {
      const response = await POST(loginRequest({ email: '', senha: '' }))
      expect(response.status).toBe(400)
    })

    it('retorna 400 para body JSON invalido', async () => {
      const req = new (await import('next/server')).NextRequest(
        'http://localhost/api/auth/login',
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'not-json{{{',
        }
      )
      const response = await POST(req)
      expect(response.status).toBe(400)
    })
  })

  // ==========================================================================
  // AUTENTICACAO INVALIDA
  // ==========================================================================

  describe('autenticacao invalida', () => {
    it('retorna 401 quando email nao existe no banco', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      const response = await POST(loginRequest({ email: 'naoexiste@test.com', senha: '123456' }))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.mensagem).toContain('incorretos')
    })

    it('retorna 401 quando senha esta errada', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [fakeDbAdmin], rowCount: 1 } as any)
      mockCompare.mockResolvedValue(false)
      const response = await POST(loginRequest({ email: 'admin@test.com', senha: 'senhaerrada' }))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.mensagem).toContain('incorretos')
    })

    it('retorna 401 para usuario desativado (ativo=false nao retorna do banco)', async () => {
      // A query filtra por ativo=true, entao usuario inativo retorna rows=[]
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      const response = await POST(loginRequest({ email: 'inativo@test.com', senha: '123456' }))
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.mensagem).toContain('incorretos')
    })
  })

  // ==========================================================================
  // TIPO DE USUARIO INVALIDO
  // ==========================================================================

  describe('tipo de usuario invalido', () => {
    it('retorna 500 quando tipo_usuario nao esta na lista de validos', async () => {
      const userTipoInvalido = { ...fakeDbAdmin, tipo_usuario: 'superuser' }
      mockPool.query.mockResolvedValueOnce({ rows: [userTipoInvalido], rowCount: 1 } as any)
      mockCompare.mockResolvedValue(true)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
    })

    it('retorna 500 quando tipo_usuario e vazio', async () => {
      const userSemTipo = { ...fakeDbAdmin, tipo_usuario: '' }
      mockPool.query.mockResolvedValueOnce({ rows: [userSemTipo], rowCount: 1 } as any)
      mockCompare.mockResolvedValue(true)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
    })
  })

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  describe('rate limiting', () => {
    it('retorna 429 quando rate limit excedido', async () => {
      mockRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        message: 'Muitas tentativas de login. Tente novamente mais tarde.',
        blockedUntil: Date.now() + 900000,
      } as any)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(429)
      const body = await response.json()
      expect(body.erro).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  // ==========================================================================
  // ERROS DE CONFIGURACAO
  // ==========================================================================

  describe('erros de configuracao', () => {
    it('retorna 500 quando JWT_SECRET nao configurado', async () => {
      delete process.env.JWT_SECRET
      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.erro).toBe('JWT_NOT_CONFIGURED')
    })

    it('retorna 500 quando JWT_SECRET muito curto', async () => {
      process.env.JWT_SECRET = 'curto'
      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
    })

    it('retorna 500 quando variaveis de banco faltando', async () => {
      delete process.env.DB_HOST
      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.erro).toBe('DB_CONFIG_ERROR')
    })
  })

  // ==========================================================================
  // ERROS DE BANCO
  // ==========================================================================

  describe('erros de banco', () => {
    it('retorna 500 quando banco lanca ECONNREFUSED', async () => {
      const dbError = new Error('connect ECONNREFUSED') as Error & { code: string }
      dbError.code = 'ECONNREFUSED'
      mockPool.query.mockRejectedValueOnce(dbError)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.erro).toBe('DB_CONNECTION_REFUSED')
    })

    it('retorna 500 quando usuario no banco nao tem senha', async () => {
      const userSemSenha = { ...fakeDbAdmin, senha: null }
      mockPool.query.mockResolvedValueOnce({ rows: [userSemSenha], rowCount: 1 } as any)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
    })

    it('retorna 500 quando usuario no banco nao tem id', async () => {
      const userSemId = { ...fakeDbAdmin, id: null }
      mockPool.query.mockResolvedValueOnce({ rows: [userSemId], rowCount: 1 } as any)
      mockCompare.mockResolvedValue(true)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
    })

    it('retorna 500 quando banco lanca ENOTFOUND', async () => {
      const dbError = new Error('getaddrinfo ENOTFOUND') as Error & { code: string }
      dbError.code = 'ENOTFOUND'
      mockPool.query.mockRejectedValueOnce(dbError)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.erro).toBe('DB_HOST_NOT_FOUND')
    })

    it('retorna 500 quando credenciais do banco invalidas (28P01)', async () => {
      const dbError = new Error('password authentication failed') as Error & { code: string }
      dbError.code = '28P01'
      mockPool.query.mockRejectedValueOnce(dbError)

      const response = await POST(loginRequest({ email: 'admin@test.com', senha: '123456' }))
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.erro).toBe('DB_AUTH_ERROR')
    })
  })

  // ==========================================================================
  // NORMALIZACAO DE EMAIL
  // ==========================================================================

  describe('normalizacao', () => {
    it('converte email para lowercase na query', async () => {
      setupSuccessfulLogin(fakeDbAdmin)
      await POST(loginRequest({ email: 'Admin@Test.COM', senha: '123456' }))
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('email = $1'),
        ['admin@test.com']
      )
    })
  })
})
