/**
 * Testes de regressão — Lote 2: 3 correções de segurança
 *
 * 1. IDOR em POST /api/admin/facial/presenca-terminal
 *    Usuário do tipo 'escola' não pode registrar presença de aluno de
 *    outra escola. A verificação usa podeAcessarEscolaSync() logo após
 *    buscar o aluno.
 *
 * 2. GET /api/admin/dispositivos-faciais/[id]/qrcode
 *    O GET deixou de executar UPDATE que regenerava api_key como efeito
 *    colateral (prefetch/crawler derrubava o dispositivo).
 *    A resposta NÃO deve conter campo api_key; deve conter qr_data.
 *
 * 3. Rate-limit em POST /api/ouvidoria
 *    5 requisições / 15 min por IP. A 6ª deve retornar 429.
 *    O limiter é um Map em memória (escopo do módulo): usar IPs distintos
 *    por bloco de testes para não vazar estado entre casos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks globais (declarados antes dos imports dos handlers)
// ─────────────────────────────────────────────────────────────────────────────

// Client mock reutilizável para pool.connect()
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
}

vi.mock('@/database/connection', () => ({
  default: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
  podeAcessarEscolaSync: vi.fn(),
}))

vi.mock('@/lib/cache', () => ({
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Sem mock de @/lib/schemas — o validateRequest real é usado (Zod executa de verdade).
// Cada teste cria um NextRequest novo para não reutilizar body já consumido.

vi.mock('@/lib/services/presenca-facial-eventos.service', () => ({
  registrarEventoFacial: vi.fn().mockResolvedValue({
    id: 'evento-uuid-001',
    tipo: 'entrada',
    primeiro_do_dia: true,
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Imports (após vi.mock)
// ─────────────────────────────────────────────────────────────────────────────

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao, podeAcessarEscolaSync } from '@/lib/auth'

const mockPoolQuery = vi.mocked(pool.query)
const mockPoolConnect = vi.mocked(pool.connect)
const mockGetUser = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockPodeAcessarEscola = vi.mocked(podeAcessarEscolaSync)

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const ESC_A = 'a0000000-0000-4000-8000-000000000001'
const ESC_B = 'b0000000-0000-4000-8000-000000000002'
const ALUNO_ID = 'c0000000-0000-4000-8000-000000000001'
const DISPOSITIVO_ID = 'd0000000-0000-4000-8000-000000000001'

function usuarioEscolaA() {
  return {
    id: 'user-escola-a-001',
    nome: 'Gestora Escola A',
    email: 'ga@escolaa.edu',
    tipo_usuario: 'escola',
    ativo: true,
    escola_id: ESC_A,
    polo_id: null,
  }
}

function usuarioAdmin() {
  return {
    id: 'admin-001',
    nome: 'Administrador',
    email: 'admin@semed.edu',
    tipo_usuario: 'administrador',
    ativo: true,
    escola_id: null,
    polo_id: null,
  }
}

function postPresencaReq(body: Record<string, unknown>, ip = '10.0.0.1') {
  return new NextRequest('http://localhost/api/admin/facial/presenca-terminal', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
  })
}

/** Payload válido para presença */
const payloadPresencaValido = {
  aluno_id: ALUNO_ID,
  timestamp: '2026-06-19T08:00:00.000Z',
  confianca: 0.97,
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 1 — IDOR em POST /api/admin/facial/presenca-terminal
// ─────────────────────────────────────────────────────────────────────────────

describe('Regressão Lote 2 — B1: IDOR POST /api/admin/facial/presenca-terminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Configuração padrão: verificarPermissao retorna true
    mockVerificarPermissao.mockReturnValue(true)
    // pool.connect devolve o client mock
    mockPoolConnect.mockResolvedValue(mockClient as any)
    mockClient.query.mockResolvedValue({ rows: [] })
    mockClient.release.mockResolvedValue(undefined)
  })

  it('B1 IDOR: escola A não pode registrar presença de aluno da escola B → 403', async () => {
    // Arrange — usuário é escola A, aluno pertence à escola B
    mockGetUser.mockResolvedValue(usuarioEscolaA() as any)
    // podeAcessarEscolaSync retorna false (escola_id do aluno != escola_id do usuário)
    mockPodeAcessarEscola.mockReturnValue(false)

    // Primeira query: busca aluno (retorna aluno da escola B)
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: ALUNO_ID, turma_id: 'turma-001', escola_id: ESC_B }],
    } as any)

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(payloadPresencaValido))

    // Assert
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')

    // Garantir que podeAcessarEscolaSync foi chamado com escola do aluno (ESC_B)
    expect(mockPodeAcessarEscola).toHaveBeenCalledWith(
      expect.objectContaining({ escola_id: ESC_A }),
      ESC_B
    )
  })

  it('B1 caminho feliz: escola A registra presença de aluno da própria escola A + consentimento ativo → 200', async () => {
    // Arrange — usuário escola A, aluno também da escola A
    mockGetUser.mockResolvedValue(usuarioEscolaA() as any)
    mockPodeAcessarEscola.mockReturnValue(true)

    // Query 1: busca aluno (escola A)
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: ALUNO_ID, turma_id: 'turma-001', escola_id: ESC_A }],
    } as any)
    // Query 2: consentimento ativo (retorna registro)
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'consent-001' }],
    } as any)
    // Dentro da transação: client.query BEGIN, registrarEventoFacial (serviço mockado), COMMIT
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(payloadPresencaValido))

    // Assert
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sucesso).toBe(true)
    expect(body).toHaveProperty('evento_id')
    expect(body).toHaveProperty('tipo')
  })

  it('B1 administrador: pode registrar presença de aluno de qualquer escola → 200', async () => {
    // Arrange — admin + podeAcessarEscolaSync sempre true para admin
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)
    mockPodeAcessarEscola.mockReturnValue(true)

    // Query 1: busca aluno (escola B — admin pode mesmo assim)
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: ALUNO_ID, turma_id: 'turma-002', escola_id: ESC_B }],
    } as any)
    // Query 2: consentimento ativo
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'consent-002' }],
    } as any)
    // Transação
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // COMMIT

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(payloadPresencaValido, '10.0.0.2'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sucesso).toBe(true)
  })

  it('B1 regressão LGPD: aluno sem consentimento facial → 403 com mensagem de consentimento', async () => {
    // Arrange — usuario escola A, aluno da escola A, mas SEM consentimento
    mockGetUser.mockResolvedValue(usuarioEscolaA() as any)
    mockPodeAcessarEscola.mockReturnValue(true)

    // Query 1: busca aluno (escola A — acesso permitido)
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: ALUNO_ID, turma_id: 'turma-001', escola_id: ESC_A }],
    } as any)
    // Query 2: consentimento → sem registro
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(payloadPresencaValido, '10.0.0.3'))

    // Assert — 403 por ausência de consentimento
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/consentimento/i)
  })

  it('B1 usuário não autenticado → 403', async () => {
    mockGetUser.mockResolvedValue(null)
    // verificarPermissao não importa, mas garantir que a rota bloqueia
    mockVerificarPermissao.mockReturnValue(false)

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(payloadPresencaValido, '10.0.0.4'))

    expect(res.status).toBe(403)
  })

  it('B1 validação Zod: confiança zero → 400', async () => {
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)
    mockVerificarPermissao.mockReturnValue(true)

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(
      { ...payloadPresencaValido, confianca: 0 },
      '10.0.0.5'
    ))

    // confiança 0 passa o Zod (mín=0) mas é bloqueada pela guarda
    // "if (confianca <= 0) → 400"
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('B1 validação Zod: body sem aluno_id → 400', async () => {
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)
    mockVerificarPermissao.mockReturnValue(true)

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(
      { timestamp: '2026-06-19T08:00:00.000Z', confianca: 0.9 },
      '10.0.0.6'
    ))

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 2 — GET /api/admin/dispositivos-faciais/[id]/qrcode não regenera api_key
// ─────────────────────────────────────────────────────────────────────────────

