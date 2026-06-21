/**
 * Testes de integração — GET /api/admin/estatisticas e GET /api/admin/estatisticas-serie
 *
 * Cobre:
 *  - Autenticação (401/403)
 *  - Caminho feliz: retorna dados com _cache
 *  - Filtros: serie, ano_letivo, avaliacao_id
 *  - Fallback em caso de erro (okComFallback → 200 com dados padrão)
 *  - estatisticas-serie: cálculos de percentual, taxa_presença, tipo_avaliacao
 *  - estatisticas-serie: escopo por escola (addAccessControl)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ------------------------------------------------------------------ mocks --
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/cache', () => ({
  withRedisCache: vi.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
  cacheKey: vi.fn((...args: string[]) => args.filter(Boolean).join(':')),
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

vi.mock('@/lib/services/estatisticas.service', () => ({
  getEstatisticas: vi.fn(),
  getEstatisticasPadrao: vi.fn().mockReturnValue({
    totalAlunos: 0,
    mediaGeral: null,
    taxaPresenca: 0,
  }),
}))

// ------------------------------------------------------------------ imports --
import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { GET as getEstatisticas } from '@/app/api/admin/estatisticas/route'
import { GET as getEstatisticasSerie } from '@/app/api/admin/estatisticas-serie/route'
import { getEstatisticas as mockGetEstatisticas } from '@/lib/services/estatisticas.service'

const mockQuery = vi.mocked(pool.query)
const mockGetUsuario = vi.mocked(getUsuarioFromRequest)
const mockVerificarPermissao = vi.mocked(verificarPermissao)
const mockEstatisticasService = vi.mocked(mockGetEstatisticas)

// ------------------------------------------------------------------ fixtures --
const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@semed.edu',
  tipo_usuario: 'administrador', ativo: true,
  escola_id: null, polo_id: null,
}

const ESCOLA_USER = {
  id: 'esc-1', nome: 'Escola A', email: 'ea@semed.edu',
  tipo_usuario: 'escola', ativo: true,
  escola_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', polo_id: null,
}

const POLO_USER = {
  id: 'polo-1', nome: 'Polo P1', email: 'p1@semed.edu',
  tipo_usuario: 'polo', ativo: true,
  escola_id: null, polo_id: 'polo-uuid-p1',
}

function makeGetRequest(path: string, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  return new NextRequest(
    `http://localhost${path}${qs ? '?' + qs : ''}`,
    { method: 'GET' }
  )
}

// ================================================================ testes ===

describe('GET /api/admin/estatisticas', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    const cacheModule = await import('@/lib/cache')
    vi.mocked(cacheModule.withRedisCache).mockImplementation(
      (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn() as any
    )
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getEstatisticas(makeGetRequest('/api/admin/estatisticas'))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil escola tenta acessar (apenas admin/tecnico)', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getEstatisticas(makeGetRequest('/api/admin/estatisticas'))
    expect(res.status).toBe(403)
  })

  it('200 caminho feliz — retorna dados com _cache', async () => {
    const dadosEsperados = {
      totalAlunos: 3755,
      mediaGeral: 7.2,
      taxaPresenca: 85,
    }
    mockEstatisticasService.mockResolvedValueOnce(dadosEsperados as any)

    const res = await getEstatisticas(makeGetRequest('/api/admin/estatisticas'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalAlunos).toBe(3755)
    expect(body._cache).toBeDefined()
    expect(body._cache.origem).toBe('banco')
  })

  it('200 com filtros serie e ano_letivo repassados ao service', async () => {
    mockEstatisticasService.mockResolvedValueOnce({ totalAlunos: 500 } as any)
    const res = await getEstatisticas(
      makeGetRequest('/api/admin/estatisticas', { serie: '5', ano_letivo: '2026' })
    )
    expect(res.status).toBe(200)
    expect(mockEstatisticasService).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_usuario: 'administrador' }),
      expect.objectContaining({ serie: '5', anoLetivo: '2026' })
    )
  })

  it('200 com filtro avaliacao_id repassado ao service', async () => {
    const avUUID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    mockEstatisticasService.mockResolvedValueOnce({ totalAlunos: 100 } as any)
    const res = await getEstatisticas(
      makeGetRequest('/api/admin/estatisticas', { avaliacao_id: avUUID })
    )
    expect(res.status).toBe(200)
    expect(mockEstatisticasService).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ avaliacaoId: avUUID })
    )
  })

  it('200 com fallback quando service lança erro (okComFallback)', async () => {
    const { getEstatisticasPadrao } = await import('@/lib/services/estatisticas.service')
    vi.mocked(getEstatisticasPadrao).mockReturnValue({ totalAlunos: 0, mediaGeral: null, taxaPresenca: 0 } as any)
    mockEstatisticasService.mockRejectedValueOnce(new Error('banco indisponível'))
    const res = await getEstatisticas(makeGetRequest('/api/admin/estatisticas'))
    // okComFallback retorna 200 mesmo com erro (degradação graciosa)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalAlunos).toBe(0) // dados padrão de fallback
  })
})

// ------------------------------------------------------------------ estatisticas-serie --

describe('GET /api/admin/estatisticas-serie', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockGetUsuario.mockResolvedValue(ADMIN as any)
    mockVerificarPermissao.mockReturnValue(true)
  })

  it('401 quando não autenticado', async () => {
    mockGetUsuario.mockResolvedValue(null as any)
    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(401)
  })

  it('403 quando perfil sem permissão', async () => {
    mockGetUsuario.mockResolvedValue({ ...ADMIN, tipo_usuario: 'publicador' } as any)
    mockVerificarPermissao.mockReturnValue(false)
    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(403)
  })

  it('200 retorna array com estatísticas e total_series', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        numero_serie: '5', nome_serie: '5 Ano',
        total_alunos: '120', total_escolas: '4', total_turmas: '6',
        presentes: '100', faltas: '20',
        media_lp: '7.5', media_mat: '6.8',
        media_ch: null, media_cn: null, media_producao: '7.2',
        media_geral: '7.17',
        qtd_insuficiente: '10', qtd_basico: '30', qtd_adequado: '40', qtd_avancado: '20',
        tem_producao_textual: true, qtd_itens_producao: '4', avalia_ch: false, avalia_cn: false,
        usa_nivel_aprendizagem: true, total_questoes_objetivas: '20',
      }],
    } as any)

    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total_series).toBe(1)
    expect(Array.isArray(body.estatisticas)).toBe(true)
    expect(body.estatisticas[0].numero_serie).toBe('5')
  })

  it('200 calcula percentuais de nível de aprendizagem corretamente', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        numero_serie: '2', nome_serie: '2 Ano',
        total_alunos: '50', total_escolas: '2', total_turmas: '2',
        presentes: '40', faltas: '10',
        media_lp: '7.0', media_mat: '6.5',
        media_ch: null, media_cn: null, media_producao: '7.0',
        media_geral: '6.83',
        qtd_insuficiente: '4',  // 4/40 = 10%
        qtd_basico: '12',       // 12/40 = 30%
        qtd_adequado: '16',     // 16/40 = 40%
        qtd_avancado: '8',      // 8/40 = 20%
        tem_producao_textual: true, qtd_itens_producao: '3', avalia_ch: false, avalia_cn: false,
        usa_nivel_aprendizagem: true, total_questoes_objetivas: '15',
      }],
    } as any)

    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const stat = body.estatisticas[0]
    expect(stat.percentual_insuficiente).toBe(10)  // 4/40*100
    expect(stat.percentual_basico).toBe(30)
    expect(stat.percentual_adequado).toBe(40)
    expect(stat.percentual_avancado).toBe(20)
    expect(stat.taxa_presenca).toBe(80)             // 40/(40+10)*100
    expect(stat.tipo_avaliacao).toBe('anos_iniciais')
  })

  it('200 taxa_presenca = 0 quando sem alunos (evita divisão por zero)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        numero_serie: '9', nome_serie: '9 Ano',
        total_alunos: '0', total_escolas: '1', total_turmas: '1',
        presentes: '0', faltas: '0',
        media_lp: null, media_mat: null,
        media_ch: null, media_cn: null, media_producao: null,
        media_geral: null,
        qtd_insuficiente: '0', qtd_basico: '0', qtd_adequado: '0', qtd_avancado: '0',
        tem_producao_textual: false, qtd_itens_producao: '0', avalia_ch: true, avalia_cn: true,
        usa_nivel_aprendizagem: false, total_questoes_objetivas: '20',
      }],
    } as any)

    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.estatisticas[0].taxa_presenca).toBe(0)
    expect(body.estatisticas[0].percentual_insuficiente).toBe(0)
    expect(body.estatisticas[0].tipo_avaliacao).toBe('anos_finais')
  })

  it('200 escopo escola: usuario escola_id é passado para addAccessControl', async () => {
    mockGetUsuario.mockResolvedValue(ESCOLA_USER as any)
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(200)
    // A query deve ter a escola_id do usuário nos parâmetros (controle de acesso)
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain(ESCOLA_USER.escola_id)
  })

  it('200 filtro serie restringe por número de série', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await getEstatisticasSerie(
      makeGetRequest('/api/admin/estatisticas-serie', { serie: '3' })
    )
    expect(res.status).toBe(200)
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('3')
  })

  it('200 retorna vazio quando nenhum dado encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.estatisticas).toEqual([])
    expect(body.total_series).toBe(0)
  })

  it('500 em erro inesperado de banco', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'))
    const res = await getEstatisticasSerie(makeGetRequest('/api/admin/estatisticas-serie'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.mensagem).toMatch(/erro interno/i)
  })
})
