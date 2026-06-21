/**
 * Testes unitários — kpis-semed/{gerais, frequencia, desempenho, programas, comparativo}
 *
 * Mocka pool.query e verifica comportamento das funções de KPI:
 * - caminho feliz (dados normais)
 * - escopo por polo (restrição de acesso)
 * - valores padrão em caso de erro/tabela vazia
 * - cálculos de percentuais (pctAprov, IDEB projetado, pddePct)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obterKpisGerais } from '@/lib/services/kpis-semed/gerais'
import { obterKpisFrequencia } from '@/lib/services/kpis-semed/frequencia'
import { obterKpisDesempenho } from '@/lib/services/kpis-semed/desempenho'
import { obterKpisProgramas } from '@/lib/services/kpis-semed/programas'
import { obterComparativoEscolas } from '@/lib/services/kpis-semed/comparativo'

// ============================================================================
// Mock global do pool
// ============================================================================
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }))
vi.mock('@/database/connection', () => ({
  default: { query: mockQuery },
}))

vi.mock('@/lib/observabilidade/capturar-erro-silencioso', () => ({
  reportarErroSilencioso: vi.fn(),
}))

// ============================================================================
// obterKpisGerais
// ============================================================================

describe('obterKpisGerais', () => {
  beforeEach(() => vi.resetAllMocks())

  it('caminho feliz → retorna KPIs parseados como inteiros', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        total_alunos: '3755',
        total_escolas: '42',
        total_professores: '210',
        total_servidores: '95',
        alunos_pne: '78',
        alunos_bf: '1200',
      }],
    })

    const r = await obterKpisGerais('2026')
    expect(r.total_alunos).toBe(3755)
    expect(r.total_escolas).toBe(42)
    expect(r.total_professores).toBe(210)
    expect(r.total_servidores).toBe(95)
    expect(r.alunos_pne).toBe(78)
    expect(r.alunos_bf).toBe(1200)
    expect(r.ano_letivo).toBe('2026')
  })

  it('retorna zeros quando row está vazia (tabela sem dados)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] })
    const r = await obterKpisGerais('2026')
    expect(r.total_alunos).toBe(0)
    expect(r.total_escolas).toBe(0)
    expect(r.ano_letivo).toBe('2026')
  })

  it('usuário polo → parâmetro polo_id incluso na query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total_alunos: '100', total_escolas: '5', total_professores: '20', total_servidores: '0', alunos_pne: '3', alunos_bf: '30' }] })
    await obterKpisGerais('2026', { tipo_usuario: 'polo', polo_id: 'polo-1', escola_id: null })
    const call = mockQuery.mock.calls[0]
    expect(call[1]).toContain('polo-1')
  })

  it('usuário polo → SQL inclui filtro de polo_id para escolas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total_alunos: '50', total_escolas: '2', total_professores: '8', total_servidores: '0', alunos_pne: '1', alunos_bf: '10' }] })
    await obterKpisGerais('2026', { tipo_usuario: 'polo', polo_id: 'polo-x', escola_id: null })
    const sql: string = mockQuery.mock.calls[0][0]
    expect(sql).toContain('polo_id')
    // Para polo, servidores não são consultados (retorna 0 hardcoded)
    expect(sql).toContain('0')
  })

  it('admin sem polo → SQL sem filtro de polo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total_alunos: '3000', total_escolas: '30', total_professores: '150', total_servidores: '80', alunos_pne: '60', alunos_bf: '900' }] })
    await obterKpisGerais('2026', { tipo_usuario: 'administrador', polo_id: null, escola_id: null })
    const sql: string = mockQuery.mock.calls[0][0]
    // Admin consulta servidores de verdade (não zero)
    expect(sql).toContain('servidores')
  })
})

// ============================================================================
// obterKpisFrequencia
// ============================================================================

describe('obterKpisFrequencia', () => {
  beforeEach(() => vi.resetAllMocks())

  it('caminho feliz → retorna frequência e infrequentes parseados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ freq_media: '87.3', infrequentes: '45' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '12' }] })

    const r = await obterKpisFrequencia('2026')
    expect(r.frequencia_media_pct).toBe(87.3)
    expect(r.alunos_infrequentes).toBe(45)
    expect(r.alunos_evasao_risco).toBe(12)
  })

  it('tabela vazia → retorna zeros', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] })
    mockQuery.mockResolvedValueOnce({ rows: [{}] })
    const r = await obterKpisFrequencia('2026')
    expect(r.frequencia_media_pct).toBe(0)
    expect(r.alunos_infrequentes).toBe(0)
    expect(r.alunos_evasao_risco).toBe(0)
  })

  it('erro de banco → retorna zeros (sem lançar exceção)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'))
    const r = await obterKpisFrequencia('2026')
    expect(r.frequencia_media_pct).toBe(0)
    expect(r.alunos_infrequentes).toBe(0)
    expect(r.alunos_evasao_risco).toBe(0)
  })

  it('usuário polo → filtra alunos da escola do polo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ freq_media: '90', infrequentes: '5' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }] })
    await obterKpisFrequencia('2026', { tipo_usuario: 'polo', polo_id: 'polo-1', escola_id: null })
    const sql: string = mockQuery.mock.calls[0][0]
    expect(sql).toContain('polo_id')
  })
})

// ============================================================================
// obterKpisDesempenho
// ============================================================================

describe('obterKpisDesempenho', () => {
  beforeEach(() => vi.resetAllMocks())

  it('caminho feliz → calcula IDEB projetado e percentuais', async () => {
    // Query notas
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '7.5' }] })
    // Query situação
    mockQuery.mockResolvedValueOnce({ rows: [
      { situacao: 'aprovado', total: '200' },
      { situacao: 'reprovado', total: '30' },
      { situacao: 'abandono', total: '20' },
    ]})
    // Query distorção
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: '12.5' }] })

    const r = await obterKpisDesempenho('2026')
    expect(r.media_geral).toBe(7.5)
    // 200/250 = 80%
    expect(r.taxa_aprovacao_pct).toBe(80)
    // 30/250 = 12%
    expect(r.taxa_reprovacao_pct).toBe(12)
    // 20/250 = 8%
    expect(r.taxa_abandono_pct).toBe(8)
    expect(r.distorcao_idade_serie_pct).toBe(12.5)
    // IDEB = (7.5 * 0.6) + (80/100 * 4) = 4.5 + 3.2 = 7.7
    expect(r.ideb_projetado).toBe(7.7)
  })

  it('sem dados de situação → taxas nulas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '6.0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [] }) // nenhuma situação
    mockQuery.mockResolvedValueOnce({ rows: [{}] })

    const r = await obterKpisDesempenho('2026')
    expect(r.taxa_aprovacao_pct).toBeNull()
    expect(r.taxa_reprovacao_pct).toBeNull()
    // IDEB não pode ser calculado sem taxa_aprovacao
    expect(r.ideb_projetado).toBeNull()
  })

  it('sem média de notas → media_geral e IDEB nulos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{}] }) // sem media
    mockQuery.mockResolvedValueOnce({ rows: [{ situacao: 'aprovado', total: '100' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{}] })

    const r = await obterKpisDesempenho('2026')
    expect(r.media_geral).toBeNull()
    expect(r.ideb_projetado).toBeNull()
  })

  it('erro no banco → retorna valores nulos sem lançar exceção', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'))
    const r = await obterKpisDesempenho('2026')
    expect(r.media_geral).toBeNull()
    expect(r.taxa_aprovacao_pct).toBeNull()
    expect(r.ideb_projetado).toBeNull()
  })

  it('somam "abandono" e "evadido" para taxa_abandono', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '7' }] })
    mockQuery.mockResolvedValueOnce({ rows: [
      { situacao: 'aprovado', total: '100' },
      { situacao: 'abandono', total: '10' },
      { situacao: 'evadido', total: '5' },
    ]})
    mockQuery.mockResolvedValueOnce({ rows: [{}] })

    const r = await obterKpisDesempenho('2026')
    // total = 115; abandono+evadido = 15; 15/115 * 100 = 13.0
    expect(r.taxa_abandono_pct).toBeCloseTo(13, 0)
  })

  it('usuário polo → filtra notas pela escola do polo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '7' }] })
    mockQuery.mockResolvedValueOnce({ rows: [] })
    mockQuery.mockResolvedValueOnce({ rows: [{}] })
    await obterKpisDesempenho('2026', { tipo_usuario: 'polo', polo_id: 'polo-2', escola_id: null })
    const sql: string = mockQuery.mock.calls[0][0]
    expect(sql).toContain('polo_id')
  })
})

// ============================================================================
// obterKpisProgramas
// ============================================================================

describe('obterKpisProgramas', () => {
  beforeEach(() => vi.resetAllMocks())

  it('caminho feliz → retorna KPIs de programas parseados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '5000' }] }) // pnae
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '320' }] })  // pnate
    mockQuery.mockResolvedValueOnce({ rows: [{ recebido: '100000', executado: '85000' }] }) // pdde
    mockQuery.mockResolvedValueOnce({ rows: [{ abertas: '7', urgentes: '2' }] }) // OS

    const r = await obterKpisProgramas('2026')
    expect(r.pnae_refeicoes_mes).toBe(5000)
    expect(r.pnate_alunos_atendidos).toBe(320)
    // pdde pct = 85000/100000 * 100 = 85%
    expect(r.pdde_executado_pct).toBe(85)
    expect(r.ordens_servico_abertas).toBe(7)
    expect(r.ordens_servico_urgentes).toBe(2)
  })

  it('PDDE sem recebido → pct nulo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ recebido: null, executado: null }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ abertas: '0', urgentes: '0' }] })

    const r = await obterKpisProgramas('2026')
    expect(r.pdde_executado_pct).toBeNull()
  })

  it('PDDE com recebido zero → pct nulo (evita divisão por zero)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ recebido: '0', executado: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ abertas: '0', urgentes: '0' }] })

    const r = await obterKpisProgramas('2026')
    expect(r.pdde_executado_pct).toBeNull()
  })

  it('erro em uma query → retorna padrão sem lançar exceção', async () => {
    mockQuery.mockRejectedValueOnce(new Error('falha pnae'))
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{}] })
    mockQuery.mockResolvedValueOnce({ rows: [{ abertas: '0', urgentes: '0' }] })

    const r = await obterKpisProgramas('2026')
    expect(r.pnae_refeicoes_mes).toBe(0)
  })

  it('usuário polo → filtra PNAE por escola do polo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '1000' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '50' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{}] })
    mockQuery.mockResolvedValueOnce({ rows: [{ abertas: '0', urgentes: '0' }] })
    await obterKpisProgramas('2026', { tipo_usuario: 'polo', polo_id: 'polo-3', escola_id: null })
    const sql0: string = mockQuery.mock.calls[0][0]
    expect(sql0).toContain('polo_id')
  })
})

// ============================================================================
// obterComparativoEscolas
// ============================================================================

describe('obterComparativoEscolas', () => {
  beforeEach(() => vi.resetAllMocks())

  it('caminho feliz — escola com frequência e média', async () => {
    // Primeira query: lista escolas
    mockQuery.mockResolvedValueOnce({ rows: [{
      escola_id: 'esc-1',
      escola_nome: 'Escola A',
      polo_nome: 'Polo Norte',
      total_alunos: '150',
      alunos_pne: '8',
      alertas_ficai: '3',
    }]})
    // Query frequência da escola
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: '91.5' }] })
    // Query média da escola
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '7.2' }] })

    const r = await obterComparativoEscolas('2026')
    expect(r).toHaveLength(1)
    expect(r[0].escola_id).toBe('esc-1')
    expect(r[0].escola_nome).toBe('Escola A')
    expect(r[0].polo_nome).toBe('Polo Norte')
    expect(r[0].total_alunos).toBe(150)
    expect(r[0].alunos_pne).toBe(8)
    expect(r[0].alertas_ficai).toBe(3)
    // Frequência arredondada
    expect(r[0].frequencia_pct).toBe(91.5)
    expect(r[0].media_geral).toBe(7.2)
  })

  it('escola sem frequência (dados insuficientes) → frequencia_pct null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{
      escola_id: 'esc-2',
      escola_nome: 'Escola B',
      polo_nome: null,
      total_alunos: '50',
      alunos_pne: '0',
      alertas_ficai: '0',
    }]})
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: null }] }) // sem freq
    mockQuery.mockResolvedValueOnce({ rows: [{ media: null }] }) // sem media

    const r = await obterComparativoEscolas('2026')
    expect(r[0].frequencia_pct).toBeNull()
    expect(r[0].media_geral).toBeNull()
  })

  it('lista vazia → retorna array vazio', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const r = await obterComparativoEscolas('2026')
    expect(r).toEqual([])
  })

  it('erro na query principal → retorna array vazio (sem lançar)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('falha'))
    const r = await obterComparativoEscolas('2026')
    expect(r).toEqual([])
  })

  it('usuário polo → WHERE inclui polo_id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    await obterComparativoEscolas('2026', { tipo_usuario: 'polo', polo_id: 'polo-9', escola_id: null })
    const sql: string = mockQuery.mock.calls[0][0]
    expect(sql).toContain('polo_id')
    expect(mockQuery.mock.calls[0][1]).toContain('polo-9')
  })

  it('múltiplas escolas → todas retornam com frequência e média individuais', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      { escola_id: 'esc-A', escola_nome: 'A', polo_nome: null, total_alunos: '100', alunos_pne: '0', alertas_ficai: '0' },
      { escola_id: 'esc-B', escola_nome: 'B', polo_nome: null, total_alunos: '80', alunos_pne: '2', alertas_ficai: '1' },
    ]})
    // escola A frequência + média
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: '88' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '7' }] })
    // escola B frequência + média
    mockQuery.mockResolvedValueOnce({ rows: [{ pct: '75' }] })
    mockQuery.mockResolvedValueOnce({ rows: [{ media: '5.5' }] })

    const r = await obterComparativoEscolas('2026')
    expect(r).toHaveLength(2)
    expect(r[0].escola_id).toBe('esc-A')
    expect(r[1].escola_id).toBe('esc-B')
    expect(r[1].media_geral).toBe(5.5)
  })
})
