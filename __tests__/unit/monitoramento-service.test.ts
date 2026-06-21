/**
 * Testes unitários — monitoramento.service.ts
 *
 * Cobre: buscarConfigMonitoramento, enviarAlerta, enviarWebhook, verificarSaude.
 * Usa mocks de pool, fetch e variáveis de ambiente.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buscarConfigMonitoramento,
  enviarAlerta,
  enviarWebhook,
} from '@/lib/services/monitoramento.service'

// ============================================================================
// Mocks globais
// ============================================================================

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }))
vi.mock('@/database/connection', () => ({
  default: { query: mockQuery },
  forceHealthCheck: vi.fn().mockResolvedValue({ healthy: true, latency: 10 }),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock do fetch global
const mockFetch = vi.fn()
global.fetch = mockFetch

// ============================================================================
// buscarConfigMonitoramento
// ============================================================================

describe('buscarConfigMonitoramento', () => {
  beforeEach(() => vi.resetAllMocks())

  it('retorna configuração quando site_config existe', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        conteudo: {
          emails_alerta: ['admin@escola.br', 'ti@escola.br'],
          webhook_url: 'https://hooks.exemplo.com/abc',
          intervalo_min: 10,
          alertar_banco: true,
          alertar_redis: false,
          alertar_erro: true,
        },
      }],
    })

    const r = await buscarConfigMonitoramento()
    expect(r.emails_alerta).toEqual(['admin@escola.br', 'ti@escola.br'])
    expect(r.webhook_url).toBe('https://hooks.exemplo.com/abc')
    expect(r.intervalo_min).toBe(10)
    expect(r.alertar_banco).toBe(true)
    expect(r.alertar_redis).toBe(false)
    expect(r.alertar_erro).toBe(true)
  })

  it('retorna defaults quando site_config está vazio', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ conteudo: {} }] })

    const r = await buscarConfigMonitoramento()
    expect(r.emails_alerta).toEqual([])
    expect(r.webhook_url).toBe('')
    expect(r.intervalo_min).toBe(5)
    expect(r.alertar_banco).toBe(true)
    expect(r.alertar_redis).toBe(true)
    expect(r.alertar_erro).toBe(true)
  })

  it('retorna defaults quando não há linha no banco', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const r = await buscarConfigMonitoramento()
    expect(r.emails_alerta).toEqual([])
    expect(r.intervalo_min).toBe(5)
  })

  it('retorna defaults sem lançar exceção quando banco falha', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'))

    const r = await buscarConfigMonitoramento()
    expect(r.emails_alerta).toEqual([])
    expect(r.intervalo_min).toBe(5)
    expect(r.alertar_banco).toBe(true)
  })

  it('alertar_redis=false quando explicitamente configurado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ conteudo: { alertar_redis: false } }],
    })
    const r = await buscarConfigMonitoramento()
    expect(r.alertar_redis).toBe(false)
  })
})

// ============================================================================
// enviarAlerta
// ============================================================================

describe('enviarAlerta', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.RESEND_API_KEY
  })

  afterEach(() => {
    delete process.env.RESEND_API_KEY
  })

  it('sem RESEND_API_KEY → retorna { enviado: false, metodo: "log" }', async () => {
    const r = await enviarAlerta('Teste', 'Corpo do alerta', ['admin@escola.br'])
    expect(r.enviado).toBe(false)
    expect(r.metodo).toBe('log')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('com RESEND_API_KEY mas lista vazia → retorna { enviado: false, metodo: "nenhum_email" }', async () => {
    process.env.RESEND_API_KEY = 'key-abc'
    const r = await enviarAlerta('Teste', 'Corpo', [])
    expect(r.enviado).toBe(false)
    expect(r.metodo).toBe('nenhum_email')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('com RESEND_API_KEY e email válido → chama fetch para Resend', async () => {
    process.env.RESEND_API_KEY = 'key-valid'
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    const r = await enviarAlerta('Alerta urgente', 'Sistema degradado', ['ti@escola.br'])
    expect(r.enviado).toBe(true)
    expect(r.metodo).toBe('resend')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('Resend retorna erro HTTP → retorna { enviado: false, metodo: "resend_erro" }', async () => {
    process.env.RESEND_API_KEY = 'key-valid'
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'Unprocessable Entity' })

    const r = await enviarAlerta('Teste', 'Corpo', ['admin@escola.br'])
    expect(r.enviado).toBe(false)
    expect(r.metodo).toBe('resend_erro')
  })

  it('fetch lança exceção → retorna { enviado: false, metodo: "erro" }', async () => {
    process.env.RESEND_API_KEY = 'key-valid'
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    const r = await enviarAlerta('Teste', 'Corpo', ['admin@escola.br'])
    expect(r.enviado).toBe(false)
    expect(r.metodo).toBe('erro')
  })

  it('inclui assunto com prefixo [SISAM] no corpo do POST', async () => {
    process.env.RESEND_API_KEY = 'key-ok'
    mockFetch.mockResolvedValueOnce({ ok: true })

    await enviarAlerta('Banco offline', 'Detalhes do erro', ['t@t.br'])
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.subject).toContain('[SISAM]')
    expect(body.subject).toContain('Banco offline')
    expect(body.to).toEqual(['t@t.br'])
  })
})

// ============================================================================
// enviarWebhook
// ============================================================================

describe('enviarWebhook', () => {
  beforeEach(() => vi.resetAllMocks())

  it('webhookUrl vazio → retorna false sem chamar fetch', async () => {
    const r = await enviarWebhook('', { status: 'erro' })
    expect(r).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('webhookUrl válido → faz POST com payload JSON', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    const r = await enviarWebhook('https://hooks.exemplo.com/xyz', { status: 'ok', servico: 'banco' })
    expect(r).toBe(true)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://hooks.exemplo.com/xyz')
    expect(opts.method).toBe('POST')
    const body = JSON.parse(opts.body)
    expect(body.sistema).toBe('SISAM')
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })

  it('webhook retorna erro HTTP → retorna false', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    const r = await enviarWebhook('https://hooks.exemplo.com/xyz', { status: 'erro' })
    expect(r).toBe(false)
  })

  it('fetch lança exceção → retorna false sem propagar', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    const r = await enviarWebhook('https://hooks.exemplo.com/xyz', { status: 'erro' })
    expect(r).toBe(false)
  })

  it('payload inclui campos extras do caller', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    await enviarWebhook('https://hook.url', { banco: 'degradado', latencia: 1500 })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.banco).toBe('degradado')
    expect(body.latencia).toBe(1500)
  })
})
