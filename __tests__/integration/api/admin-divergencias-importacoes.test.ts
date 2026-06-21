/**
 * Testes de integração — GET/POST /api/admin/divergencias
 *                         GET /api/admin/importacoes
 *
 * Cobre divergências:
 *  - GET: autenticação (401/403 apenas admin), apenas_criticos=true, filtros nivel/tipo,
 *    resultado completo (200), erro (500)
 *  - POST: autenticação (401/403), executa verificação completa (200), erro (500)
 *
 * Cobre importações:
 *  - GET: autenticação (403 via getUsuario/verificarPermissao),
 *    caminho feliz com paginação (200), filtros ano_letivo/status (200),
 *    administrador vê todas; tecnico vê apenas próprias (WHERE usuario_id),
 *    erro (500)
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

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(),
  }),
}))

vi.mock('@/lib/divergencias/verificadores', () => ({
  executarTodasVerificacoes: vi.fn(),
  verificarDivergenciasCriticas: vi.fn(),
}))

// ------------------------------------------------------------------ imports --
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { GET as getDivergencias, POST as postDivergencias } from '@/app/api/admin/divergencias/route'
import { GET as getImportacoes } from '@/app/api/admin/importacoes/route'
import {
  executarTodasVerificacoes,
  verificarDivergenciasCriticas,
} from '@/lib/divergencias/verificadores'

const mockQuery = vi.mocked(pool.query)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockExecutarVerificacoes = vi.mocked(executarTodasVerificacoes)
const mockVerificarCriticos = vi.mocked(verificarDivergenciasCriticas)

// ------------------------------------------------------------------ fixtures --
const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@semed.edu',
  tipo_usuario: 'administrador', ativo: true,
  escola_id: null, polo_id: null,
}

const TECNICO = {
  id: 'tec-1', nome: 'Tecnico', email: 'tec@semed.edu',
  tipo_usuario: 'tecnico', ativo: true,
  escola_id: null, polo_id: null,
}

const resultadoVerificacao = {
  resumo: {
    total: 5,
    criticos: 2,
    importantes: 1,
    avisos: 1,
    informativos: 1,
  },
  divergencias: [
    { id: 'div-1', tipo: 'ALUNOS_ORFAOS', nivel: 'critico', titulo: 'Alunos sem turma', total: 3 },
    { id: 'div-2', tipo: 'NOTAS_FORA_RANGE', nivel: 'importante', titulo: 'Notas inválidas', total: 2 },
    { id: 'div-3', tipo: 'TURMAS_VAZIAS', nivel: 'aviso', titulo: 'Turmas sem alunos', total: 5 },
  ],
  dataVerificacao: '2026-06-21T00:00:00Z',
}

function makeGetRequest(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  return new NextRequest(`http://localhost${path}${qs ? '?' + qs : ''}`, { method: 'GET' })
}

function makePostRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ================================================================ testes ===

describe('GET /api/admin/divergencias', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockExecutarVerificacoes.mockResolvedValue(resultadoVerificacao as any)
    mockVerificarCriticos.mockResolvedValue(2)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getDivergencias(makeGetRequest('/api/admin/divergencias'))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil não é administrador', async () => {
    mockGetUsuario.mockResolvedValue(TECNICO as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getDivergencias(makeGetRequest('/api/admin/divergencias'))
    expect(res.status).toBe(403)
  })

  it('200 apenas_criticos=true retorna só contagem de críticos', async () => {
    const res = await getDivergencias(
      makeGetRequest('/api/admin/divergencias', { apenas_criticos: 'true' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.criticos).toBe(2)
    // executarTodasVerificacoes NÃO deve ser chamado (só verificarCriticos)
    expect(mockExecutarVerificacoes).not.toHaveBeenCalled()
    expect(mockVerificarCriticos).toHaveBeenCalled()
  })

  it('200 retorna resultado completo sem filtros', async () => {
    const res = await getDivergencias(makeGetRequest('/api/admin/divergencias'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.resumo.total).toBe(5)
    expect(body.divergencias).toHaveLength(3)
    expect(body.dataVerificacao).toBe('2026-06-21T00:00:00Z')
  })

  it('200 filtro nivel=critico retorna apenas divergências críticas', async () => {
    const res = await getDivergencias(
      makeGetRequest('/api/admin/divergencias', { nivel: 'critico' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    // Apenas a div-1 (nivel: 'critico')
    expect(body.divergencias).toHaveLength(1)
    expect(body.divergencias[0].nivel).toBe('critico')
  })

  it('200 filtro tipo=NOTAS_FORA_RANGE filtra por tipo específico', async () => {
    const res = await getDivergencias(
      makeGetRequest('/api/admin/divergencias', { tipo: 'NOTAS_FORA_RANGE' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.divergencias).toHaveLength(1)
    expect(body.divergencias[0].tipo).toBe('NOTAS_FORA_RANGE')
  })

  it('200 filtro nivel + tipo em combinação', async () => {
    const res = await getDivergencias(
      makeGetRequest('/api/admin/divergencias', { nivel: 'aviso', tipo: 'TURMAS_VAZIAS' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.divergencias).toHaveLength(1)
    expect(body.divergencias[0].tipo).toBe('TURMAS_VAZIAS')
  })

  it('200 filtro que não casa retorna lista vazia de divergencias', async () => {
    const res = await getDivergencias(
      makeGetRequest('/api/admin/divergencias', { nivel: 'inexistente' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.divergencias).toHaveLength(0)
  })

  it('500 em erro inesperado nas verificações', async () => {
    mockExecutarVerificacoes.mockRejectedValueOnce(new Error('banco indisponível'))
    const res = await getDivergencias(makeGetRequest('/api/admin/divergencias'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/buscar divergências/i)
  })
})

// ------------------------------------------------------------------ POST --

describe('POST /api/admin/divergencias', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockExecutarVerificacoes.mockResolvedValue(resultadoVerificacao as any)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await postDivergencias(makePostRequest('/api/admin/divergencias'))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil sem permissão', async () => {
    mockGetUsuario.mockResolvedValue(TECNICO as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await postDivergencias(makePostRequest('/api/admin/divergencias'))
    expect(res.status).toBe(403)
  })

  it('200 executa verificação completa e retorna mensagem', async () => {
    const res = await postDivergencias(makePostRequest('/api/admin/divergencias'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mensagem).toMatch(/verificação concluída/i)
    expect(body.resumo).toEqual(resultadoVerificacao.resumo)
    expect(body.divergencias).toHaveLength(3)
    expect(mockExecutarVerificacoes).toHaveBeenCalledTimes(1)
  })

  it('500 em erro inesperado na verificação', async () => {
    mockExecutarVerificacoes.mockRejectedValueOnce(new Error('timeout'))
    const res = await postDivergencias(makePostRequest('/api/admin/divergencias'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/executar verificação/i)
  })
})

// ================================================================ importacoes ===

describe('GET /api/admin/importacoes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  const importacaoRow = {
    id: 'imp-uuid-001',
    nome_arquivo: 'dados_2026.xlsx',
    ano_letivo: '2026',
    total_linhas: 500,
    linhas_processadas: 498,
    linhas_com_erro: 2,
    status: 'concluido',
    criado_em: '2026-01-15T10:00:00Z',
    concluido_em: '2026-01-15T10:05:00Z',
    usuario_nome: 'Admin',
    usuario_email: 'admin@semed.edu',
  }

  it('403 quando não autenticado ou sem permissão', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getImportacoes(makeGetRequest('/api/admin/importacoes'))
    expect(res.status).toBe(403) // importacoes usa getUsuario/verificarPermissao direto (não withAuth)
  })

  it('403 quando perfil escola (sem permissão de admin/tecnico)', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'escola' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getImportacoes(makeGetRequest('/api/admin/importacoes'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.mensagem).toMatch(/não autorizado/i)
  })

  it('200 retorna lista paginada de importações', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [importacaoRow] } as any) // importações
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)   // count

    const res = await getImportacoes(makeGetRequest('/api/admin/importacoes'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.importacoes).toHaveLength(1)
    expect(body.importacoes[0].nome_arquivo).toBe('dados_2026.xlsx')
    expect(body.paginacao).toBeDefined()
    expect(body.paginacao.total).toBe(1)
  })

  it('200 filtro por ano_letivo incluído como condição no WHERE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)

    const res = await getImportacoes(
      makeGetRequest('/api/admin/importacoes', { ano_letivo: '2026' })
    )
    expect(res.status).toBe(200)
    // Os params das queries devem conter '2026'
    const paramsQuery1 = mockQuery.mock.calls[0][1] as unknown[]
    const paramsQuery2 = mockQuery.mock.calls[1][1] as unknown[]
    const todosParams = [...paramsQuery1, ...paramsQuery2]
    expect(todosParams).toContain('2026')
  })

  it('200 filtro por status incluído no WHERE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any)

    const res = await getImportacoes(
      makeGetRequest('/api/admin/importacoes', { status: 'concluido' })
    )
    expect(res.status).toBe(200)
    const paramsQuery1 = mockQuery.mock.calls[0][1] as unknown[]
    expect(paramsQuery1).toContain('concluido')
  })

  it('200 tecnico: WHERE inclui usuario_id (vê apenas próprias importações)', async () => {
    mockGetUsuario.mockResolvedValue(TECNICO as any)
    mockVerificarPermissao.mockReturnValue(true) // tecnico tem permissão

    mockQuery
      .mockResolvedValueOnce({ rows: [importacaoRow] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)

    const res = await getImportacoes(makeGetRequest('/api/admin/importacoes'))
    expect(res.status).toBe(200)
    // WHERE deve filtrar por usuario_id do técnico
    const paramsQuery1 = mockQuery.mock.calls[0][1] as unknown[]
    expect(paramsQuery1).toContain('tec-1') // TECNICO.id
  })

  it('200 administrador: sem filtro por usuario_id (vê todas)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [importacaoRow] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)

    const res = await getImportacoes(makeGetRequest('/api/admin/importacoes'))
    expect(res.status).toBe(200)
    // Params de admin NÃO devem conter o usuario_id 'admin-1' (sem restrição)
    const paramsQuery1 = mockQuery.mock.calls[0][1] as unknown[]
    expect(paramsQuery1).not.toContain('admin-1')
  })

  it('200 paginação com limite e pagina customizados', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ total: '50' }] } as any)

    const res = await getImportacoes(
      makeGetRequest('/api/admin/importacoes', { pagina: '2', limite: '10' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.paginacao.total).toBe(50)
  })

  it('500 em erro inesperado de banco', async () => {
    mockQuery.mockRejectedValueOnce(new Error('conexão perdida'))
    const res = await getImportacoes(makeGetRequest('/api/admin/importacoes'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})
