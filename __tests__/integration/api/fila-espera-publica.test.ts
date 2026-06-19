/**
 * Testes de integração — Rota B: /api/admin/fila-espera (tabela fila_espera_publica)
 *
 * Cobre:
 *  1. Tabela correta: todas as queries SQL usam `fila_espera_publica` e NÃO
 *     referenciam `fila_espera` isolada (regex \bfila_espera\b(?!_publica)).
 *  2. Contrato público no POST/INSERT: colunas `aluno_nome`, sem `aluno_id`,
 *     `turma_id` ou `data_convocacao`.
 *  3. Status no PUT: `aprovado`/`rejeitado`/`matriculado` → `data_resolucao = NOW()`;
 *     `aguardando` NÃO grava `data_resolucao`; status `convocado` → 400 (fora
 *     do enum público).
 *  4. Autorização: sem token → 401; tipo sem permissão (`professor`) → 403;
 *     módulo `semed` desabilitado → 403; escola não pode criar entrada de outra
 *     escola (IDOR de escrita) → 403; Zod inválido → 400.
 *
 * Não há testes anteriores desta rota — confirmado via grep em __tests__/.
 *
 * Mock strategy:
 *  - `@/database/connection` → pool.query mockado por chamada
 *  - `@/lib/cache` → cacheDelPattern no-op
 *  - `@/lib/auth` → getUsuarioFromRequest + verificarPermissao configuráveis
 *  - `@/lib/auth/validar-modulo` → validarModulo retornando true por padrão
 *  - `@/lib/logger` → no-op
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

vi.mock('@/lib/auth/validar-modulo', () => ({
  validarModulo: vi.fn().mockReturnValue(true),
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

// ------------------------------------------------------------------ imports --

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { validarModulo } from '@/lib/auth/validar-modulo'

const mockPoolQuery = vi.mocked(pool.query)
const mockGetUser = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockValidarModulo = vi.mocked(validarModulo)

// ------------------------------------------------------------------ fixtures --

/** UUID válido para testes */
const ESCOLA_A = 'aaaa0000-0000-0000-0000-000000000001'
const ESCOLA_B = 'bbbb0000-0000-0000-0000-000000000002'
const REGISTRO_ID = 'cccc0000-0000-0000-0000-000000000003'

function adminUser() {
  return {
    id: 'admin-uuid-001',
    nome: 'Administrador',
    email: 'admin@semed.edu',
    tipo_usuario: 'administrador',
    ativo: true,
    escola_id: null,
    polo_id: null,
    acesso_semed: true,
    acesso_admin: true,
  }
}

function escolaUser(escolaId = ESCOLA_A) {
  return {
    id: 'user-escola-uuid-001',
    nome: 'Gestora Escola A',
    email: 'ga@escola.edu',
    tipo_usuario: 'escola',
    ativo: true,
    escola_id: escolaId,
    polo_id: null,
    acesso_semed: true,
  }
}

function professorUser() {
  return {
    id: 'user-prof-uuid-001',
    nome: 'Professor Teste',
    email: 'prof@escola.edu',
    tipo_usuario: 'professor',
    ativo: true,
    escola_id: null,
    polo_id: null,
    acesso_semed: false,
  }
}

/** Configura usuário autenticado com permissão e módulo liberados */
function autenticar(user: ReturnType<typeof adminUser | typeof escolaUser>) {
  mockGetUser.mockResolvedValue(user as any)
  mockVerificarPermissao.mockReturnValue(true)
  mockValidarModulo.mockReturnValue(true)
}

