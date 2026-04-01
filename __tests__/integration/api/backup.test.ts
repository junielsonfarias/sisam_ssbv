import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks devem ser declarados antes dos imports
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
  cacheDelPattern: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

vi.mock('@/lib/services/backup.service', () => ({
  buscarConfigBackup: vi.fn(),
  listarBackups: vi.fn(),
  executarBackup: vi.fn(),
}))

import { GET, PUT, POST } from '@/app/api/admin/backup/route'
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { buscarConfigBackup, listarBackups, executarBackup } from '@/lib/services/backup.service'
import { NextRequest } from 'next/server'

const mockPool = vi.mocked(pool)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockBuscarConfig = vi.mocked(buscarConfigBackup)
const mockListarBackups = vi.mocked(listarBackups)
const mockExecutarBackup = vi.mocked(executarBackup)

function createRequest(url: string, options?: { method?: string; body?: Record<string, unknown> }): NextRequest {
  const init: RequestInit = { method: options?.method || 'GET' }
  if (options?.body) {
    init.body = JSON.stringify(options.body)
    init.headers = { 'content-type': 'application/json' }
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

const adminUser = {
  id: 'user-001',
  nome: 'Admin Teste',
  email: 'admin@test.com',
  tipo_usuario: 'administrador',
  polo_id: null,
  escola_id: null,
  ativo: true,
}

describe('GET /api/admin/backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(adminUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/admin/backup')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('retorna config e lista de backups', async () => {
    const configMock = {
      google_drive_folder_id: 'folder-123',
      manter_ultimos: 30,
      backup_automatico: true,
      horario_backup: '03:00',
    }
    const backupsMock = [
      { id: 'bk-1', tipo: 'manual', status: 'concluido', criado_em: '2026-04-01T03:00:00Z' },
      { id: 'bk-2', tipo: 'automatico', status: 'concluido', criado_em: '2026-03-31T03:00:00Z' },
    ]

    mockBuscarConfig.mockResolvedValue(configMock as any)
    mockListarBackups.mockResolvedValue(backupsMock as any)

    const request = createRequest('http://localhost:3000/api/admin/backup')
    const response = await GET(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.config).toBeDefined()
    expect(body.backups).toBeDefined()
    expect(body.backups.length).toBe(2)
    expect(body.config.backup_automatico).toBe(true)
  })

  it('retorna 500 quando service lanca erro', async () => {
    mockBuscarConfig.mockRejectedValue(new Error('Service error'))

    const request = createRequest('http://localhost:3000/api/admin/backup')
    const response = await GET(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
  })
})

describe('PUT /api/admin/backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(adminUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('atualiza config com dados validos', async () => {
    mockPool.query.mockResolvedValue({
      rows: [{
        id: '1',
        secao: 'backup',
        conteudo: { manter_ultimos: 60, backup_automatico: true, horario_backup: '04:00' },
        atualizado_em: new Date().toISOString(),
      }],
      rowCount: 1,
    } as any)

    const request = createRequest('http://localhost:3000/api/admin/backup', {
      method: 'PUT',
      body: {
        manter_ultimos: 60,
        backup_automatico: true,
        horario_backup: '04:00',
      },
    })
    const response = await PUT(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.secao).toBe('backup')
  })

  it('retorna 400 para horario_backup invalido', async () => {
    const request = createRequest('http://localhost:3000/api/admin/backup', {
      method: 'PUT',
      body: { horario_backup: 'abc' },
    })
    const response = await PUT(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.mensagem).toBe('Dados inválidos')
  })

  it('retorna 400 para manter_ultimos fora do range', async () => {
    const request = createRequest('http://localhost:3000/api/admin/backup', {
      method: 'PUT',
      body: { manter_ultimos: 999 },
    })
    const response = await PUT(request)
    expect(response.status).toBe(400)
  })

  it('retorna 500 em caso de erro no banco', async () => {
    mockPool.query.mockRejectedValue(new Error('Database error'))

    const request = createRequest('http://localhost:3000/api/admin/backup', {
      method: 'PUT',
      body: { manter_ultimos: 30, horario_backup: '03:00' },
    })
    const response = await PUT(request)
    expect(response.status).toBe(500)
  })
})

describe('POST /api/admin/backup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsuario.mockResolvedValue(adminUser as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const request = createRequest('http://localhost:3000/api/admin/backup', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('executa backup manual com sucesso', async () => {
    mockExecutarBackup.mockResolvedValue({
      status: 'concluido',
      tabelas: 5,
      registros: 1000,
      duracao_ms: 3500,
    } as any)

    const request = createRequest('http://localhost:3000/api/admin/backup', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(201)

    const body = await response.json()
    expect(body.mensagem).toBe('Backup executado com sucesso')
    expect(body.status).toBe('concluido')
  })

  it('retorna 500 quando backup falha', async () => {
    mockExecutarBackup.mockResolvedValue({
      status: 'erro',
      erro: 'Falha na conexao',
    } as any)

    const request = createRequest('http://localhost:3000/api/admin/backup', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro ao executar backup')
  })

  it('retorna 500 quando service lanca excecao', async () => {
    mockExecutarBackup.mockRejectedValue(new Error('Timeout'))

    const request = createRequest('http://localhost:3000/api/admin/backup', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
  })
})