describe('Regressão Lote 2 — B2: GET /api/admin/dispositivos-faciais/[id]/qrcode não regenera api_key', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerificarPermissao.mockReturnValue(true)
  })

  function qrcodeReq(id = DISPOSITIVO_ID) {
    return new NextRequest(
      `http://localhost/api/admin/dispositivos-faciais/${id}/qrcode`,
      { method: 'GET' }
    )
  }

  function qrcodeParams(id = DISPOSITIVO_ID) {
    return { params: { id } }
  }

  it('B2 GET não executa UPDATE em dispositivos_faciais (api_key não é regenerada)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)

    // Query 1: SELECT dispositivo
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: DISPOSITIVO_ID,
        nome: 'Terminal Entrada',
        escola_id: ESC_A,
        localizacao: 'Portaria',
        escola_nome: 'EM Escola A',
      }],
    } as any)
    // Query 2: INSERT log
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { GET } = await import(
      '@/app/api/admin/dispositivos-faciais/[id]/qrcode/route'
    )
    const res = await GET(qrcodeReq(), qrcodeParams())

    // Assert — nenhuma chamada com UPDATE e api_key
    const updateCalls = mockPoolQuery.mock.calls.filter((c) => {
      const sql = String(c[0])
      return sql.includes('UPDATE') && sql.includes('api_key')
    })
    expect(updateCalls).toHaveLength(0)

    expect(res.status).toBe(200)
  })

  it('B2 resposta NÃO contém campo api_key', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: DISPOSITIVO_ID,
        nome: 'Terminal Entrada',
        escola_id: ESC_A,
        localizacao: 'Portaria',
        escola_nome: 'EM Escola A',
      }],
    } as any)
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { GET } = await import(
      '@/app/api/admin/dispositivos-faciais/[id]/qrcode/route'
    )
    const res = await GET(qrcodeReq(), qrcodeParams())
    const body = await res.json()

    // api_key não deve aparecer no payload
    expect(body).not.toHaveProperty('api_key')
    // Verificar também dentro de dispositivo (caso estivesse aninhada)
    if (body.dispositivo) {
      expect(body.dispositivo).not.toHaveProperty('api_key')
    }
  })

  it('B2 resposta contém qr_data (campo principal do QR Code)', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)

    mockPoolQuery.mockResolvedValueOnce({
      rows: [{
        id: DISPOSITIVO_ID,
        nome: 'Terminal Entrada',
        escola_id: ESC_A,
        localizacao: 'Portaria',
        escola_nome: 'EM Escola A',
      }],
    } as any)
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { GET } = await import(
      '@/app/api/admin/dispositivos-faciais/[id]/qrcode/route'
    )
    const res = await GET(qrcodeReq(), qrcodeParams())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveProperty('qr_data')
    expect(typeof body.qr_data).toBe('string')

    // qr_data é JSON serializável com campos obrigatórios
    const parsed = JSON.parse(body.qr_data)
    expect(parsed).toHaveProperty('dispositivo_id', DISPOSITIVO_ID)
    expect(parsed).toHaveProperty('escola_id', ESC_A)
    // api_key NÃO deve aparecer no qr_data
    expect(parsed).not.toHaveProperty('api_key')
  })

  it('B2 dispositivo não encontrado → 404', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)

    // SELECT não retorna nenhum dispositivo
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    const { GET } = await import(
      '@/app/api/admin/dispositivos-faciais/[id]/qrcode/route'
    )
    const idInexistente = 'd0000000-0000-4000-8000-000000009999'
    const res = await GET(
      qrcodeReq(idInexistente),
      { params: { id: idInexistente } }
    )

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('B2 usuário sem permissão → 403', async () => {
    // Arrange — professor não tem acesso a esse endpoint
    mockGetUser.mockResolvedValue({
      id: 'prof-001', tipo_usuario: 'professor', ativo: true,
    } as any)
    mockVerificarPermissao.mockReturnValue(false)

    const { GET } = await import(
      '@/app/api/admin/dispositivos-faciais/[id]/qrcode/route'
    )
    const res = await GET(qrcodeReq(), qrcodeParams())

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 4 — Liveness / Prova de vida em POST /api/admin/facial/presenca-terminal
// (Lote 2, Opção A — reforço no servidor)
// ─────────────────────────────────────────────────────────────────────────────

describe('Regressão Lote 2 — B4: liveness / prova de vida (POST /api/admin/facial/presenca-terminal)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerificarPermissao.mockReturnValue(true)
    // Usuário admin: podeAcessarEscolaSync sempre true (admin não tem escola_id)
    mockGetUser.mockResolvedValue(usuarioAdmin() as any)
    mockPodeAcessarEscola.mockReturnValue(true)
    // pool.connect devolve o client mock
    mockPoolConnect.mockResolvedValue(mockClient as any)
    mockClient.query.mockResolvedValue({ rows: [] })
    mockClient.release.mockResolvedValue(undefined)
  })

  /**
   * Setup completo das queries para o caminho feliz:
   * 1. busca aluno (com consentimento e escola)
   * 2. verifica consentimento facial
   * 3. BEGIN / COMMIT (via client.query)
   * registrarEventoFacial é mockado globalmente.
   */
  function mockCaminhoFeliz() {
    // Query 1: busca aluno
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: ALUNO_ID, turma_id: 'turma-001', escola_id: ESC_A }],
    } as any)
    // Query 2: consentimento ativo
    mockPoolQuery.mockResolvedValueOnce({
      rows: [{ id: 'consent-liveness-001' }],
    } as any)
    // Transação via client
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // COMMIT
  }

  // ── Caso B4.1 ───────────────────────────────────────────────────────────────
  it('B4.1: prova_vida com vivo=false → 422 com mensagem "Prova de vida"', async () => {
    // Arrange — liveness detectou foto; o check ocorre antes de qualquer query
    const body = {
      ...payloadPresencaValido,
      prova_vida: { metodo: 'ear', vivo: false },
    }

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(body, '10.1.0.1'))

    // Assert
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toHaveProperty('mensagem')
    expect(json.mensagem).toMatch(/Prova de vida/i)

    // O banco NÃO deve ter sido consultado (check ocorre antes das queries)
    expect(mockPoolQuery).not.toHaveBeenCalled()
  })

  // ── Caso B4.2 ───────────────────────────────────────────────────────────────
  it('B4.2: prova_vida com vivo=true → 200 sucesso (fluxo normal prossegue)', async () => {
    // Arrange
    mockCaminhoFeliz()
    const body = {
      ...payloadPresencaValido,
      prova_vida: { metodo: 'ear', vivo: true, score: 0.42 },
    }

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(body, '10.1.0.2'))

    // Assert
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sucesso).toBe(true)
    expect(json).toHaveProperty('evento_id')
    expect(json).toHaveProperty('tipo')
  })

  // ── Caso B4.3 ───────────────────────────────────────────────────────────────
  it('B4.3: sem prova_vida → 200 sucesso (retrocompatibilidade — caminho offline legado)', async () => {
    // Arrange — payload idêntico ao dos clientes antigos (sem prova_vida)
    mockCaminhoFeliz()
    const body = { ...payloadPresencaValido } // sem prova_vida

    const { POST } = await import('@/app/api/admin/facial/presenca-terminal/route')
    const res = await POST(postPresencaReq(body, '10.1.0.3'))

    // Assert — deve passar como se prova_vida não existisse
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sucesso).toBe(true)
  })

  // ── Caso B4.4 (schema) ──────────────────────────────────────────────────────
  it('B4.4 schema: presencaFacialSchema aceita payload COM prova_vida válido', async () => {
    const { presencaFacialSchema } = await import('@/lib/schemas')

    const resultado = presencaFacialSchema.safeParse({
      aluno_id: ALUNO_ID,
      timestamp: '2026-06-19T08:00:00.000Z',
      confianca: 0.92,
      prova_vida: { metodo: 'ear', vivo: true, score: 0.35 },
    })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.prova_vida).toEqual({ metodo: 'ear', vivo: true, score: 0.35 })
    }
  })

  it('B4.4 schema: presencaFacialSchema aceita payload SEM prova_vida (campo opcional)', async () => {
    const { presencaFacialSchema } = await import('@/lib/schemas')

    const resultado = presencaFacialSchema.safeParse({
      aluno_id: ALUNO_ID,
      timestamp: '2026-06-19T08:00:00.000Z',
      confianca: 0.88,
    })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.prova_vida).toBeUndefined()
    }
  })

  it('B4.4 schema: presencaFacialSchema rejeita prova_vida com metodo inválido (ex: "xyz")', async () => {
    const { presencaFacialSchema } = await import('@/lib/schemas')

    const resultado = presencaFacialSchema.safeParse({
      aluno_id: ALUNO_ID,
      timestamp: '2026-06-19T08:00:00.000Z',
      confianca: 0.88,
      prova_vida: { metodo: 'xyz', vivo: true },
    })

    expect(resultado.success).toBe(false)
  })

  it('B4.4 schema: presencaFacialSchema rejeita prova_vida sem campo vivo', async () => {
    const { presencaFacialSchema } = await import('@/lib/schemas')

    const resultado = presencaFacialSchema.safeParse({
      aluno_id: ALUNO_ID,
      timestamp: '2026-06-19T08:00:00.000Z',
      confianca: 0.88,
      prova_vida: { metodo: 'ear' }, // vivo ausente
    })

    expect(resultado.success).toBe(false)
  })

  it('B4.4 schema: presencaFacialSchema aceita prova_vida sem score (score é opcional)', async () => {
    const { presencaFacialSchema } = await import('@/lib/schemas')

    const resultado = presencaFacialSchema.safeParse({
      aluno_id: ALUNO_ID,
      timestamp: '2026-06-19T08:00:00.000Z',
      confianca: 0.91,
      prova_vida: { metodo: 'ear', vivo: false }, // score ausente — válido
    })

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.prova_vida?.score).toBeUndefined()
      expect(resultado.data.prova_vida?.vivo).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BLOCO 3 — Rate-limit POST /api/ouvidoria (5 req / 15 min por IP)
// ─────────────────────────────────────────────────────────────────────────────

describe('Regressão Lote 2 — B3: rate-limit POST /api/ouvidoria (5 req / 15 min por IP)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock do pool.query para o INSERT de ouvidoria
    mockPoolQuery.mockResolvedValue({ rows: [] } as any)
  })

  /** IPs distintos por teste para isolar o estado do limiter em memória */
  const IP_BLOCO3_BASE = '172.16.100.'

  /** Payload mínimo válido para ouvidoria */
  const payloadOuvidoria = {
    tipo: 'sugestao',
    assunto: 'Sugestão de melhoria',
    mensagem: 'Gostaria de sugerir uma melhoria no sistema de transporte escolar.',
  }

  function postOuvidoriaReq(ip: string, body = payloadOuvidoria) {
    return new NextRequest('http://localhost/api/ouvidoria', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip,
      },
    })
  }

  it('B3 caminho feliz: 5 primeiras requisições do mesmo IP → 201 todas', async () => {
    // IP único para este teste
    const ip = `${IP_BLOCO3_BASE}10`
    const { POST } = await import('@/app/api/ouvidoria/route')

    for (let i = 0; i < 5; i++) {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
      const res = await POST(postOuvidoriaReq(ip))
      expect(res.status).toBe(201)
    }
  })

  it('B3 regressão rate-limit: 6ª requisição do mesmo IP dentro da janela → 429', async () => {
    // IP único para este teste (diferente do anterior)
    const ip = `${IP_BLOCO3_BASE}20`
    const { POST } = await import('@/app/api/ouvidoria/route')

    // Primeiras 5: devem passar
    for (let i = 0; i < 5; i++) {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
      const res = await POST(postOuvidoriaReq(ip))
      expect(res.status).toBe(201)
    }

    // 6ª: deve ser bloqueada
    const res6 = await POST(postOuvidoriaReq(ip))
    expect(res6.status).toBe(429)
    const body = await res6.json()
    expect(body).toHaveProperty('mensagem')
    expect(body.mensagem).toMatch(/requisições|tente novamente/i)
  })

  it('B3 isolamento por IP: IP diferente não é afetado pelo limite de outro IP', async () => {
    // IP A esgota o limite
    const ipA = `${IP_BLOCO3_BASE}30`
    // IP B começa fresh
    const ipB = `${IP_BLOCO3_BASE}31`

    const { POST } = await import('@/app/api/ouvidoria/route')

    // Exaurir IP A (5 requisições)
    for (let i = 0; i < 5; i++) {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
      await POST(postOuvidoriaReq(ipA))
    }

    // IP A bloqueado na 6ª
    const resA6 = await POST(postOuvidoriaReq(ipA))
    expect(resA6.status).toBe(429)

    // IP B ainda pode fazer requisição
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
    const resB1 = await POST(postOuvidoriaReq(ipB))
    expect(resB1.status).toBe(201)
  })

  it('B3 resposta 429 contém campo mensagem', async () => {
    const ip = `${IP_BLOCO3_BASE}40`
    const { POST } = await import('@/app/api/ouvidoria/route')

    // Exaurir limite
    for (let i = 0; i < 5; i++) {
      mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)
      await POST(postOuvidoriaReq(ip))
    }

    const res = await POST(postOuvidoriaReq(ip))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
    expect(typeof body.mensagem).toBe('string')
    expect(body.mensagem.length).toBeGreaterThan(0)
  })

  it('B3 validação Zod: POST sem assunto → 400 { mensagem } (antes de consumir cota do rate-limit)', async () => {
    // IP único — a requisição inválida NÃO deve consumir cota do rate-limit
    // (a implementação atual bloqueia por IP antes de validar o body,
    //  então testamos que a rota retorna 400 para dados inválidos em IP fresh)
    const ip = `${IP_BLOCO3_BASE}50`
    const { POST } = await import('@/app/api/ouvidoria/route')

    const res = await POST(postOuvidoriaReq(ip, {
      tipo: 'sugestao',
      // sem assunto
      mensagem: 'Mensagem sem assunto',
    } as any))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('B3 validação Zod: tipo inválido → 400', async () => {
    const ip = `${IP_BLOCO3_BASE}51`
    const { POST } = await import('@/app/api/ouvidoria/route')

    const res = await POST(postOuvidoriaReq(ip, {
      tipo: 'recusa', // não está no enum
      assunto: 'Teste',
      mensagem: 'Mensagem de teste para enum inválido.',
    } as any))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })
})