/** Helpers de construção de requisições */
function getReq(url = '/api/admin/fila-espera') {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

function postReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/fila-espera', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function putReq(body: unknown) {
  return new NextRequest('http://localhost/api/admin/fila-espera', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function deleteReq(id: string) {
  return new NextRequest(`http://localhost/api/admin/fila-espera?id=${id}`, {
    method: 'DELETE',
  })
}

/** Registro de fila de espera pública de exemplo */
const registroExemplo = {
  id: REGISTRO_ID,
  aluno_nome: 'João da Silva',
  responsavel_nome: 'Maria da Silva',
  telefone: '(91) 99999-0001',
  escola_id: ESCOLA_A,
  serie: '1º Ano',
  ano_letivo: '2026',
  posicao: 1,
  status: 'aguardando',
  observacao: null,
  data_entrada: new Date().toISOString(),
  data_resolucao: null,
  criado_em: new Date().toISOString(),
  atualizado_em: new Date().toISOString(),
}

const kpisExemplo = {
  total_aguardando: '3',
  total_aprovados: '1',
  total_rejeitados: '0',
  total_matriculados: '0',
  total: '4',
}

// regex que detecta referência à tabela canônica isolada
const TABELA_CANONICA_REGEX = /\bfila_espera\b(?!_publica)/

// ================================================================ testes ===

// ------------------------------------------------------------------ GET ----

describe('GET /api/admin/fila-espera — tabela correta e autorização', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tabela correta: GET usa fila_espera_publica e NÃO usa fila_espera isolada', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, escola_nome: 'EM Tal' }] } as any) // SELECT lista
      .mockResolvedValueOnce({ rows: [kpisExemplo] } as any)                                    // SELECT kpis

    // Act
    const { GET } = await import('@/app/api/admin/fila-espera/route')
    const res = await GET(getReq('/api/admin/fila-espera?ano_letivo=2026'))
    expect(res.status).toBe(200)

    // Assert — inspecionar TODAS as queries emitidas
    const todasAsChamadas = mockPoolQuery.mock.calls
    expect(todasAsChamadas.length).toBeGreaterThanOrEqual(1)

    for (const chamada of todasAsChamadas) {
      const sql = chamada[0] as string
      expect(sql).toContain('fila_espera_publica')
      // Garante que NÃO referencia a tabela canônica isolada
      expect(TABELA_CANONICA_REGEX.test(sql)).toBe(false)
    }
  })

  it('caminho feliz: GET retorna registros e KPIs', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, escola_nome: 'EM Tal' }] } as any)
      .mockResolvedValueOnce({ rows: [kpisExemplo] } as any)

    // Act
    const { GET } = await import('@/app/api/admin/fila-espera/route')
    const res = await GET(getReq())
    const body = await res.json()

    // Assert
    expect(res.status).toBe(200)
    expect(body).toHaveProperty('registros')
    expect(body).toHaveProperty('kpis')
    expect(body.registros).toHaveLength(1)
    expect(body.registros[0].aluno_nome).toBe('João da Silva')
    expect(body.kpis.total_aguardando).toBe('3')
  })

  it('autorização: sem token → 401', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(null)

    // Act
    const { GET } = await import('@/app/api/admin/fila-espera/route')
    const res = await GET(getReq())

    // Assert
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('autorização: tipo sem permissão (professor) → 403', async () => {
    // Arrange
    mockGetUser.mockResolvedValue(professorUser() as any)
    mockVerificarPermissao.mockReturnValue(false) // professor não tem permissão
    mockValidarModulo.mockReturnValue(false)

    // Act
    const { GET } = await import('@/app/api/admin/fila-espera/route')
    const res = await GET(getReq())

    // Assert
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('autorização: módulo semed desabilitado → 403', async () => {
    // Arrange — tipo OK (tecnico), mas sem acesso ao módulo semed
    mockGetUser.mockResolvedValue({
      ...adminUser(),
      tipo_usuario: 'tecnico',
      acesso_semed: false,
    } as any)
    mockVerificarPermissao.mockReturnValue(true)   // tipo permitido
    mockValidarModulo.mockReturnValue(false)        // módulo bloqueado

    // Act
    const { GET } = await import('@/app/api/admin/fila-espera/route')
    const res = await GET(getReq())

    // Assert
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/módulo/i)
  })

  it('escopo: usuário escola só vê fila da própria escola (escola_id injetado no WHERE)', async () => {
    // Arrange
    autenticar(escolaUser(ESCOLA_A))
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [kpisExemplo] } as any)

    // Act
    const { GET } = await import('@/app/api/admin/fila-espera/route')
    const res = await GET(getReq())
    expect(res.status).toBe(200)

    // Assert — verificar que escola_id da escola A está nos params de pelo menos uma query
    const parametrosDasPrimeirasQuery = mockPoolQuery.mock.calls.flatMap(c => c[1] as string[])
    expect(parametrosDasPrimeirasQuery).toContain(ESCOLA_A)
  })
})

