import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn(),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const mockQuery = vi.mocked(pool.query)
const mockUser = vi.mocked(getUsuarioFromRequest)
const mockPerm = vi.mocked(verificarPermissao)
const mockAudit = vi.mocked(registrarAuditoria)

const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true,
} as const

const ESCOLA_OUTRA = {
  id: 'esc-1', nome: 'Escola', email: 'esc@test.com',
  tipo_usuario: 'escola', ativo: true, escola_id: 'escola-outra',
} as const

function req(url = '/api/admin/turmas/turma-1/diario-lacunas') {
  return new NextRequest(`http://localhost${url}`)
}

// ============================================================================
// Helpers de mock de rows do pg
// ============================================================================
function rowsTurma(overrides: Partial<{
  sensivel: boolean
  escola_id: string
  ano_letivo_id: string | null
  ano_data_inicio: string | null
  ano_data_fim: string | null
}> = {}) {
  // Importante: usar `in` (nao ??) para permitir override com null explicito
  return {
    rows: [{
      id: 'turma-1',
      codigo: 'IUMP01',
      ano_letivo: '2026',
      sensivel: 'sensivel' in overrides ? overrides.sensivel : false,
      escola_id: 'escola_id' in overrides ? overrides.escola_id : 'escola-1',
      ano_letivo_id: 'ano_letivo_id' in overrides ? overrides.ano_letivo_id : 'ano-2026',
      ano_data_inicio: 'ano_data_inicio' in overrides ? overrides.ano_data_inicio : '2026-02-03',
      ano_data_fim: 'ano_data_fim' in overrides ? overrides.ano_data_fim : '2026-12-18',
    }],
    rowCount: 1,
  } as any
}

function rowsAgregacao(meses: Array<{ ano: number; mes: number; dias: number; com: number; lacunas?: string[] }>) {
  return {
    rows: meses.map(m => ({
      ano: m.ano,
      mes: m.mes,
      dias_letivos: m.dias,
      dias_com_lancamento: m.com,
      lacunas: m.dias - m.com,
      lacunas_datas: m.lacunas ?? null,
    })),
    rowCount: meses.length,
  } as any
}

// ============================================================================
// Suite
// ============================================================================
describe('GET /api/admin/turmas/[id]/diario-lacunas', () => {
  beforeEach(() => {
    // resetAllMocks limpa a fila de mockResolvedValueOnce (clearAllMocks
    // só limpa mock.calls, nao as implementacoes). Precisamos re-mockar
    // as funcoes globais depois.
    vi.resetAllMocks()
    mockUser.mockResolvedValue(ADMIN as any)
    mockPerm.mockReturnValue(true)
  })

  it('retorna 404 quando a turma nao existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req())
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toMatch(/n[aã]o encontrada/i)
  })

  it('retorna 403 quando escola tenta ler turma de outra escola', async () => {
    mockUser.mockResolvedValueOnce(ESCOLA_OUTRA as any)
    mockQuery.mockResolvedValueOnce(rowsTurma({ escola_id: 'escola-1' }))
    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req())
    expect(res.status).toBe(403)
  })

  it('retorna 422 quando o ano letivo nao esta cadastrado em anos_letivos', async () => {
    mockQuery.mockResolvedValueOnce(rowsTurma({ ano_letivo_id: null }))
    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req())
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.mensagem).toMatch(/anos_letivos/i)
  })

  it('agrega lacunas por mes no caminho feliz', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma())
      .mockResolvedValueOnce(rowsAgregacao([
        { ano: 2026, mes: 2, dias: 16, com: 10, lacunas: ['2026-02-12', '2026-02-13'] },
        { ano: 2026, mes: 3, dias: 22, com: 22 },
      ]))

    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.resumo.dias_letivos_total).toBe(38)
    expect(body.resumo.dias_com_lancamento).toBe(32)
    expect(body.resumo.lacunas_total).toBe(6)
    // 32/38 = 0.842 => "84.2"
    expect(body.resumo.percentual_cobertura).toBe('84.2')

    expect(body.lacunas_por_mes).toHaveLength(2)
    expect(body.lacunas_por_mes[0]).toMatchObject({
      ano: 2026, mes: 2, mes_nome: 'Fevereiro', lacunas: 6,
    })
    expect(body.lacunas_por_mes[0].lacunas_datas).toEqual(['2026-02-12', '2026-02-13'])
    expect(body.lacunas_por_mes[1].lacunas_datas).toEqual([])
  })

  it('NAO chama registrarAuditoria quando a turma nao e sensivel', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma({ sensivel: false }))
      .mockResolvedValueOnce(rowsAgregacao([{ ano: 2026, mes: 2, dias: 1, com: 1 }]))

    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    await GET(req())
    expect(mockAudit).not.toHaveBeenCalled()
  })

  it('chama registrarAuditoria com DIARIO_LER_SENSIVEL quando a turma e sensivel', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma({ sensivel: true }))
      .mockResolvedValueOnce(rowsAgregacao([{ ano: 2026, mes: 2, dias: 1, com: 1 }]))

    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    await GET(req())
    expect(mockAudit).toHaveBeenCalledTimes(1)
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'DIARIO_LER_SENSIVEL',
        entidade: 'turma',
        entidadeId: 'turma-1',
        detalhes: expect.objectContaining({
          ano_letivo: '2026',
          fonte: 'diario-lacunas',
        }),
      })
    )
  })

  it('quando periodo_id e informado mas o periodo nao existe, retorna 404', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma())
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req('/api/admin/turmas/turma-1/diario-lacunas?periodo_id=00000000-0000-0000-0000-000000000001'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.mensagem).toMatch(/per[ií]odo n[aã]o encontrado/i)
  })

  it('quando periodo_id e informado mas o periodo nao tem datas, retorna 422', async () => {
    mockQuery
      .mockResolvedValueOnce(rowsTurma())
      .mockResolvedValueOnce({
        rows: [{ id: 'p1', nome: '1bim', numero: 1, data_inicio: null, data_fim: null }],
        rowCount: 1,
      } as any)

    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req('/api/admin/turmas/turma-1/diario-lacunas?periodo_id=00000000-0000-0000-0000-000000000001'))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.mensagem).toMatch(/datas configuradas/i)
  })

  it('quando periodo_id nao e um UUID valido, retorna 400 (sem ir ao banco)', async () => {
    const { GET } = await import('@/app/api/admin/turmas/[id]/diario-lacunas/route')
    const res = await GET(req('/api/admin/turmas/turma-1/diario-lacunas?periodo_id=abc'))
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.mensagem).toMatch(/inv[aá]lido/i)
  })
})
