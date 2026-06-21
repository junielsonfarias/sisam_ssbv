/**
 * Testes de integração — GET /api/admin/graficos e GET /api/admin/comparativos
 * e GET /api/admin/comparativos-polos
 *
 * Cobre:
 *  - Autenticação (401/403)
 *  - Cache: retorna do cache quando disponível; busca do banco quando não há cache
 *  - Parâmetros repassados corretamente ao service
 *  - comparativos: 400 quando sem escola e sem polo
 *  - comparativos-polos: 400 quando não exatamente 2 polos
 *  - Erros: 500 em falha de banco
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  verificarCache: vi.fn().mockReturnValue(false),
  carregarCache: vi.fn().mockReturnValue(null),
  salvarCache: vi.fn(),
  limparCachesExpirados: vi.fn(),
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.join(':')),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/lib/services/graficos.service', () => ({
  getGraficosData: vi.fn(),
}))

vi.mock('@/lib/services/comparativos', () => ({
  buscarComparativoAdmin: vi.fn(),
}))

vi.mock('@/lib/services/comparativos.service', () => ({
  buscarComparativoPolos: vi.fn(),
}))

// ------------------------------------------------------------------ imports --
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { GET as getGraficos } from '@/app/api/admin/graficos/route'
import { GET as getComparativos } from '@/app/api/admin/comparativos/route'
import { GET as getComparativosPolos } from '@/app/api/admin/comparativos-polos/route'
import { getGraficosData } from '@/lib/services/graficos.service'
import { buscarComparativoAdmin } from '@/lib/services/comparativos'
import { buscarComparativoPolos } from '@/lib/services/comparativos.service'
import * as cacheLib from '@/lib/cache'

const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockGetGraficosData = vi.mocked(getGraficosData)
const mockBuscarComparativoAdmin = vi.mocked(buscarComparativoAdmin)
const mockBuscarComparativoPolos = vi.mocked(buscarComparativoPolos)

// ------------------------------------------------------------------ fixtures --
const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@semed.edu',
  tipo_usuario: 'administrador', ativo: true,
  escola_id: null, polo_id: null,
}

const POLO_USER = {
  id: 'polo-1', nome: 'Polo P1', email: 'p1@semed.edu',
  tipo_usuario: 'polo', ativo: true,
  escola_id: null, polo_id: 'polo-uuid-p1',
}

const POLO_UUID_1 = '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const POLO_UUID_2 = '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ESCOLA_UUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

function makeGetRequest(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  return new NextRequest(`http://localhost${path}${qs ? '?' + qs : ''}`, { method: 'GET' })
}

const dadosGrafico = {
  series: [{ nome: 'Escola A', lp: 7.5, mat: 6.8 }],
  _cache: { origem: 'banco', geradoEm: '2026-01-01T00:00:00Z' },
}

const dadosComparativo = {
  escolas: [{ id: ESCOLA_UUID, nome: 'Escola A', media_geral: 7.2 }],
}

// ================================================================ testes ===

describe('GET /api/admin/graficos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(cacheLib.verificarCache).mockReturnValue(false)
    vi.mocked(cacheLib.carregarCache).mockReturnValue(null)
    vi.mocked(cacheLib.limparCachesExpirados).mockImplementation(() => {})
    vi.mocked(cacheLib.salvarCache).mockImplementation(() => {})
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockGetGraficosData.mockResolvedValue(dadosGrafico as any)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getGraficos(makeGetRequest('/api/admin/graficos'))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil sem permissão', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'publicador' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getGraficos(makeGetRequest('/api/admin/graficos'))
    expect(res.status).toBe(403)
  })

  it('200 caminho feliz — busca do banco e salva cache', async () => {
    const res = await getGraficos(makeGetRequest('/api/admin/graficos'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.series).toBeDefined()
    expect(body._cache.origem).toBe('banco')
    expect(cacheLib.salvarCache).toHaveBeenCalled()
  })

  it('200 retorna do cache quando disponível', async () => {
    vi.mocked(cacheLib.verificarCache).mockReturnValue(true)
    vi.mocked(cacheLib.carregarCache).mockReturnValue({
      series: [{ nome: 'Do Cache' }],
    })
    const res = await getGraficos(makeGetRequest('/api/admin/graficos'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body._cache.origem).toBe('cache')
    expect(body.series[0].nome).toBe('Do Cache')
    // Service NÃO deve ser chamado quando dados vêm do cache
    expect(mockGetGraficosData).not.toHaveBeenCalled()
  })

  it('200 com atualizar_cache=true ignora o cache e busca do banco', async () => {
    vi.mocked(cacheLib.verificarCache).mockReturnValue(true)
    vi.mocked(cacheLib.carregarCache).mockReturnValue({ series: [{ nome: 'Cache Antigo' }] })
    const res = await getGraficos(
      makeGetRequest('/api/admin/graficos', { atualizar_cache: 'true' })
    )
    expect(res.status).toBe(200)
    // Service foi chamado, ignorando o cache
    expect(mockGetGraficosData).toHaveBeenCalled()
  })

  it('200 repassa filtros ao service (tipo, ano, polo, escola, serie, disciplina)', async () => {
    const res = await getGraficos(makeGetRequest('/api/admin/graficos', {
      tipo: 'ranking',
      ano_letivo: '2026',
      polo_id: POLO_UUID_1,
      escola_id: ESCOLA_UUID,
      serie: '5',
      disciplina: 'LP',
    }))
    expect(res.status).toBe(200)
    expect(mockGetGraficosData).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_usuario: 'administrador' }),
      expect.objectContaining({
        tipoGrafico: 'ranking',
        anoLetivo: '2026',
        poloId: POLO_UUID_1,
        escolaId: ESCOLA_UUID,
        serie: '5',
        disciplina: 'LP',
      })
    )
  })

  it('200 mesmo quando salvarCache lança erro (não crítico)', async () => {
    vi.mocked(cacheLib.salvarCache).mockImplementation(() => { throw new Error('disco cheio') })
    const res = await getGraficos(makeGetRequest('/api/admin/graficos'))
    // Erro de cache não deve quebrar a resposta
    expect(res.status).toBe(200)
  })

  it('200 escola e polo têm acesso a graficos', async () => {
    mockGetUsuario.mockResolvedValue(POLO_USER as any)
    const res = await getGraficos(makeGetRequest('/api/admin/graficos'))
    expect(res.status).toBe(200)
  })
})

// ------------------------------------------------------------------ comparativos --

describe('GET /api/admin/comparativos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(cacheLib.verificarCache).mockReturnValue(false)
    vi.mocked(cacheLib.carregarCache).mockReturnValue(null)
    vi.mocked(cacheLib.limparCachesExpirados).mockImplementation(() => {})
    vi.mocked(cacheLib.salvarCache).mockImplementation(() => {})
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockBuscarComparativoAdmin.mockResolvedValue(dadosComparativo as any)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getComparativos(makeGetRequest('/api/admin/comparativos'))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil escola tenta acessar (apenas admin/tecnico/polo)', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'escola' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getComparativos(makeGetRequest('/api/admin/comparativos'))
    expect(res.status).toBe(403)
  })

  it('400 quando sem escola e sem polo na query', async () => {
    const res = await getComparativos(makeGetRequest('/api/admin/comparativos'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/selecione/i)
    expect(mockBuscarComparativoAdmin).not.toHaveBeenCalled()
  })

  it('200 caminho feliz com escolas_ids', async () => {
    const res = await getComparativos(
      makeGetRequest('/api/admin/comparativos', { escolas_ids: ESCOLA_UUID })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body._cache.origem).toBe('banco')
    expect(mockBuscarComparativoAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ escolasIds: [ESCOLA_UUID] })
    )
  })

  it('200 caminho feliz com polo_id', async () => {
    const res = await getComparativos(
      makeGetRequest('/api/admin/comparativos', { polo_id: POLO_UUID_1 })
    )
    expect(res.status).toBe(200)
    expect(mockBuscarComparativoAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ poloId: POLO_UUID_1 })
    )
  })

  it('200 retorna do cache quando disponível', async () => {
    vi.mocked(cacheLib.verificarCache).mockReturnValue(true)
    vi.mocked(cacheLib.carregarCache).mockReturnValue({ escolas: [] })
    const res = await getComparativos(
      makeGetRequest('/api/admin/comparativos', { polo_id: POLO_UUID_1 })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body._cache.origem).toBe('cache')
    expect(mockBuscarComparativoAdmin).not.toHaveBeenCalled()
  })

  it('500 em erro inesperado no service', async () => {
    mockBuscarComparativoAdmin.mockRejectedValueOnce(new Error('timeout'))
    const res = await getComparativos(
      makeGetRequest('/api/admin/comparativos', { polo_id: POLO_UUID_1 })
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})

// ------------------------------------------------------------------ comparativos-polos --

describe('GET /api/admin/comparativos-polos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
    mockBuscarComparativoPolos.mockResolvedValue({
      polo1: { id: POLO_UUID_1, nome: 'Polo A', media_geral: 7.0 },
      polo2: { id: POLO_UUID_2, nome: 'Polo B', media_geral: 6.5 },
    } as any)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos', {
        polos_ids: `${POLO_UUID_1},${POLO_UUID_2}`
      })
    )
    expect(res.status).toBe(401)
  })

  it('403 quando perfil escola tenta acessar (apenas admin/tecnico)', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'escola' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos', {
        polos_ids: `${POLO_UUID_1},${POLO_UUID_2}`
      })
    )
    expect(res.status).toBe(403)
  })

  it('400 quando apenas 1 polo fornecido (precisa de exatamente 2)', async () => {
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos', { polos_ids: POLO_UUID_1 })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.mensagem).toMatch(/exatamente 2 polos/i)
    expect(mockBuscarComparativoPolos).not.toHaveBeenCalled()
  })

  it('400 quando 3 polos fornecidos (precisa de exatamente 2)', async () => {
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos', {
        polos_ids: `${POLO_UUID_1},${POLO_UUID_2},cccccccc-cccc-cccc-cccc-cccccccccccc`
      })
    )
    expect(res.status).toBe(400)
    expect(mockBuscarComparativoPolos).not.toHaveBeenCalled()
  })

  it('400 quando polos_ids não fornecido', async () => {
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos')
    )
    expect(res.status).toBe(400)
  })

  it('200 caminho feliz com 2 polos', async () => {
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos', {
        polos_ids: `${POLO_UUID_1},${POLO_UUID_2}`,
        ano_letivo: '2026',
        serie: '5',
      })
    )
    expect(res.status).toBe(200)
    expect(mockBuscarComparativoPolos).toHaveBeenCalledWith(
      expect.objectContaining({
        polosIds: [POLO_UUID_1, POLO_UUID_2],
        anoLetivo: '2026',
        serie: '5',
      })
    )
  })

  it('500 em erro inesperado no service', async () => {
    mockBuscarComparativoPolos.mockRejectedValueOnce(new Error('timeout'))
    const res = await getComparativosPolos(
      makeGetRequest('/api/admin/comparativos-polos', {
        polos_ids: `${POLO_UUID_1},${POLO_UUID_2}`
      })
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})
