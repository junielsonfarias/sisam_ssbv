import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { Usuario, TipoUsuario } from '@/lib/types'

// ============================================================================
// MOCK USER FACTORY
// ============================================================================

/**
 * Cria um Usuario fake para testes.
 * Aceita overrides parciais sobre o objeto base (administrador).
 */
export function mockUser(overrides: Partial<Usuario> & Record<string, unknown> = {}): Usuario {
  return {
    id: 'user-001',
    nome: 'Admin Teste',
    email: 'admin@test.com',
    tipo_usuario: 'administrador' as TipoUsuario,
    polo_id: null,
    escola_id: null,
    ativo: true,
    criado_em: new Date('2026-01-01'),
    atualizado_em: new Date('2026-01-01'),
    ...overrides,
  }
}

/** Atalhos para tipos comuns */
export const mockAdmin = (ov: Partial<Usuario> = {}) =>
  mockUser({ tipo_usuario: 'administrador', ...ov })

export const mockTecnico = (ov: Partial<Usuario> = {}) =>
  mockUser({ id: 'user-tec', nome: 'Tecnico Teste', email: 'tec@test.com', tipo_usuario: 'tecnico', ...ov })

export const mockPolo = (ov: Partial<Usuario> = {}) =>
  mockUser({ id: 'user-polo', nome: 'Polo Teste', email: 'polo@test.com', tipo_usuario: 'polo', polo_id: 'polo-1', ...ov })

export const mockEscola = (ov: Partial<Usuario> = {}) =>
  mockUser({ id: 'user-escola', nome: 'Escola Teste', email: 'escola@test.com', tipo_usuario: 'escola', escola_id: 'escola-1', ...ov })

export const mockProfessor = (ov: Partial<Usuario> = {}) =>
  mockUser({ id: 'user-prof', nome: 'Professor Teste', email: 'prof@test.com', tipo_usuario: 'professor', escola_id: 'escola-1', ...ov })

export const mockEditor = (ov: Partial<Usuario> = {}) =>
  mockUser({ id: 'user-editor', nome: 'Editor Teste', email: 'editor@test.com', tipo_usuario: 'editor', ...ov })

// ============================================================================
// MOCK POOL / DATABASE
// ============================================================================

/**
 * Cria um mock de pool.query que retorna rows fixas.
 * Uso: `const mockQuery = mockPoolQuery([{ id: '1', nome: 'Foo' }])`
 */
export function mockPoolQuery(rows: Record<string, unknown>[] = [], rowCount?: number) {
  const queryFn = vi.fn().mockResolvedValue({
    rows,
    rowCount: rowCount ?? rows.length,
  })
  return queryFn
}

/**
 * Cria um mock de pool.connect que retorna um client com query/release
 */
export function mockPoolConnect(rows: Record<string, unknown>[] = []) {
  const client = {
    query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }),
    release: vi.fn(),
  }
  const connectFn = vi.fn().mockResolvedValue(client)
  return { connectFn, client }
}

// ============================================================================
// MOCK NEXT REQUEST
// ============================================================================

interface CreateRequestOptions {
  method?: string
  body?: Record<string, unknown>
  searchParams?: Record<string, string>
  cookies?: Record<string, string>
  headers?: Record<string, string>
}

/**
 * Cria um NextRequest com URL, body, searchParams e cookies configurados.
 *
 * Exemplo:
 * ```ts
 * const req = createRequest('/api/admin/alunos', {
 *   searchParams: { pagina: '2', busca: 'Maria' },
 * })
 * ```
 */
export function createRequest(
  path = '/api/test',
  options: CreateRequestOptions = {}
): NextRequest {
  const { method = 'GET', body, searchParams = {}, headers: extraHeaders = {} } = options

  const url = new URL(path, 'http://localhost')
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }

  const init: RequestInit & { headers: Record<string, string> } = {
    method,
    headers: {
      'content-type': 'application/json',
      ...extraHeaders,
    },
  }

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  const req = new NextRequest(url.toString(), init)

  // Set cookies if provided
  if (options.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      req.cookies.set(name, value)
    }
  }

  return req
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/** Extrai body JSON de um NextResponse */
export async function responseJson(response: Response): Promise<any> {
  return response.json()
}

/** Verifica status + retorna body de uma vez */
export async function expectStatus(response: Response, status: number) {
  expect(response.status).toBe(status)
  return response.json()
}
