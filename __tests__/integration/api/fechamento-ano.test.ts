import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest, verificarPermissao } from '@/lib/auth'
import { GET } from '@/app/api/admin/fechamento-ano/route'

const mockQuery = vi.mocked(pool.query)
const mockUser = vi.mocked(getUsuarioFromRequest)

const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true,
} as any

function req() {
  return new NextRequest('http://localhost/api/admin/fechamento-ano?escola_id=esc-1&ano_letivo=2026')
}

// 1 aluno na 5ª série (serieParaCodigo -> "5")
const rowsAlunos = {
  rows: [{ id: 'al-1', nome: 'Maria', serie: '5º Ano', turma_id: 't-1', turma_codigo: '5A', turma_nome: '5º A' }],
  rowCount: 1,
} as any

// Regra: média 6, 4 períodos, nota (não parecer), sem aprovação automática.
function rowsRegras(maxDependencias: number) {
  return {
    rows: [{
      serie_codigo: '5', max_dependencias: maxDependencias,
      regra_id: 'r-1', formula_media: 'media_ponderada', pesos_periodos: null,
      media_aprovacao: 6, nota_maxima: 10, qtd_periodos: 4,
      aprovacao_automatica: false, casas_decimais: 1, arredondamento: 'normal',
      tipo_resultado: 'nota',
    }],
    rowCount: 1,
  } as any
}

// Matemática abaixo (4.0 nos 4 períodos), Português acima (8.0). 1 disciplina abaixo.
const rowsNotas = {
  rows: [
    ...[1, 2, 3, 4].map(p => ({ aluno_id: 'al-1', disciplina_id: 'd-mat', nota_final: '4.0', disciplina_nome: 'Matemática', disciplina_codigo: 'MAT', periodo_numero: p })),
    ...[1, 2, 3, 4].map(p => ({ aluno_id: 'al-1', disciplina_id: 'd-por', nota_final: '8.0', disciplina_nome: 'Português', disciplina_codigo: 'POR', periodo_numero: p })),
  ],
  rowCount: 8,
} as any

const rowsConfigFreq = { rows: [], rowCount: 0 } as any // defaults 75%, não abona

// Frequência 95% (>= 75%) — não reprova por frequência
const rowsFreq = {
  rows: [{ aluno_id: 'al-1', total_dias: '200', total_presencas: '190', total_faltas: '10', total_justificadas: '0' }],
  rowCount: 1,
} as any

const rowsPareceres = { rows: [], rowCount: 0 } as any // sem conselho

// Ano sem datas -> calcularDiasLetivos retorna suficientes:null (só 1 query)
const rowsAnoSemDatas = {
  rows: [{ id: 'ano-1', data_inicio: null, data_fim: null, dias_letivos_total: 200 }],
  rowCount: 1,
} as any

function montarMocks(maxDependencias: number) {
  mockQuery
    .mockResolvedValueOnce(rowsAlunos)          // 1. alunos cursando
    .mockResolvedValueOnce(rowsRegras(maxDependencias)) // 2. regras
    .mockResolvedValueOnce(rowsNotas)           // 3. notas
    .mockResolvedValueOnce(rowsConfigFreq)      // 4. config frequência
    .mockResolvedValueOnce(rowsFreq)            // 5. frequência bimestral
    .mockResolvedValueOnce(rowsPareceres)       // 6. pareceres conselho
    .mockResolvedValueOnce(rowsAnoSemDatas)     // 7. anos_letivos (dias letivos)
}

describe('GET /api/admin/fechamento-ano — progressão parcial (Fase 2.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockResolvedValue(ADMIN)
  })

  it('propõe progressão parcial quando nº de disciplinas abaixo cabe em max_dependencias', async () => {
    montarMocks(2) // 1 disciplina abaixo <= 2 permitidas

    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.resultados).toHaveLength(1)
    expect(data.resultados[0].situacao_proposta).toBe('progressao_parcial')
    expect(data.resultados[0].motivo).toContain('Matemática')
    expect(data.resumo.dependencias).toBe(1)
    expect(data.resumo.reprovados).toBe(0)
  })

  it('reprova quando max_dependencias = 0 (rede não permite dependência)', async () => {
    montarMocks(0)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.resultados[0].situacao_proposta).toBe('reprovado')
    expect(data.resumo.dependencias).toBe(0)
    expect(data.resumo.reprovados).toBe(1)
  })
})
