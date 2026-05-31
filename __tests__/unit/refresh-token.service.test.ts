/**
 * Testes do refresh-token service (V8 ideal — auditoria 31/05/2026).
 *
 * Cobre:
 * - criarRefreshToken: gera + persiste hash, jti, family_id
 * - validarERotacionar: valida, rotaciona, marca usado, detecta reuso
 * - revogar (single/familia/usuario): UPDATE corretos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// JWT_SECRET deve estar configurado ANTES do service ser carregado
// (o modulo captura process.env.JWT_SECRET no top-level). vi.hoisted
// roda antes dos imports.
vi.hoisted(() => {
  process.env.JWT_SECRET = 'um_segredo_muito_longo_para_jwt_de_teste_12345'
})

// Mock pool ANTES de importar o service
vi.mock('@/database/connection', () => {
  const query = vi.fn()
  const connect = vi.fn()
  return { default: { query, connect } }
})

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

import pool from '@/database/connection'
import {
  criarRefreshToken,
  validarERotacionar,
  revogarRefreshToken,
  revogarFamilia,
  revogarTodosDoUsuario,
} from '@/lib/services/refresh-token.service'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)

beforeEach(() => {
  vi.clearAllMocks()
})

function criarMockClient() {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  }
  return client
}

describe('criarRefreshToken', () => {
  it('gera token JWT, jti UUID e persiste hash no banco', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const result = await criarRefreshToken({
      usuarioId: 'user-1',
      ipAddress: '1.1.1.1',
      userAgent: 'TesteAgent/1.0',
    })

    expect(result.token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/) // JWT shape
    expect(result.jti).toMatch(/^[0-9a-f-]{36}$/) // UUID v4
    expect(result.familyId).toMatch(/^[0-9a-f-]{36}$/)
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())

    // INSERT chamado com hash (nao token bruto)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO refresh_tokens')
    expect(params[0]).toBe(result.jti)
    expect(params[1]).toBe('user-1')
    expect(params[2]).not.toBe(result.token) // hash != token
    expect(params[2]).toHaveLength(64) // SHA-256 hex
    expect(params[6]).toBe('1.1.1.1')
    expect(params[7]).toBe('TesteAgent/1.0')
  })

  it('preserva family_id quando passado (rotacao mantem familia)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const familyId = 'fam-existente-uuid-1234-5678-9012-3456'
    const result = await criarRefreshToken({
      usuarioId: 'user-1',
      familyId,
      parentJti: 'jti-pai-uuid-1234-5678-9012-3456',
    })

    expect(result.familyId).toBe(familyId)
    const params = mockQuery.mock.calls[0][1]
    expect(params[3]).toBe(familyId)
    expect(params[4]).toBe('jti-pai-uuid-1234-5678-9012-3456')
  })
})

describe('validarERotacionar', () => {
  it('retorna null quando JWT invalido', async () => {
    const result = await validarERotacionar('jwt.invalido.xpto')
    expect(result).toBeNull()
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('retorna null quando jti nao existe no banco', async () => {
    const t = await criarRefreshToken({ usuarioId: 'user-1' })
    mockQuery.mockReset()
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // SELECT vazio

    const result = await validarERotacionar(t.token)
    expect(result).toBeNull()
  })

  it('REVOGA FAMILIA quando token ja usado (reuso detectado)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // INSERT inicial
    const t = await criarRefreshToken({ usuarioId: 'user-1' })

    mockQuery.mockReset()
    // SELECT acha token ja com used_at != null
    mockQuery.mockResolvedValueOnce({
      rows: [{
        jti: t.jti,
        usuario_id: 'user-1',
        family_id: t.familyId,
        token_hash: requireHashFor(t.token),
        used_at: new Date(Date.now() - 60_000),
        revoked_at: null,
        expires_at: t.expiresAt,
      }],
      rowCount: 1,
    } as any)
    // UPDATE revogar familia
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const result = await validarERotacionar(t.token)
    expect(result).toBeNull()
    // Segunda chamada deve ser UPDATE de revogacao da familia com motivo via param
    const updateCall = mockQuery.mock.calls[1]
    expect(updateCall[0]).toContain('UPDATE refresh_tokens')
    expect(updateCall[1]).toEqual([t.familyId, 'reuse_detected'])
  })

  it('retorna null quando token revogado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
    const t = await criarRefreshToken({ usuarioId: 'user-1' })

    mockQuery.mockReset()
    mockQuery.mockResolvedValueOnce({
      rows: [{
        jti: t.jti,
        usuario_id: 'user-1',
        family_id: t.familyId,
        token_hash: requireHashFor(t.token),
        used_at: null,
        revoked_at: new Date(),
        expires_at: t.expiresAt,
      }],
      rowCount: 1,
    } as any)

    const result = await validarERotacionar(t.token)
    expect(result).toBeNull()
  })

  it('rotaciona com sucesso: marca antigo + cria novo na mesma transacao', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
    const t = await criarRefreshToken({ usuarioId: 'user-1' })

    mockQuery.mockReset()
    mockQuery.mockResolvedValueOnce({
      rows: [{
        jti: t.jti,
        usuario_id: 'user-1',
        family_id: t.familyId,
        token_hash: requireHashFor(t.token),
        used_at: null,
        revoked_at: null,
        expires_at: t.expiresAt,
      }],
      rowCount: 1,
    } as any)

    const client = criarMockClient()
    client.query.mockResolvedValueOnce({}) // BEGIN
    client.query.mockResolvedValueOnce({ rowCount: 1 }) // UPDATE used_at
    client.query.mockResolvedValueOnce({ rowCount: 1 }) // INSERT novo
    client.query.mockResolvedValueOnce({}) // COMMIT
    mockConnect.mockResolvedValueOnce(client as any)

    const result = await validarERotacionar(t.token, '2.2.2.2', 'AgentNovo')
    expect(result).not.toBeNull()
    expect(result?.antigo.jti).toBe(t.jti)
    expect(result?.novo.token).toBeTruthy()
    expect(result?.novo.familyId).toBe(t.familyId)

    // BEGIN + UPDATE + INSERT + COMMIT
    expect(client.query).toHaveBeenCalledTimes(4)
    expect(client.query.mock.calls[0][0]).toBe('BEGIN')
    expect(client.query.mock.calls[3][0]).toBe('COMMIT')
    expect(client.release).toHaveBeenCalled()
  })

  it('ROLLBACK quando outro request ganhou a corrida (UPDATE 0 linhas)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
    const t = await criarRefreshToken({ usuarioId: 'user-1' })

    mockQuery.mockReset()
    mockQuery.mockResolvedValueOnce({
      rows: [{
        jti: t.jti,
        usuario_id: 'user-1',
        family_id: t.familyId,
        token_hash: requireHashFor(t.token),
        used_at: null,
        revoked_at: null,
        expires_at: t.expiresAt,
      }],
      rowCount: 1,
    } as any)

    const client = criarMockClient()
    client.query.mockResolvedValueOnce({}) // BEGIN
    client.query.mockResolvedValueOnce({ rowCount: 0 }) // UPDATE 0 linhas (corrida perdida)
    client.query.mockResolvedValueOnce({}) // ROLLBACK
    mockConnect.mockResolvedValueOnce(client as any)

    const result = await validarERotacionar(t.token)
    expect(result).toBeNull()
    expect(client.query.mock.calls[2][0]).toBe('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })
})

describe('revogar*', () => {
  it('revogarRefreshToken faz UPDATE por jti com motivo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)
    const t = await criarRefreshToken({ usuarioId: 'user-1' })

    mockQuery.mockReset()
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await revogarRefreshToken(t.token, 'logout')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('UPDATE refresh_tokens')
    expect(params).toEqual([t.jti, 'logout'])
  })

  it('revogarFamilia faz UPDATE por family_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 5 } as any)
    await revogarFamilia('fam-1', 'admin_revoke')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('UPDATE refresh_tokens')
    expect(params).toEqual(['fam-1', 'admin_revoke'])
  })

  it('revogarTodosDoUsuario faz UPDATE por usuario_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 3 } as any)
    await revogarTodosDoUsuario('user-1', 'password_changed')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('UPDATE refresh_tokens')
    expect(params).toEqual(['user-1', 'password_changed'])
  })
})

// ----------------------------------------------------------------------------
// Helper: reproduz hash do service (SHA-256 do token assinado)
// ----------------------------------------------------------------------------
import crypto from 'crypto'
function requireHashFor(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
