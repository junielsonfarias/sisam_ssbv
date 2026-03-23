import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock auth module antes de qualquer import
vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

import { withAuth } from '@/lib/auth/with-auth'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'

const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  nome: 'Admin',
  email: 'admin@test.com',
  tipo_usuario: 'administrador' as const,
  polo_id: null,
  escola_id: null,
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
  ...overrides,
})

function createRequest(url = 'http://localhost/api/test') {
  return new NextRequest(url)
}

// ============================================================================
// TESTES DE FLUXO DE AUTENTICAÇÃO
// ============================================================================

describe('Fluxo de Autenticação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withAuth wrapper - fluxo completo', () => {
    it('rejeita request sem cookie de auth', async () => {
      mockGetUsuario.mockResolvedValue(null as any)

      const handler = withAuth(async (req, user) => NextResponse.json({ ok: true }))
      const response = await handler(createRequest())

      expect(response.status).toBe(401)
    })

    it('handler recebe usuario correto após validação', async () => {
      const fakeUser = makeUser({
        nome: 'Professor João',
        tipo_usuario: 'professor',
        escola_id: 'escola-1',
      })
      mockGetUsuario.mockResolvedValue(fakeUser as any)

      let capturedUser: any = null
      const handler = withAuth(async (req, user) => {
        capturedUser = user
        return NextResponse.json({ turmas: [] })
      })

      const request = createRequest('http://localhost/api/professor/turmas')
      await handler(request)

      expect(capturedUser).not.toBeNull()
      expect(capturedUser.nome).toBe('Professor João')
      expect(capturedUser.tipo_usuario).toBe('professor')
      expect(capturedUser.escola_id).toBe('escola-1')
    })
  })

  describe('Controle de acesso por tipo', () => {
    it('admin acessa rotas de admin', async () => {
      mockGetUsuario.mockResolvedValue(makeUser() as any)
      mockVerificarPermissao.mockReturnValue(true)

      const handler = withAuth(['administrador'], async (req, user) =>
        NextResponse.json({ acesso: 'concedido' })
      )

      const response = await handler(createRequest('http://localhost/api/admin/alunos'))
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.acesso).toBe('concedido')
    })

    it('escola não acessa rotas exclusivas de admin', async () => {
      mockGetUsuario.mockResolvedValue(makeUser({
        tipo_usuario: 'escola',
        escola_id: 'e1',
      }) as any)
      mockVerificarPermissao.mockReturnValue(false)

      const handler = withAuth(['administrador'], async (req, user) =>
        NextResponse.json({ acesso: 'concedido' })
      )

      const response = await handler(createRequest('http://localhost/api/admin/usuarios'))
      expect(response.status).toBe(403)
    })

    it('professor acessa rotas de professor', async () => {
      mockGetUsuario.mockResolvedValue(makeUser({
        tipo_usuario: 'professor',
        escola_id: 'e1',
      }) as any)
      mockVerificarPermissao.mockReturnValue(true)

      const handler = withAuth('professor', async (req, user) =>
        NextResponse.json({ notas: [] })
      )

      const response = await handler(createRequest('http://localhost/api/professor/notas'))
      expect(response.status).toBe(200)
    })

    it('polo acessa rotas com permissão polo', async () => {
      mockGetUsuario.mockResolvedValue(makeUser({
        tipo_usuario: 'polo',
        polo_id: 'p1',
      }) as any)
      mockVerificarPermissao.mockReturnValue(true)

      const handler = withAuth(['administrador', 'tecnico', 'polo'], async (req, user) =>
        NextResponse.json({ escolas: [] })
      )

      const response = await handler(createRequest('http://localhost/api/admin/escolas'))
      expect(response.status).toBe(200)
    })
  })

  describe('Tratamento de erros', () => {
    it('handler que lança erro retorna 500', async () => {
      mockGetUsuario.mockResolvedValue(makeUser() as any)

      const handler = withAuth(async () => {
        throw new Error('Banco fora do ar')
      })

      const response = await handler(createRequest())
      expect(response.status).toBe(500)
      const body = await response.json()
      expect(body.mensagem).toBe('Erro interno do servidor')
    })

    it('erro no auth retorna 500', async () => {
      mockGetUsuario.mockRejectedValue(new Error('JWT expirado'))

      const handler = withAuth(async (req, user) => NextResponse.json({ ok: true }))
      const response = await handler(createRequest())

      expect(response.status).toBe(500)
    })
  })
})

// ============================================================================
// TESTES DE CONTROLE DE ACESSO POR DADOS
// ============================================================================

import {
  parsePaginacao,
  createWhereBuilder,
  addCondition,
  addSearchCondition,
  addAccessControl,
  buildWhereString,
  buildOrderBy,
  buildLimitOffset,
  buildPaginacaoResponse,
} from '@/lib/api-helpers'

describe('Controle de Acesso a Dados', () => {
  it('polo só vê dados do seu polo', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'polo', polo_id: 'polo-abc' }) as any)

    expect(builder.conditions).toContain('e.polo_id = $1')
    expect(builder.params).toContain('polo-abc')
  })

  it('escola só vê dados da sua escola', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'escola', escola_id: 'escola-xyz' }) as any)

    expect(builder.conditions).toContain('e.id = $1')
    expect(builder.params).toContain('escola-xyz')
  })

  it('admin vê tudo (sem filtros)', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'administrador' }) as any)

    expect(builder.conditions).toEqual([])
  })

  it('tecnico vê tudo (sem filtros)', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser({ tipo_usuario: 'tecnico' }) as any)

    expect(builder.conditions).toEqual([])
  })
})

// ============================================================================
// TESTES DE PIPELINE: FILTROS → QUERY → PAGINAÇÃO
// ============================================================================

describe('Pipeline completo: filtros → query → paginação', () => {
  it('gera query SQL válida com todos os helpers combinados', () => {
    const searchParams = new URLSearchParams({
      pagina: '2',
      limite: '25',
      busca: 'Maria',
      escola_id: 'escola-1',
      ordenar_por: 'nome',
      direcao: 'ASC',
    })

    const usuario = makeUser({ tipo_usuario: 'polo', polo_id: 'polo-1' })

    // 1. Paginação
    const paginacao = parsePaginacao(searchParams)
    expect(paginacao).toEqual({ pagina: 2, limite: 25, offset: 25 })

    // 2. WHERE clause
    const builder = createWhereBuilder()
    addAccessControl(builder, usuario as any)
    addCondition(builder, 'a.escola_id', searchParams.get('escola_id'))
    addSearchCondition(builder, ['a.nome', 'a.codigo'], searchParams.get('busca'))

    const where = buildWhereString(builder)
    expect(where).toBe('WHERE e.polo_id = $1 AND a.escola_id = $2 AND (a.nome ILIKE $3 OR a.codigo ILIKE $3)')

    // 3. ORDER BY
    const orderBy = buildOrderBy(searchParams, ['nome', 'criado_em', 'codigo'])
    expect(orderBy).toBe('ORDER BY nome ASC')

    // 4. LIMIT/OFFSET
    const lo = buildLimitOffset(paginacao)
    expect(lo).toBe('LIMIT 25 OFFSET 25')

    // 5. Resposta de paginação
    const response = buildPaginacaoResponse(paginacao, 100)
    expect(response.totalPaginas).toBe(4)
    expect(response.temProxima).toBe(true)
    expect(response.temAnterior).toBe(true)
  })

  it('gera query mínima sem filtros (admin)', () => {
    const builder = createWhereBuilder()
    addAccessControl(builder, makeUser() as any)

    expect(buildWhereString(builder)).toBe('')
  })
})