// ------------------------------------------------------------------ POST ---

describe('POST /api/admin/fila-espera — contrato público e tabela correta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tabela correta: POST usa fila_espera_publica e NÃO usa fila_espera isolada', async () => {
    // Arrange
    autenticar(adminUser())
    // 1ª query: SELECT MAX(posicao) (calcula próxima posição)
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ proxima: 1 }] } as any)
      // 2ª query: INSERT RETURNING *
      .mockResolvedValueOnce({ rows: [registroExemplo] } as any)

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    const res = await POST(postReq({
      aluno_nome: 'João da Silva',
      escola_id: ESCOLA_A,
      serie: '1º Ano',
      ano_letivo: '2026',
    }))
    expect(res.status).toBe(200)

    // Assert — todas as queries usam fila_espera_publica
    for (const chamada of mockPoolQuery.mock.calls) {
      const sql = chamada[0] as string
      expect(sql).toContain('fila_espera_publica')
      expect(TABELA_CANONICA_REGEX.test(sql)).toBe(false)
    }
  })

  it('contrato público: INSERT usa aluno_nome e NÃO referencia aluno_id, turma_id ou data_convocacao', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ proxima: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [registroExemplo] } as any)

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    await POST(postReq({
      aluno_nome: 'Maria Souza',
      escola_id: ESCOLA_A,
      serie: '2º Ano',
      ano_letivo: '2026',
    }))

    // Encontrar a query de INSERT
    const insertChamada = mockPoolQuery.mock.calls.find(c => {
      const sql = c[0] as string
      return sql.toUpperCase().includes('INSERT')
    })
    expect(insertChamada).toBeDefined()

    const insertSql = insertChamada![0] as string

    // Deve usar aluno_nome
    expect(insertSql).toContain('aluno_nome')
    // NÃO deve referenciar as colunas canônicas ausentes
    expect(insertSql).not.toContain('aluno_id')
    expect(insertSql).not.toContain('turma_id')
    expect(insertSql).not.toContain('data_convocacao')
  })

  it('caminho feliz: POST retorna 200 com o registro inserido e mensagem', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ proxima: 2 }] } as any)
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, posicao: 2 }] } as any)

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    const res = await POST(postReq({
      aluno_nome: 'Pedro Lima',
      escola_id: ESCOLA_A,
      serie: '3º Ano',
      ano_letivo: '2026',
    }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(200)
    expect(body).toHaveProperty('registro')
    expect(body).toHaveProperty('mensagem')
    expect(body.mensagem).toMatch(/fila/i)
  })

  it('validação Zod: POST sem aluno_nome → 400 { mensagem }', async () => {
    // Arrange
    autenticar(adminUser())

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    const res = await POST(postReq({
      // aluno_nome ausente — campo NOT NULL
      escola_id: ESCOLA_A,
      serie: '1º Ano',
      ano_letivo: '2026',
    }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('mensagem')
  })

  it('validação Zod: POST sem escola_id → 400 { mensagem }', async () => {
    // Arrange
    autenticar(adminUser())

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    const res = await POST(postReq({
      aluno_nome: 'Teste Aluno',
      // escola_id ausente — NOT NULL
      serie: '1º Ano',
      ano_letivo: '2026',
    }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('mensagem')
  })

  it('validação Zod: POST com escola_id inválido (não UUID) → 400', async () => {
    // Arrange
    autenticar(adminUser())

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    const res = await POST(postReq({
      aluno_nome: 'Teste',
      escola_id: 'nao-e-um-uuid',
      serie: '1º Ano',
      ano_letivo: '2026',
    }))

    // Assert
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('mensagem')
  })

  it('IDOR de escrita: escola A NÃO pode adicionar na fila da escola B → 403', async () => {
    // Arrange
    autenticar(escolaUser(ESCOLA_A))

    // Act
    const { POST } = await import('@/app/api/admin/fila-espera/route')
    const res = await POST(postReq({
      aluno_nome: 'Invasor',
      escola_id: ESCOLA_B, // escola diferente da do usuário
      serie: '1º Ano',
      ano_letivo: '2026',
    }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(403)
    expect(body).toHaveProperty('mensagem')
    // pool.query NÃO deve ter sido chamado (bloqueado antes do banco)
    expect(mockPoolQuery).not.toHaveBeenCalled()
  })
})

// ------------------------------------------------------------------ PUT ----

describe('PUT /api/admin/fila-espera — data_resolucao e validação de status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tabela correta: PUT usa fila_espera_publica e NÃO usa fila_espera isolada', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_A }] } as any) // SELECT verificação
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, status: 'aprovado', data_resolucao: new Date().toISOString() }] } as any) // UPDATE

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'aprovado' }))
    expect(res.status).toBe(200)

    // Assert
    for (const chamada of mockPoolQuery.mock.calls) {
      const sql = chamada[0] as string
      expect(sql).toContain('fila_espera_publica')
      expect(TABELA_CANONICA_REGEX.test(sql)).toBe(false)
    }
  })

  it('status aprovado: UPDATE inclui data_resolucao = NOW()', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_A }] } as any)
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, status: 'aprovado' }] } as any)

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'aprovado' }))
    expect(res.status).toBe(200)

    // Assert — a query de UPDATE deve conter data_resolucao
    const updateChamada = mockPoolQuery.mock.calls.find(c =>
      (c[0] as string).toUpperCase().includes('UPDATE')
    )
    expect(updateChamada).toBeDefined()
    const updateSql = updateChamada![0] as string
    expect(updateSql).toContain('data_resolucao')
  })

  it('status rejeitado: UPDATE inclui data_resolucao = NOW()', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_A }] } as any)
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, status: 'rejeitado' }] } as any)

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'rejeitado' }))
    expect(res.status).toBe(200)

    // Assert
    const updateSql = mockPoolQuery.mock.calls.find(c =>
      (c[0] as string).toUpperCase().includes('UPDATE')
    )![0] as string
    expect(updateSql).toContain('data_resolucao')
  })

  it('status matriculado: UPDATE inclui data_resolucao = NOW()', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_A }] } as any)
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, status: 'matriculado' }] } as any)

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'matriculado' }))
    expect(res.status).toBe(200)

    // Assert
    const updateSql = mockPoolQuery.mock.calls.find(c =>
      (c[0] as string).toUpperCase().includes('UPDATE')
    )![0] as string
    expect(updateSql).toContain('data_resolucao')
  })

  it('status aguardando: UPDATE NÃO inclui data_resolucao', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_A }] } as any)
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, status: 'aguardando' }] } as any)

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'aguardando' }))
    expect(res.status).toBe(200)

    // Assert — aguardando NÃO deve gravar data_resolucao
    const updateSql = mockPoolQuery.mock.calls.find(c =>
      (c[0] as string).toUpperCase().includes('UPDATE')
    )![0] as string
    expect(updateSql).not.toContain('data_resolucao')
  })

  it('validação Zod: status convocado (canônico, fora do enum público) → 400', async () => {
    // Arrange — `convocado` é status da tabela canônica, não existe no enum público
    autenticar(adminUser())

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'convocado' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('mensagem')
    // Banco NÃO deve ter sido chamado
    expect(mockPoolQuery).not.toHaveBeenCalled()
  })

  it('validação Zod: PUT sem id → 400', async () => {
    // Arrange
    autenticar(adminUser())

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ status: 'aprovado' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('mensagem')
  })

  it('validação Zod: PUT com id inválido (não UUID) → 400', async () => {
    // Arrange
    autenticar(adminUser())

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: 'nao-e-uuid', status: 'aprovado' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('mensagem')
  })

  it('PUT: registro não encontrado → 404', async () => {
    // Arrange
    autenticar(adminUser())
    // SELECT não retorna linhas
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any)

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'aprovado' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(404)
    expect(body).toHaveProperty('mensagem')
  })

  it('IDOR de escrita: escola A NÃO pode alterar registro da escola B → 403', async () => {
    // Arrange — registro pertence à escola B, usuário é da escola A
    autenticar(escolaUser(ESCOLA_A))
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_B }] } as any) // SELECT check

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'aprovado' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(403)
    expect(body).toHaveProperty('mensagem')
    // UPDATE não deve ter rodado
    const updateChamadas = mockPoolQuery.mock.calls.filter(c =>
      (c[0] as string).toUpperCase().includes('UPDATE')
    )
    expect(updateChamadas).toHaveLength(0)
  })

  it('caminho feliz: PUT retorna registro atualizado e mensagem com o novo status', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery
      .mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID, escola_id: ESCOLA_A }] } as any)
      .mockResolvedValueOnce({ rows: [{ ...registroExemplo, status: 'aprovado', data_resolucao: new Date().toISOString() }] } as any)

    // Act
    const { PUT } = await import('@/app/api/admin/fila-espera/route')
    const res = await PUT(putReq({ id: REGISTRO_ID, status: 'aprovado' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(200)
    expect(body).toHaveProperty('registro')
    expect(body).toHaveProperty('mensagem')
    expect(body.mensagem).toMatch(/aprovado/i)
  })
})

