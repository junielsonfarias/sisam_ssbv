import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock database connection
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
  testConnection: vi.fn(),
  getPoolStats: vi.fn().mockReturnValue({
    total: 5,
    idle: 3,
    waiting: 0,
    activeQueries: 2,
    queuedQueries: 0,
    isHealthy: true,
    consecutiveFailures: 0,
    lastHealthCheck: new Date().toISOString(),
  }),
  forceHealthCheck: vi.fn(),
}))

vi.mock('@/middleware', () => ({
  getRequestMetrics: vi.fn().mockReturnValue({ total: 100, errors: 2 }),
}))

import { GET } from '@/app/api/health/route'
import { forceHealthCheck, getPoolStats } from '@/database/connection'
import pool from '@/database/connection'

const mockForceHealthCheck = vi.mocked(forceHealthCheck)
const mockPool = vi.mocked(pool)

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: JWT_SECRET configurado
    process.env.JWT_SECRET = 'um-segredo-super-longo-para-testes-ok'
    process.env.DB_HOST = 'localhost'
    process.env.DB_PORT = '5432'
    process.env.DB_NAME = 'educatec'
    process.env.DB_USER = 'postgres'
    process.env.DB_PASSWORD = 'secret'
  })

  it('retorna 200 com status "ok" quando banco e JWT estao saudaveis', async () => {
    mockForceHealthCheck.mockResolvedValue({ healthy: true, latency: 5 })
    mockPool.query.mockResolvedValue({ rows: [{ ativos: '2', online: '2', offline_longo: '0' }], rowCount: 1 } as any)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(body.checks.jwt).toBe('ok')
    expect(body.database_latency_ms).toBe(5)
  })

  it('retorna 500 com status "error" quando banco falha', async () => {
    mockForceHealthCheck.mockResolvedValue({ healthy: false, error: 'ECONNREFUSED', latency: 0 })
    mockPool.query.mockRejectedValue(new Error('no connection'))

    const response = await GET()
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.status).toBe('error')
    expect(body.checks.database).toBe('error')
  })

  it('retorna campo timestamp no formato ISO', async () => {
    mockForceHealthCheck.mockResolvedValue({ healthy: true, latency: 1 })
    mockPool.query.mockResolvedValue({ rows: [{ ativos: '0', online: '0', offline_longo: '0' }], rowCount: 1 } as any)

    const response = await GET()
    const body = await response.json()
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('retorna database_pool stats quando banco esta saudavel', async () => {
    mockForceHealthCheck.mockResolvedValue({ healthy: true, latency: 3 })
    mockPool.query.mockResolvedValue({ rows: [{ ativos: '1', online: '1', offline_longo: '0' }], rowCount: 1 } as any)

    const response = await GET()
    const body = await response.json()
    expect(body.database_pool).toBeDefined()
    expect(body.database_pool.total).toBe(5)
    expect(body.database_pool.isHealthy).toBe(true)
  })

  it('retorna checks.jwt = error quando JWT_SECRET ausente', async () => {
    delete process.env.JWT_SECRET
    mockForceHealthCheck.mockResolvedValue({ healthy: true, latency: 1 })
    mockPool.query.mockResolvedValue({ rows: [{ ativos: '0', online: '0', offline_longo: '0' }], rowCount: 1 } as any)

    const response = await GET()
    const body = await response.json()
    expect(body.checks.jwt).toBe('error')
    expect(body.status).toBe('error')
  })

  it('retorna checks.jwt = error quando JWT_SECRET muito curto', async () => {
    process.env.JWT_SECRET = 'short'
    mockForceHealthCheck.mockResolvedValue({ healthy: true, latency: 1 })
    mockPool.query.mockResolvedValue({ rows: [{ ativos: '0', online: '0', offline_longo: '0' }], rowCount: 1 } as any)

    const response = await GET()
    const body = await response.json()
    expect(body.checks.jwt).toBe('error')
  })

  it('nao expoe detalhes de infraestrutura quando banco falha', async () => {
    mockForceHealthCheck.mockResolvedValue({ healthy: false, error: 'ECONNREFUSED', latency: 0 })
    mockPool.query.mockRejectedValue(new Error('fail'))

    const response = await GET()
    const body = await response.json()
    // Não deve expor: suggestions, diagnostics, host_type, is_supabase
    expect(body.suggestions).toBeUndefined()
    expect(body.diagnostics).toBeUndefined()
    expect(body.database_error).toBe('Falha na conexão com o banco de dados')
  })

  it('nao expoe diagnostics, host_type ou provider info', async () => {
    mockForceHealthCheck.mockResolvedValue({ healthy: true, latency: 1 })
    mockPool.query.mockResolvedValue({ rows: [{ ativos: '0', online: '0', offline_longo: '0' }], rowCount: 1 } as any)

    const response = await GET()
    const body = await response.json()
    expect(body.diagnostics).toBeUndefined()
    // config section was removed for security (no longer exposes db_host, jwt_secret etc)
    expect(body.config).toBeUndefined()
  })
})
