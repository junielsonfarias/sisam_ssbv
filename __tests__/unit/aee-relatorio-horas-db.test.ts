/**
 * Testes unitários/integração — lib/services/aee-relatorio-horas.ts
 *
 * Complementa __tests__/unit/aee-relatorio-horas.test.ts que já cobre
 * calcularMetricasHoras (função pura).
 *
 * Este arquivo cobre gerarRelatorioHorasAee (com mock de pool.query):
 *   - caminho feliz: lista planos com métricas calculadas corretamente
 *   - filtros: escolaId, turmaId, inicio/fim do período
 *   - totais agregados: total_planos, total_sessoes, horas, cobertura_media
 *   - plano sem sessões: horas_realizadas=0, taxa_presenca=null
 *   - cobertura_media=null quando sem horas previstas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import { gerarRelatorioHorasAee } from '@/lib/services/aee-relatorio-horas'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// Helper para criar uma linha de banco simulando o resultado da query SQL
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    plano_id: 'plano-001',
    aluno_id: 'aluno-001',
    aluno_nome: 'Ana Lima',
    serie: '3',
    turma_codigo: '3A',
    escola_id: 'escola-001',
    escola_nome: 'Escola Municipal Centro',
    professor_aee_nome: 'Prof. Marta',
    status: 'ativo',
    periodicidade_horas_semanais: 2,
    data_inicio: '2026-02-01',
    data_fim: null,
    total_sessoes: '10',
    sessoes_presente: '8',
    sessoes_ausente: '2',
    minutos_realizados: '400',  // 400 min = 6.7h
    primeira_sessao: '2026-02-10',
    ultima_sessao: '2026-06-10',
    ...overrides,
  }
}

// ============================================================================
// gerarRelatorioHorasAee — filtros
// ============================================================================

describe('gerarRelatorioHorasAee — filtros de query', () => {
  it('sempre filtra por ano_letivo como parâmetro obrigatório', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('2026')
    expect(sql).toContain('p.ano_letivo = $1')
  })

  it('adiciona filtro de escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await gerarRelatorioHorasAee({ anoLetivo: '2026', escolaId: 'escola-abc' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('escola-abc')
    expect(sql).toContain('a.escola_id = $')
  })

  it('adiciona filtro de turmaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await gerarRelatorioHorasAee({ anoLetivo: '2026', turmaId: 'turma-xyz' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('turma-xyz')
    expect(sql).toContain('a.turma_id = $')
  })

  it('adiciona filtro de início de período nos atendimentos (JOIN)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await gerarRelatorioHorasAee({ anoLetivo: '2026', inicio: '2026-03-01' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('2026-03-01')
    expect(sql).toContain('at.data_atendimento >= $')
  })

  it('adiciona filtro de fim de período nos atendimentos (JOIN)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await gerarRelatorioHorasAee({ anoLetivo: '2026', fim: '2026-06-30' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('2026-06-30')
    expect(sql).toContain('at.data_atendimento <= $')
  })
})

// ============================================================================
// gerarRelatorioHorasAee — cálculo das métricas
// ============================================================================

describe('gerarRelatorioHorasAee — métricas calculadas', () => {
  it('converte minutos_realizados em horas_realizadas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ minutos_realizados: '300' })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].horas_realizadas).toBe(5) // 300/60 = 5h
  })

  it('calcula taxa_presenca como sessoes_presente/total_sessoes (%)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({
      total_sessoes: '10',
      sessoes_presente: '8',
    })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].taxa_presenca).toBe(80) // 8/10 = 80%
  })

  it('taxa_presenca é null quando não há sessões (sem divisão por zero)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({
      total_sessoes: '0',
      sessoes_presente: '0',
      minutos_realizados: '0',
    })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].taxa_presenca).toBeNull()
    expect(linhas[0].horas_realizadas).toBe(0)
  })

  it('horas_previstas é null quando periodicidade_horas_semanais é null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({ periodicidade_horas_semanais: null })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].horas_previstas).toBeNull()
    expect(linhas[0].percentual_cobertura).toBeNull()
  })

  it('inclui primeira_sessao e ultima_sessao formatados como YYYY-MM-DD', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({
      primeira_sessao: '2026-03-05T10:00:00.000Z',
      ultima_sessao: '2026-05-20T14:30:00.000Z',
    })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].primeira_sessao).toBe('2026-03-05')
    expect(linhas[0].ultima_sessao).toBe('2026-05-20')
  })

  it('primeira_sessao e ultima_sessao são null quando sem atendimentos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({
      total_sessoes: '0',
      primeira_sessao: null,
      ultima_sessao: null,
      minutos_realizados: '0',
    })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].primeira_sessao).toBeNull()
    expect(linhas[0].ultima_sessao).toBeNull()
  })
})

// ============================================================================
// gerarRelatorioHorasAee — estrutura das linhas
// ============================================================================

describe('gerarRelatorioHorasAee — estrutura das linhas', () => {
  it('cada linha contém todos os campos da interface LinhaRelatorioHoras', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow()] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    const camposObrigatorios = [
      'plano_id', 'aluno_id', 'aluno_nome', 'serie', 'turma_codigo',
      'escola_id', 'escola_nome', 'professor_aee_nome', 'status',
      'periodicidade_horas_semanais', 'data_inicio', 'data_fim',
      'total_sessoes', 'sessoes_presente', 'sessoes_ausente',
      'primeira_sessao', 'ultima_sessao',
      'horas_realizadas', 'horas_previstas', 'percentual_cobertura',
      'semanas_periodo', 'taxa_presenca',
    ]
    for (const campo of camposObrigatorios) {
      expect(linhas[0], `Campo "${campo}" ausente`).toHaveProperty(campo)
    }
  })

  it('campos null do banco são preservados como null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow({
      escola_id: null,
      escola_nome: null,
      professor_aee_nome: null,
      serie: null,
      turma_codigo: null,
      data_fim: null,
    })] })

    const { linhas } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas[0].escola_id).toBeNull()
    expect(linhas[0].escola_nome).toBeNull()
    expect(linhas[0].professor_aee_nome).toBeNull()
    expect(linhas[0].serie).toBeNull()
    expect(linhas[0].data_fim).toBeNull()
  })
})

// ============================================================================
// gerarRelatorioHorasAee — totais agregados
// ============================================================================

describe('gerarRelatorioHorasAee — totais', () => {
  it('total_planos é igual ao número de linhas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [makeRow(), makeRow({ plano_id: 'p2', aluno_id: 'a2', aluno_nome: 'João' })] })

    const { totais } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(totais.total_planos).toBe(2)
  })

  it('total_sessoes soma todas as sessões das linhas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      makeRow({ total_sessoes: '10' }),
      makeRow({ plano_id: 'p2', aluno_id: 'a2', aluno_nome: 'X', total_sessoes: '5' }),
    ] })

    const { totais } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(totais.total_sessoes).toBe(15)
  })

  it('total_horas_realizadas soma horas de todas as linhas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      makeRow({ minutos_realizados: '120' }),  // 2h
      makeRow({ plano_id: 'p2', aluno_id: 'a2', aluno_nome: 'X', minutos_realizados: '180' }),  // 3h
    ] })

    const { totais } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(totais.total_horas_realizadas).toBe(5)
  })

  it('cobertura_media é null quando não há horas previstas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [
      makeRow({ periodicidade_horas_semanais: null }),
    ] })

    const { totais } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(totais.cobertura_media).toBeNull()
  })

  it('retorna linhas e totais vazios quando não há planos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const { linhas, totais } = await gerarRelatorioHorasAee({ anoLetivo: '2026' })

    expect(linhas).toHaveLength(0)
    expect(totais.total_planos).toBe(0)
    expect(totais.total_sessoes).toBe(0)
    expect(totais.total_horas_realizadas).toBe(0)
    expect(totais.cobertura_media).toBeNull()
  })
})
