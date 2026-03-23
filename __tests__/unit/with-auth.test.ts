import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  mockAdmin,
  mockTecnico,
  mockPolo,
  mockEscola,
  mockProfessor,
  mockEditor,
} from '@/__tests__/helpers/test-utils'

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn(),
}))

import { withAuth } from '@/lib/auth/with-auth'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'

const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)

function createRequest(url = 'http://localhost/api/test') {
  return new NextRequest(url)
}

const successHandler = async (_req: NextRequest, user: any) =>
  NextResponse.json({ ok: true, tipo: user.tipo_usuario })

describe('withAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // AUTENTICACAO
  // ============================================================================

  it('retorna 401 quando usuario nao autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const handler = withAuth(async (_req, _user) => NextResponse.json({ ok: true }))
    const response = await handler(createRequest())
    expect(response.status).toBe(401)
  })

  it('permite acesso para qualquer usuario autenticado (sem restricao de tipo)', async () => {
    mockGetUsuario.mockResolvedValue(mockAdmin())
    const handler = withAuth(async (_req, user) => NextResponse.json({ nome: user.nome }))
    const response = await handler(createRequest())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.nome).toBe('Admin Teste')
  })

  // ============================================================================
  // AUTORIZACAO POR TIPO — TODOS OS 6 TIPOS
  // ============================================================================

  describe('administrador', () => {
    const user = mockAdmin()

    it('acessa rotas de admin', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('acessa rotas multi-tipo que incluem administrador', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico', 'polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('NAO acessa rotas exclusivas de professor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['professor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas exclusivas de editor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['editor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })
  })

  describe('tecnico', () => {
    const user = mockTecnico()

    it('acessa rotas de admin+tecnico (mesmas permissoes)', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('acessa rotas multi-tipo', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico', 'polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('NAO acessa rotas exclusivas de editor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['editor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })
  })

  describe('polo', () => {
    const user = mockPolo()

    it('acessa rotas que incluem polo', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico', 'polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('NAO acessa rotas exclusivas de admin', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['administrador'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas exclusivas de professor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['professor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('recebe polo_id no usuario passado ao handler', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      let receivedPoloId: string | null = null
      const handler = withAuth(['polo'], async (_req, u) => {
        receivedPoloId = u.polo_id ?? null
        return NextResponse.json({ ok: true })
      })
      await handler(createRequest())
      expect(receivedPoloId).toBe('polo-1')
    })
  })

  describe('escola', () => {
    const user = mockEscola()

    it('acessa rotas que incluem escola', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico', 'polo', 'escola'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('NAO acessa rotas exclusivas de admin', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['administrador'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas exclusivas de polo', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('recebe escola_id no usuario passado ao handler', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      let receivedEscolaId: string | null = null
      const handler = withAuth(['escola'], async (_req, u) => {
        receivedEscolaId = u.escola_id ?? null
        return NextResponse.json({ ok: true })
      })
      await handler(createRequest())
      expect(receivedEscolaId).toBe('escola-1')
    })
  })

  describe('professor', () => {
    const user = mockProfessor()

    it('acessa rotas exclusivas de professor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['professor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('acessa rotas multi-tipo que incluem professor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'professor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('NAO acessa rotas exclusivas de admin', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['administrador'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas exclusivas de polo', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas exclusivas de editor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['editor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('recebe escola_id do professor no handler', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      let receivedEscolaId: string | null = null
      const handler = withAuth(['professor'], async (_req, u) => {
        receivedEscolaId = u.escola_id ?? null
        return NextResponse.json({ ok: true })
      })
      await handler(createRequest())
      expect(receivedEscolaId).toBe('escola-1')
    })
  })

  describe('editor', () => {
    const user = mockEditor()

    it('acessa rotas exclusivas de editor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['editor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('NAO acessa rotas de admin', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['administrador'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas de polo', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas de professor', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['professor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('NAO acessa rotas de escola', async () => {
      mockGetUsuario.mockResolvedValue(user)
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['escola'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })
  })

  // ============================================================================
  // ROTAS MULTI-TIPO
  // ============================================================================

  describe('rotas multi-tipo', () => {
    it('withAuth([admin, tecnico, polo]) — polo acessa', async () => {
      mockGetUsuario.mockResolvedValue(mockPolo())
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico', 'polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('withAuth([admin, tecnico, polo]) — escola NAO acessa', async () => {
      mockGetUsuario.mockResolvedValue(mockEscola())
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['administrador', 'tecnico', 'polo'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })

    it('withAuth([admin, tecnico, polo, escola]) — escola acessa', async () => {
      mockGetUsuario.mockResolvedValue(mockEscola())
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'tecnico', 'polo', 'escola'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('withAuth([admin, editor]) — editor acessa', async () => {
      mockGetUsuario.mockResolvedValue(mockEditor())
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth(['administrador', 'editor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
    })

    it('withAuth([admin, editor]) — professor NAO acessa', async () => {
      mockGetUsuario.mockResolvedValue(mockProfessor())
      mockVerificarPermissao.mockReturnValue(false)
      const handler = withAuth(['administrador', 'editor'], successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(403)
    })
  })

  // ============================================================================
  // OVERLOADS DE ASSINATURA
  // ============================================================================

  describe('overloads de assinatura', () => {
    it('aceita tipo como string unica', async () => {
      mockGetUsuario.mockResolvedValue(mockProfessor())
      mockVerificarPermissao.mockReturnValue(true)
      const handler = withAuth('professor', successHandler)
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
      expect(mockVerificarPermissao).toHaveBeenCalledWith(
        expect.objectContaining({ tipo_usuario: 'professor' }),
        ['professor']
      )
    })

    it('aceita handler direto sem tipo (qualquer autenticado)', async () => {
      mockGetUsuario.mockResolvedValue(mockEditor())
      const handler = withAuth(async (_req, user) => NextResponse.json({ tipo: user.tipo_usuario }))
      const response = await handler(createRequest())
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.tipo).toBe('editor')
      // verificarPermissao NAO deve ser chamado quando nao ha restricao de tipo
      expect(mockVerificarPermissao).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // TRATAMENTO DE ERROS
  // ============================================================================

  it('retorna 500 quando handler lanca erro', async () => {
    mockGetUsuario.mockResolvedValue(mockAdmin())
    const handler = withAuth(async () => {
      throw new Error('Database explodiu')
    })
    const response = await handler(createRequest())
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.mensagem).toBe('Erro interno do servidor')
  })

  it('retorna 500 quando auth lanca erro', async () => {
    mockGetUsuario.mockRejectedValue(new Error('JWT invalido'))
    const handler = withAuth(async (_req, _user) => NextResponse.json({ ok: true }))
    const response = await handler(createRequest())
    expect(response.status).toBe(500)
  })

  // ============================================================================
  // PASSAGEM DE DADOS
  // ============================================================================

  it('passa request e usuario corretamente ao handler', async () => {
    mockGetUsuario.mockResolvedValue(mockAdmin())
    let receivedUrl = ''
    let receivedUser: any = null

    const handler = withAuth(async (req, user) => {
      receivedUrl = req.url
      receivedUser = user
      return NextResponse.json({ ok: true })
    })

    await handler(createRequest('http://localhost/api/admin/alunos?polo_id=1'))
    expect(receivedUrl).toContain('/api/admin/alunos')
    expect(receivedUser.id).toBe('user-001')
    expect(receivedUser.nome).toBe('Admin Teste')
  })

  it('passa usuario polo com polo_id ao handler', async () => {
    const poloUser = mockPolo()
    mockGetUsuario.mockResolvedValue(poloUser)
    mockVerificarPermissao.mockReturnValue(true)
    let receivedUser: any = null

    const handler = withAuth(['polo'], async (_req, user) => {
      receivedUser = user
      return NextResponse.json({ ok: true })
    })

    await handler(createRequest())
    expect(receivedUser.tipo_usuario).toBe('polo')
    expect(receivedUser.polo_id).toBe('polo-1')
  })
})
