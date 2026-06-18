import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/auth', () => ({
  getUsuarioFromRequest: vi.fn(),
  verificarPermissao: vi.fn().mockReturnValue(true),
}))

import pool from '@/database/connection'
import { getUsuarioFromRequest } from '@/lib/auth'
import { GET } from '@/app/api/admin/notas-escolares/boletim/route'

const mockQuery = vi.mocked(pool.query)
const mockUser = vi.mocked(getUsuarioFromRequest)

const ADMIN = {
  id: 'admin-1', nome: 'Admin', email: 'admin@test.com',
  tipo_usuario: 'administrador', ativo: true,
} as any

function req() {
  return new NextRequest('http://localhost/api/admin/notas-escolares/boletim?aluno_id=al-1&ano_letivo=2026')
}

const rowsAluno = {
  rows: [{
    id: 'al-1', nome: 'Maria', codigo: 'A1', serie: '5º Ano', ano_letivo: '2026', situacao: 'ativo',
    escola_nome: 'EM Teste', escola_id: 'esc-1', polo_id: 'polo-1', turma_codigo: '5A', turma_nome: '5º A',
  }],
  rowCount: 1,
} as any

const rowsConfig = { rows: [], rowCount: 0 } as any

function rowsRegra(formula: string, arredondamento: string, qtdPeriodos: number) {
  return {
    rows: [{
      formula_efetiva: formula, pesos_efetivos: null, qtd_periodos: qtdPeriodos,
      aprovacao_efetiva: false, regra_media_aprovacao: 6, escola_media_aprovacao: null,
      regra_nota_maxima: 10, escola_nota_maxima: null,
      arredondamento, casas_decimais: 1, tipo_resultado: 'nota',
    }],
    rowCount: 1,
  } as any
}

function rowsPeriodos(n: number) {
  return {
    rows: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, nome: `${i + 1}º Bim`, tipo: 'bimestre', numero: i + 1 })),
    rowCount: n,
  } as any
}

const rowsDisciplina = {
  rows: [{ id: 'd-mat', nome: 'Matemática', codigo: 'MAT', abreviacao: 'MAT', ordem: 1 }],
  rowCount: 1,
} as any

function nota(periodoId: string, valor: string) {
  return {
    disciplina_id: 'd-mat', periodo_id: periodoId, nota: valor, nota_recuperacao: null,
    nota_final: valor, faltas: 0, observacao: null, conceito: null, parecer_descritivo: null,
  }
}

const rowsFreqVazia = { rows: [], rowCount: 0 } as any

describe('GET /api/admin/notas-escolares/boletim — média via helper (Fase 4.2 dívida)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.mockResolvedValue(ADMIN)
  })

  it('soma_dividida usa o divisor TOTAL da regra (paridade com o fechamento)', async () => {
    // 4 períodos na regra; notas só em 2 (8.0 e 8.0).
    // Helper soma_dividida: (8+8)/4 = 4.0 → reprovado.
    // Código antigo dividia por períodos COM nota (2) → 8.0 (aprovado). Bug corrigido.
    mockQuery
      .mockResolvedValueOnce(rowsAluno)
      .mockResolvedValueOnce(rowsConfig)
      .mockResolvedValueOnce(rowsRegra('soma_dividida', 'normal', 4))
      .mockResolvedValueOnce(rowsPeriodos(4))
      .mockResolvedValueOnce(rowsDisciplina)
      .mockResolvedValueOnce({ rows: [nota('p1', '8.0'), nota('p2', '8.0')], rowCount: 2 } as any)
      .mockResolvedValueOnce(rowsFreqVazia)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    const mat = body.boletim.find((d: any) => d.disciplina_id === 'd-mat')
    expect(mat.media_anual).toBe(4.0)
    expect(mat.situacao).toBe('reprovado')
  })

  it('arredondamento "nenhum" não trunca o valor (mantém precisão como o fechamento)', async () => {
    // media_aritmetica de 6.3, 6.4, 6.4 = 19.1/3 = 6.3666...
    // Helper 'nenhum' preserva o valor (~6.366667); código antigo truncava p/ 6.3.
    mockQuery
      .mockResolvedValueOnce(rowsAluno)
      .mockResolvedValueOnce(rowsConfig)
      .mockResolvedValueOnce(rowsRegra('media_aritmetica', 'nenhum', 3))
      .mockResolvedValueOnce(rowsPeriodos(3))
      .mockResolvedValueOnce(rowsDisciplina)
      .mockResolvedValueOnce({ rows: [nota('p1', '6.3'), nota('p2', '6.4'), nota('p3', '6.4')], rowCount: 3 } as any)
      .mockResolvedValueOnce(rowsFreqVazia)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    const mat = body.boletim.find((d: any) => d.disciplina_id === 'd-mat')
    expect(mat.media_anual).not.toBe(6.3)
    expect(mat.media_anual).toBeCloseTo(6.366667, 5)
  })
})
