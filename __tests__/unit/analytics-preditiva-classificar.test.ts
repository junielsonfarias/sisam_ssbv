/**
 * Testes unitários — analytics-preditiva.service
 *
 * Cobre: NivelRisco, classificarRisco (via comportamento de calcularRiscoAluno),
 * lógica de score por fator (frequência, notas, FICAI, BF, distorção, histórico),
 * controle de acesso (IDOR via escopo polo/escola).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calcularRiscoAluno } from '@/lib/services/analytics-preditiva.service'

// Mock do pool — usando vi.hoisted para evitar problema de inicialização antes do hoist
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }))
vi.mock('@/database/connection', () => ({
  default: { query: mockQuery },
}))

vi.mock('@/lib/observabilidade/capturar-erro-silencioso', () => ({
  reportarErroSilencioso: vi.fn(),
}))

// ============================================================================
// Helpers
// ============================================================================

function makeAdmin() {
  return { tipo_usuario: 'administrador' as const, polo_id: null, escola_id: null }
}

function makePolo() {
  return { tipo_usuario: 'polo' as const, polo_id: 'polo-1', escola_id: null }
}

function makeEscola() {
  return { tipo_usuario: 'escola' as const, polo_id: null, escola_id: 'esc-1' }
}

function alunoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aluno-1',
    nome: 'Fulano Silva',
    data_nascimento: new Date('2015-01-01').toISOString(), // ~11 anos → série 6 (dist OK)
    serie: '6',
    escola_id: 'esc-1',
    escola_nome: 'Escola Teste',
    turma_codigo: 'T01',
    beneficiario_bolsa_familia: false,
    ...overrides,
  }
}

// Configura mockQuery para sequência de chamadas de calcularRiscoAluno:
// 1: aluno básico, 2: frequência, 3: notas, 4: FICAI, 5: histórico
function setupMockSequence({
  aluno = alunoRow(),
  freqPct = null as number | null,
  mediaNota = null as number | null,
  ficaiTotal = 0,
  histTotal = 0,
} = {}) {
  mockQuery.mockResolvedValueOnce({ rows: aluno ? [aluno] : [] })
  mockQuery.mockResolvedValueOnce({ rows: freqPct !== null ? [{ pct: freqPct / 100 }] : [{}] })
  mockQuery.mockResolvedValueOnce({ rows: mediaNota !== null ? [{ media: String(mediaNota) }] : [{}] })
  mockQuery.mockResolvedValueOnce({ rows: [{ total: String(ficaiTotal) }] })
  mockQuery.mockResolvedValueOnce({ rows: [{ total: String(histTotal) }] })
}

// ============================================================================
// calcularRiscoAluno — caso básico (sem fatores de risco)
// ============================================================================

describe('calcularRiscoAluno — aluno não encontrado', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('retorna null quando aluno não existe no banco', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const r = await calcularRiscoAluno('aluno-x', '2026')
    expect(r).toBeNull()
  })
})

describe('calcularRiscoAluno — escopo de acesso (IDOR)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('usuário polo envia parâmetro polo_id para restricão de escola', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8 })
    await calcularRiscoAluno('aluno-1', '2026', makePolo())

    const primeiraQuery = mockQuery.mock.calls[0]
    const sql: string = primeiraQuery[0]
    // Deve incluir subquery de polo
    expect(sql).toContain('polo_id')
    const params = primeiraQuery[1] as unknown[]
    expect(params).toContain('polo-1')
  })

  it('usuário escola envia escola_id para restrição', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8 })
    await calcularRiscoAluno('aluno-1', '2026', makeEscola())

    const primeiraQuery = mockQuery.mock.calls[0]
    const sql: string = primeiraQuery[0]
    expect(sql).toContain('escola_id')
    const params = primeiraQuery[1] as unknown[]
    expect(params).toContain('esc-1')
  })

  it('admin não adiciona restrição de escopo', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8 })
    await calcularRiscoAluno('aluno-1', '2026', makeAdmin())

    const primeiraQuery = mockQuery.mock.calls[0]
    const params = primeiraQuery[1] as unknown[]
    // Somente o aluno_id deve ser parâmetro (sem polo/escola extra)
    expect(params).toHaveLength(1)
    expect(params[0]).toBe('aluno-1')
  })
})

describe('calcularRiscoAluno — score de frequência', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('frequência crítica (<50%) → contribui +35 ao score', async () => {
    setupMockSequence({ freqPct: 40, mediaNota: null })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r).not.toBeNull()
    const fatorFreq = r!.fatores.find(f => f.nome.includes('crítica'))
    expect(fatorFreq).toBeDefined()
    expect(fatorFreq!.contribuicao).toBe(35)
    expect(r!.score).toBeGreaterThanOrEqual(35)
  })

  it('frequência baixa (<75%) → contribui +20 ao score', async () => {
    setupMockSequence({ freqPct: 65, mediaNota: null })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r).not.toBeNull()
    const fatorFreq = r!.fatores.find(f => f.nome.includes('baixa'))
    expect(fatorFreq).toBeDefined()
    expect(fatorFreq!.contribuicao).toBe(20)
  })

  it('frequência regular (<85%) → contribui +10 ao score', async () => {
    setupMockSequence({ freqPct: 78, mediaNota: null })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r).not.toBeNull()
    const fatorFreq = r!.fatores.find(f => f.nome.includes('regular'))
    expect(fatorFreq).toBeDefined()
    expect(fatorFreq!.contribuicao).toBe(10)
  })

  it('frequência boa (>=85%) → nenhum fator de frequência', async () => {
    setupMockSequence({ freqPct: 92, mediaNota: null })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r).not.toBeNull()
    const fatorFreq = r!.fatores.find(f => f.nome.toLowerCase().includes('frequência') || f.nome.toLowerCase().includes('frequencia'))
    expect(fatorFreq).toBeUndefined()
  })
})

describe('calcularRiscoAluno — score de notas', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('média crítica (<4.0) → contribui +25', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 3.5 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorNota = r!.fatores.find(f => f.nome.includes('crítica'))
    expect(fatorNota).toBeDefined()
    expect(fatorNota!.contribuicao).toBe(25)
  })

  it('média baixa (<5.0) → contribui +18', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 4.5 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorNota = r!.fatores.find(f => f.nome.includes('baixa'))
    expect(fatorNota).toBeDefined()
    expect(fatorNota!.contribuicao).toBe(18)
  })

  it('média insuficiente (<6.0) → contribui +10', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 5.5 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorNota = r!.fatores.find(f => f.nome.includes('insuficiente'))
    expect(fatorNota).toBeDefined()
    expect(fatorNota!.contribuicao).toBe(10)
  })

  it('média boa (>=6.0) → nenhum fator de nota', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 7.0 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorNota = r!.fatores.find(f => f.nome.toLowerCase().includes('média'))
    expect(fatorNota).toBeUndefined()
  })
})

describe('calcularRiscoAluno — fator FICAI', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('FICAI ativo → contribui +20', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8, ficaiTotal: 1 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorFicai = r!.fatores.find(f => f.nome.includes('FICAI'))
    expect(fatorFicai).toBeDefined()
    expect(fatorFicai!.contribuicao).toBe(20)
  })

  it('sem FICAI → fator não aparece', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8, ficaiTotal: 0 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorFicai = r!.fatores.find(f => f.nome.includes('FICAI'))
    expect(fatorFicai).toBeUndefined()
  })
})

describe('calcularRiscoAluno — fator Bolsa Família', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('beneficiário BF → contribui +5', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [alunoRow({ beneficiario_bolsa_familia: true })] })
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: 0.9 }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '8' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorBF = r!.fatores.find(f => f.nome.includes('Bolsa Família'))
    expect(fatorBF).toBeDefined()
    expect(fatorBF!.contribuicao).toBe(5)
  })
})

describe('calcularRiscoAluno — fator histórico de transferências', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('2+ ocorrências → contribui +10', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8, histTotal: 2 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorHist = r!.fatores.find(f => f.nome.includes('histórico') || f.nome.includes('transferência') || f.nome.includes('Histórico'))
    expect(fatorHist).toBeDefined()
    expect(fatorHist!.contribuicao).toBe(10)
  })

  it('1 ocorrência → não contribui (limiar é >=2)', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8, histTotal: 1 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    const fatorHist = r!.fatores.find(f => (f.nome.includes('histórico') || f.nome.includes('transferência') || f.nome.includes('Histórico')) && f.contribuicao === 10)
    expect(fatorHist).toBeUndefined()
  })
})

describe('calcularRiscoAluno — classificação de nível de risco', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('score < 31 → nível baixo', async () => {
    // Score esperado: 0
    setupMockSequence({ freqPct: 95, mediaNota: 9, ficaiTotal: 0, histTotal: 0 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r!.nivel).toBe('baixo')
    expect(r!.score).toBeLessThan(31)
  })

  it('score entre 31 e 60 → nível medio', async () => {
    // freq baixa (<75%) = +20, nota insuficiente (<6) = +10 → score 30... Adicionar BF para 35
    mockQuery.mockResolvedValueOnce({ rows: [alunoRow({ beneficiario_bolsa_familia: true })] })
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: 0.65 }] }) // 65% → baixa → +20
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '5.5' }] }) // <6 → +10
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] }) // FICAI
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] }) // histórico
    // Total = +20 (freq) + 10 (nota) + 5 (BF) = 35 → meio
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r!.nivel).toBe('medio')
  })

  it('score >= 61 → nível alto', async () => {
    // freq crítica (<50%) = +35, nota crítica (<4) = +25, FICAI = +20 → score 80
    mockQuery.mockResolvedValueOnce({ rows: [alunoRow()] })
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: 0.40 }] }) // 40% → crítica → +35
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '3.0' }] }) // <4 → +25
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] }) // FICAI → +20
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] }) // histórico
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r!.nivel).toBe('alto')
    expect(r!.score).toBeGreaterThanOrEqual(61)
  })
})

describe('calcularRiscoAluno — estrutura da resposta', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('retorna PredicaoEvasao com todos os campos esperados', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8 })
    const r = await calcularRiscoAluno('aluno-1', '2026', makeAdmin())
    expect(r).not.toBeNull()
    expect(r).toHaveProperty('aluno_id')
    expect(r).toHaveProperty('aluno_nome')
    expect(r).toHaveProperty('escola_id')
    expect(r).toHaveProperty('escola_nome')
    expect(r).toHaveProperty('turma_codigo')
    expect(r).toHaveProperty('score')
    expect(r).toHaveProperty('nivel')
    expect(r).toHaveProperty('fatores')
    expect(Array.isArray(r!.fatores)).toBe(true)
  })

  it('ano_letivo é passado para as queries de frequência e notas', async () => {
    setupMockSequence({ freqPct: 90, mediaNota: 8 })
    await calcularRiscoAluno('aluno-1', '2024', makeAdmin())
    // Query de frequência (chamada 2)
    const freqCall = mockQuery.mock.calls[1]
    expect(freqCall[1]).toContain('2024')
  })
})