// ------------------------------------------------------------------ DELETE -

describe('DELETE /api/admin/fila-espera — tabela correta e autorização', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tabela correta: DELETE usa fila_espera_publica e NÃO usa fila_espera isolada', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID }] } as any) // DELETE RETURNING id

    // Act
    const { DELETE } = await import('@/app/api/admin/fila-espera/route')
    const res = await DELETE(deleteReq(REGISTRO_ID))
    expect(res.status).toBe(204)

    // Assert
    const sql = mockPoolQuery.mock.calls[0][0] as string
    expect(sql).toContain('fila_espera_publica')
    expect(TABELA_CANONICA_REGEX.test(sql)).toBe(false)
  })

  it('caminho feliz: DELETE retorna 204 sem corpo', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery.mockResolvedValueOnce({ rows: [{ id: REGISTRO_ID }] } as any)

    // Act
    const { DELETE } = await import('@/app/api/admin/fila-espera/route')
    const res = await DELETE(deleteReq(REGISTRO_ID))

    // Assert
    expect(res.status).toBe(204)
  })

  it('DELETE sem id → 400', async () => {
    // Arrange
    autenticar(adminUser())

    // Act
    const { DELETE } = await import('@/app/api/admin/fila-espera/route')
    const res = await DELETE(new NextRequest('http://localhost/api/admin/fila-espera', { method: 'DELETE' }))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(400)
    expect(body).toHaveProperty('mensagem')
  })

  it('DELETE: registro não encontrado → 404', async () => {
    // Arrange
    autenticar(adminUser())
    mockPoolQuery.mockResolvedValueOnce({ rows: [] } as any) // 0 linhas deletadas

    // Act
    const { DELETE } = await import('@/app/api/admin/fila-espera/route')
    const res = await DELETE(deleteReq(REGISTRO_ID))
    const body = await res.json()

    // Assert
    expect(res.status).toBe(404)
    expect(body).toHaveProperty('mensagem')
  })

  it('autorização: DELETE exige administrador ou tecnico — escola → 403', async () => {
    // Arrange — escola não tem permissão de DELETE (só admin/tecnico)
    mockGetUser.mockResolvedValue(escolaUser() as any)
    mockVerificarPermissao.mockReturnValue(false) // escola não está nos tipos permitidos do DELETE
    mockValidarModulo.mockReturnValue(true)

    // Act
    const { DELETE } = await import('@/app/api/admin/fila-espera/route')
    const res = await DELETE(deleteReq(REGISTRO_ID))

    // Assert
    expect(res.status).toBe(403)
    expect(mockPoolQuery).not.toHaveBeenCalled()
  })
})
