import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockAdmin,
  mockTecnico,
  mockPolo,
  mockEscola,
  mockProfessor,
  mockEditor,
  mockPoolQuery,
} from '@/__tests__/helpers/test-utils'

// Mock database
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import {
  verificarPermissao,
  podeAcessarEscola,
  podeAcessarEscolaSync,
  podeAcessarPolo,
} from '@/lib/auth'
import pool from '@/database/connection'

const mockPool = vi.mocked(pool)

describe('Access Control — verificarPermissao', () => {
  // ============================================================================
  // ADMINISTRADOR
  // ============================================================================

  describe('administrador', () => {
    const user = mockAdmin()

    it('tem acesso a rotas de admin', () => {
      expect(verificarPermissao(user, ['administrador'])).toBe(true)
    })

    it('tem acesso a rotas admin+tecnico', () => {
      expect(verificarPermissao(user, ['administrador', 'tecnico'])).toBe(true)
    })

    it('NAO tem acesso a rotas exclusivas de professor', () => {
      expect(verificarPermissao(user, ['professor'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de editor', () => {
      expect(verificarPermissao(user, ['editor'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de polo', () => {
      expect(verificarPermissao(user, ['polo'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de escola', () => {
      expect(verificarPermissao(user, ['escola'])).toBe(false)
    })
  })

  // ============================================================================
  // TECNICO
  // ============================================================================

  describe('tecnico', () => {
    const user = mockTecnico()

    it('tem acesso a rotas admin+tecnico', () => {
      expect(verificarPermissao(user, ['administrador', 'tecnico'])).toBe(true)
    })

    it('tem acesso quando tecnico esta na lista', () => {
      expect(verificarPermissao(user, ['tecnico'])).toBe(true)
    })

    it('NAO tem acesso a rotas exclusivas de admin', () => {
      expect(verificarPermissao(user, ['administrador'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de editor', () => {
      expect(verificarPermissao(user, ['editor'])).toBe(false)
    })
  })

  // ============================================================================
  // POLO
  // ============================================================================

  describe('polo', () => {
    const user = mockPolo()

    it('tem acesso quando polo esta na lista', () => {
      expect(verificarPermissao(user, ['polo'])).toBe(true)
    })

    it('tem acesso a rotas admin+tecnico+polo', () => {
      expect(verificarPermissao(user, ['administrador', 'tecnico', 'polo'])).toBe(true)
    })

    it('NAO tem acesso a rotas exclusivas de admin', () => {
      expect(verificarPermissao(user, ['administrador'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de escola', () => {
      expect(verificarPermissao(user, ['escola'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de professor', () => {
      expect(verificarPermissao(user, ['professor'])).toBe(false)
    })
  })

  // ============================================================================
  // ESCOLA
  // ============================================================================

  describe('escola', () => {
    const user = mockEscola()

    it('tem acesso quando escola esta na lista', () => {
      expect(verificarPermissao(user, ['escola'])).toBe(true)
    })

    it('tem acesso a rotas admin+tecnico+polo+escola', () => {
      expect(verificarPermissao(user, ['administrador', 'tecnico', 'polo', 'escola'])).toBe(true)
    })

    it('NAO tem acesso a rotas exclusivas de admin', () => {
      expect(verificarPermissao(user, ['administrador'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de polo', () => {
      expect(verificarPermissao(user, ['polo'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de professor', () => {
      expect(verificarPermissao(user, ['professor'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de editor', () => {
      expect(verificarPermissao(user, ['editor'])).toBe(false)
    })
  })

  // ============================================================================
  // PROFESSOR
  // ============================================================================

  describe('professor', () => {
    const user = mockProfessor()

    it('tem acesso quando professor esta na lista', () => {
      expect(verificarPermissao(user, ['professor'])).toBe(true)
    })

    it('tem acesso a rotas admin+professor', () => {
      expect(verificarPermissao(user, ['administrador', 'professor'])).toBe(true)
    })

    it('NAO tem acesso a rotas exclusivas de admin', () => {
      expect(verificarPermissao(user, ['administrador'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de polo', () => {
      expect(verificarPermissao(user, ['polo'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de escola', () => {
      expect(verificarPermissao(user, ['escola'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de editor', () => {
      expect(verificarPermissao(user, ['editor'])).toBe(false)
    })
  })

  // ============================================================================
  // EDITOR
  // ============================================================================

  describe('editor', () => {
    const user = mockEditor()

    it('tem acesso quando editor esta na lista', () => {
      expect(verificarPermissao(user, ['editor'])).toBe(true)
    })

    it('tem acesso a rotas admin+editor', () => {
      expect(verificarPermissao(user, ['administrador', 'editor'])).toBe(true)
    })

    it('NAO tem acesso a rotas exclusivas de admin', () => {
      expect(verificarPermissao(user, ['administrador'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de polo', () => {
      expect(verificarPermissao(user, ['polo'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de escola', () => {
      expect(verificarPermissao(user, ['escola'])).toBe(false)
    })

    it('NAO tem acesso a rotas exclusivas de professor', () => {
      expect(verificarPermissao(user, ['professor'])).toBe(false)
    })
  })

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('edge cases', () => {
    it('retorna false para usuario null', () => {
      expect(verificarPermissao(null, ['administrador'])).toBe(false)
    })

    it('usuario legado "admin" e tratado como administrador', () => {
      const legacyAdmin = mockAdmin({ tipo_usuario: 'admin' as any })
      expect(verificarPermissao(legacyAdmin, ['administrador'])).toBe(true)
    })

    it('lista vazia de tipos permitidos retorna false', () => {
      expect(verificarPermissao(mockAdmin(), [])).toBe(false)
    })
  })
})

// ============================================================================
// ACESSO A POLO — podeAcessarPolo
// ============================================================================

describe('Access Control — podeAcessarPolo', () => {
  describe('administrador', () => {
    it('acessa qualquer polo', () => {
      expect(podeAcessarPolo(mockAdmin(), 'polo-1')).toBe(true)
      expect(podeAcessarPolo(mockAdmin(), 'polo-999')).toBe(true)
    })
  })

  describe('tecnico', () => {
    it('acessa qualquer polo', () => {
      expect(podeAcessarPolo(mockTecnico(), 'polo-1')).toBe(true)
      expect(podeAcessarPolo(mockTecnico(), 'polo-999')).toBe(true)
    })
  })

  describe('polo', () => {
    it('acessa apenas seu proprio polo', () => {
      const user = mockPolo({ polo_id: 'polo-1' })
      expect(podeAcessarPolo(user, 'polo-1')).toBe(true)
    })

    it('NAO acessa polo de outro', () => {
      const user = mockPolo({ polo_id: 'polo-1' })
      expect(podeAcessarPolo(user, 'polo-2')).toBe(false)
    })
  })

  describe('escola', () => {
    it('NAO tem acesso direto a polos', () => {
      expect(podeAcessarPolo(mockEscola(), 'polo-1')).toBe(false)
    })
  })

  describe('professor', () => {
    it('NAO tem acesso a polos', () => {
      expect(podeAcessarPolo(mockProfessor(), 'polo-1')).toBe(false)
    })
  })

  describe('editor', () => {
    it('NAO tem acesso a polos', () => {
      expect(podeAcessarPolo(mockEditor(), 'polo-1')).toBe(false)
    })
  })
})

// ============================================================================
// ACESSO A ESCOLA — podeAcessarEscolaSync
// ============================================================================

describe('Access Control — podeAcessarEscolaSync', () => {
  describe('administrador', () => {
    it('acessa qualquer escola', () => {
      expect(podeAcessarEscolaSync(mockAdmin(), 'escola-1')).toBe(true)
      expect(podeAcessarEscolaSync(mockAdmin(), 'escola-999')).toBe(true)
    })
  })

  describe('tecnico', () => {
    it('acessa qualquer escola', () => {
      expect(podeAcessarEscolaSync(mockTecnico(), 'escola-1')).toBe(true)
    })
  })

  describe('polo', () => {
    it('acessa escolas do seu polo', () => {
      const user = mockPolo({ polo_id: 'polo-1' })
      expect(podeAcessarEscolaSync(user, 'escola-1', 'polo-1')).toBe(true)
    })

    it('NAO acessa escolas de outro polo', () => {
      const user = mockPolo({ polo_id: 'polo-1' })
      expect(podeAcessarEscolaSync(user, 'escola-2', 'polo-2')).toBe(false)
    })

    it('NAO acessa escola sem polo_id informado', () => {
      const user = mockPolo({ polo_id: 'polo-1' })
      expect(podeAcessarEscolaSync(user, 'escola-1', null)).toBe(false)
    })

    it('retorna false se usuario polo nao tem polo_id', () => {
      const user = mockPolo({ polo_id: null })
      expect(podeAcessarEscolaSync(user, 'escola-1', 'polo-1')).toBe(false)
    })
  })

  describe('escola', () => {
    it('acessa apenas sua propria escola', () => {
      const user = mockEscola({ escola_id: 'escola-1' })
      expect(podeAcessarEscolaSync(user, 'escola-1')).toBe(true)
    })

    it('NAO acessa escola de outro', () => {
      const user = mockEscola({ escola_id: 'escola-1' })
      expect(podeAcessarEscolaSync(user, 'escola-2')).toBe(false)
    })
  })

  describe('professor', () => {
    it('NAO tem acesso via podeAcessarEscolaSync', () => {
      expect(podeAcessarEscolaSync(mockProfessor(), 'escola-1')).toBe(false)
    })
  })

  describe('editor', () => {
    it('NAO tem acesso a escolas', () => {
      expect(podeAcessarEscolaSync(mockEditor(), 'escola-1')).toBe(false)
    })
  })
})

// ============================================================================
// ACESSO A ESCOLA (ASYNC) — podeAcessarEscola
// ============================================================================

describe('Access Control — podeAcessarEscola (async/db)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('admin acessa qualquer escola sem query ao banco', async () => {
    const result = await podeAcessarEscola(mockAdmin(), 'escola-1')
    expect(result).toBe(true)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('tecnico acessa qualquer escola sem query ao banco', async () => {
    const result = await podeAcessarEscola(mockTecnico(), 'escola-1')
    expect(result).toBe(true)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('escola acessa apenas sua propria escola sem query ao banco', async () => {
    const user = mockEscola({ escola_id: 'escola-1' })
    expect(await podeAcessarEscola(user, 'escola-1')).toBe(true)
    expect(await podeAcessarEscola(user, 'escola-2')).toBe(false)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('polo faz query ao banco para verificar se escola pertence ao polo', async () => {
    const user = mockPolo({ polo_id: 'polo-1' })
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'escola-1' }], rowCount: 1 } as any)

    const result = await podeAcessarEscola(user, 'escola-1')
    expect(result).toBe(true)
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('escolas'),
      ['escola-1', 'polo-1']
    )
  })

  it('polo retorna false se escola nao pertence ao polo', async () => {
    const user = mockPolo({ polo_id: 'polo-1' })
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await podeAcessarEscola(user, 'escola-99')
    expect(result).toBe(false)
  })

  it('polo sem polo_id retorna false sem query', async () => {
    const user = mockPolo({ polo_id: null })
    const result = await podeAcessarEscola(user, 'escola-1')
    expect(result).toBe(false)
    expect(mockPool.query).not.toHaveBeenCalled()
  })

  it('polo retorna false se banco lanca erro', async () => {
    const user = mockPolo({ polo_id: 'polo-1' })
    mockPool.query.mockRejectedValueOnce(new Error('DB error'))

    const result = await podeAcessarEscola(user, 'escola-1')
    expect(result).toBe(false)
  })

  it('professor retorna false', async () => {
    const result = await podeAcessarEscola(mockProfessor(), 'escola-1')
    expect(result).toBe(false)
  })

  it('editor retorna false', async () => {
    const result = await podeAcessarEscola(mockEditor(), 'escola-1')
    expect(result).toBe(false)
  })
})

// ============================================================================
// CROSS-TYPE ACCESS DENIAL
// ============================================================================

describe('Access Control — Cross-type denial matrix', () => {
  const crossTests: Array<{ user: string; route: string[]; expected: boolean }> = [
    // escola tentando acessar rotas de polo
    { user: 'escola', route: ['polo'], expected: false },
    // polo tentando acessar rotas de escola exclusiva
    { user: 'polo', route: ['escola'], expected: false },
    // professor tentando acessar rotas de admin
    { user: 'professor', route: ['administrador'], expected: false },
    // professor tentando acessar rotas de polo
    { user: 'professor', route: ['polo'], expected: false },
    // editor tentando acessar rotas de professor
    { user: 'editor', route: ['professor'], expected: false },
    // editor tentando acessar rotas de escola
    { user: 'editor', route: ['escola'], expected: false },
    // escola tentando acessar rotas de editor
    { user: 'escola', route: ['editor'], expected: false },
    // polo tentando acessar rotas de editor
    { user: 'polo', route: ['editor'], expected: false },
  ]

  const userFactories: Record<string, () => ReturnType<typeof mockAdmin>> = {
    administrador: mockAdmin,
    tecnico: mockTecnico,
    polo: mockPolo,
    escola: mockEscola,
    professor: mockProfessor,
    editor: mockEditor,
  }

  for (const { user, route, expected } of crossTests) {
    it(`${user} ${expected ? 'PODE' : 'NAO PODE'} acessar rota [${route.join(', ')}]`, () => {
      const u = userFactories[user]()
      expect(verificarPermissao(u, route as any)).toBe(expected)
    })
  }
})
