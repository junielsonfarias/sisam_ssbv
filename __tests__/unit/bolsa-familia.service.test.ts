/**
 * Testes unitários/integração — lib/services/bolsa-familia.service.ts
 *
 * Cobre:
 *   PERIODO_DATAS / PERIODO_LABEL — integridade das constantes
 *   exportarCsvSistemaPresenca — geração do CSV sem banco real
 *   gerarMapaPeriodo — caminho feliz e total com alerta
 *   listarMapas — filtros (período, apenas_alertas, escola_id)
 *   registrarJustificativa — atualização de motivo
 *
 * Mock de @/database/connection: apenas pool.query (sem banco real).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PERIODO_DATAS,
  PERIODO_LABEL,
  type PeriodoBF,
} from '@/lib/services/bolsa-familia.service'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

// Importa depois do mock
import pool from '@/database/connection'
import {
  gerarMapaPeriodo,
  listarMapas,
  exportarCsvSistemaPresenca,
  registrarJustificativa,
} from '@/lib/services/bolsa-familia.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Constantes — integridade
// ============================================================================

describe('PERIODO_DATAS', () => {
  const PERIODOS: PeriodoBF[] = ['fev_abr', 'mai_jun', 'ago_set', 'out_nov', 'dez']

  it('tem datas para cada período', () => {
    for (const p of PERIODOS) {
      expect(PERIODO_DATAS[p]).toBeDefined()
      expect(PERIODO_DATAS[p].inicio).toBeTruthy()
      expect(PERIODO_DATAS[p].fim).toBeTruthy()
    }
  })

  it('formato das datas é MM-DD', () => {
    for (const p of PERIODOS) {
      expect(PERIODO_DATAS[p].inicio).toMatch(/^\d{2}-\d{2}$/)
      expect(PERIODO_DATAS[p].fim).toMatch(/^\d{2}-\d{2}$/)
    }
  })

  it('datas de fev_abr cobrem fevereiro até abril', () => {
    expect(PERIODO_DATAS['fev_abr'].inicio).toBe('02-01')
    expect(PERIODO_DATAS['fev_abr'].fim).toBe('04-30')
  })

  it('período dez cobre somente dezembro', () => {
    expect(PERIODO_DATAS['dez'].inicio).toBe('12-01')
    expect(PERIODO_DATAS['dez'].fim).toBe('12-31')
  })
})

describe('PERIODO_LABEL', () => {
  const PERIODOS: PeriodoBF[] = ['fev_abr', 'mai_jun', 'ago_set', 'out_nov', 'dez']

  it('tem rótulos não-vazios para cada período', () => {
    for (const p of PERIODOS) {
      expect(PERIODO_LABEL[p]).toBeTruthy()
      expect(typeof PERIODO_LABEL[p]).toBe('string')
    }
  })
})

// ============================================================================
// gerarMapaPeriodo
// ============================================================================

describe('gerarMapaPeriodo', () => {
  it('chama pool.query com as datas corretas do período', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    await gerarMapaPeriodo({
      ano_letivo: '2026',
      periodo: 'fev_abr',
      registrado_por: 'usuario-123',
    })

    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockQuery.mock.calls[0]
    // Verifica que o parâmetro de data de início está correto
    expect(params[0]).toBe('2026-02-01')
    expect(params[1]).toBe('2026-04-30')
    expect(params[2]).toBe('2026')
    expect(params[3]).toBe('fev_abr')
    expect(params[4]).toBe('usuario-123')
    expect(typeof sql).toBe('string')
  })

  it('retorna gerados=0 e com_alerta=0 quando nenhum aluno beneficiário', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

    const result = await gerarMapaPeriodo({
      ano_letivo: '2026',
      periodo: 'mai_jun',
      registrado_por: 'admin',
    })

    expect(result.gerados).toBe(0)
    expect(result.com_alerta).toBe(0)
  })

  it('contabiliza corretamente alunos que não cumprem condicionalidade (com_alerta)', async () => {
    // rowCount=3 alunos; 2 não cumprem (cumpre_condicionalidade=false)
    mockQuery.mockResolvedValueOnce({
      rowCount: 3,
      rows: [
        { cumpre_condicionalidade: true },
        { cumpre_condicionalidade: false },
        { cumpre_condicionalidade: false },
      ],
    })

    const result = await gerarMapaPeriodo({
      ano_letivo: '2026',
      periodo: 'ago_set',
      registrado_por: 'admin',
    })

    expect(result.gerados).toBe(3)
    expect(result.com_alerta).toBe(2)
  })

  it('com_alerta não conta cumpre_condicionalidade=null (sem faixa etária)', async () => {
    mockQuery.mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { cumpre_condicionalidade: null },
        { cumpre_condicionalidade: false },
      ],
    })

    const result = await gerarMapaPeriodo({
      ano_letivo: '2026',
      periodo: 'out_nov',
      registrado_por: 'admin',
    })

    expect(result.gerados).toBe(2)
    expect(result.com_alerta).toBe(1) // null não é false
  })
})

// ============================================================================
// listarMapas
// ============================================================================

describe('listarMapas', () => {
  it('filtra por ano letivo (sempre obrigatório)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMapas({ ano_letivo: '2026' })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('2026')
  })

  it('adiciona filtro de período quando informado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMapas({ ano_letivo: '2026', periodo: 'fev_abr' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('fev_abr')
    expect(sql).toContain('m.periodo')
  })

  it('adiciona filtro apenas_alertas quando verdadeiro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMapas({ ano_letivo: '2026', apenas_alertas: true })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('cumpre_condicionalidade = FALSE')
  })

  it('não adiciona filtro apenas_alertas quando falso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMapas({ ano_letivo: '2026', apenas_alertas: false })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('cumpre_condicionalidade = FALSE')
  })

  it('adiciona filtro por escola_id quando informado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await listarMapas({ ano_letivo: '2026', escola_id: 'escola-abc' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('escola-abc')
    expect(sql).toContain('a.escola_id')
  })

  it('retorna os rows do banco diretamente', async () => {
    const registrosMock = [
      { aluno_nome: 'Ana Silva', frequencia_percentual: '62.5' },
      { aluno_nome: 'João Pereira', frequencia_percentual: '80.0' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: registrosMock })

    const result = await listarMapas({ ano_letivo: '2026' })

    expect(result).toHaveLength(2)
    expect(result[0].aluno_nome).toBe('Ana Silva')
  })
})

// ============================================================================
// exportarCsvSistemaPresenca
// ============================================================================

describe('exportarCsvSistemaPresenca', () => {
  it('retorna CSV com cabeçalho esperado', async () => {
    // listarMapas é chamado internamente com pool.query
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const csv = await exportarCsvSistemaPresenca({ ano_letivo: '2026', periodo: 'fev_abr' })

    expect(csv).toContain('NIS')
    expect(csv).toContain('NOME_ALUNO')
    expect(csv).toContain('FREQUENCIA_PCT')
    expect(csv).toContain('CUMPRE_CONDICIONALIDADE')
  })

  it('gera BOM UTF-8 no início para compatibilidade Excel', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const csv = await exportarCsvSistemaPresenca({ ano_letivo: '2026', periodo: 'mai_jun' })

    // BOM UTF-8: ﻿ ou '﻿' (﻿ = FEFF)
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
  })

  it('inclui linha de dados por aluno', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        aluno_nome: 'Maria Santos',
        nis: '12345',
        codigo_familiar: 'FAM001',
        data_nascimento: '2010-03-15',
        faixa_etaria: '6_17_anos',
        total_dias_letivos: 40,
        total_presencas: 35,
        total_faltas: 5,
        frequencia_percentual: '87.50',
        cumpre_condicionalidade: true,
        motivo_baixa_frequencia: null,
      }],
    })

    const csv = await exportarCsvSistemaPresenca({ ano_letivo: '2026', periodo: 'fev_abr' })
    const linhas = csv.trim().split('\n')

    // cabeçalho + 1 linha de dados
    expect(linhas.length).toBe(2)
    expect(linhas[1]).toContain('12345')
    expect(linhas[1]).toContain('SIM') // cumpre_condicionalidade = true → SIM
  })

  it('escreve NAO quando aluno não cumpre condicionalidade', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        aluno_nome: 'Carlos Dias',
        nis: '99999',
        codigo_familiar: null,
        data_nascimento: '2012-07-20',
        faixa_etaria: '6_17_anos',
        total_dias_letivos: 40,
        total_presencas: 20,
        total_faltas: 20,
        frequencia_percentual: '50.00',
        cumpre_condicionalidade: false,
        motivo_baixa_frequencia: null,
      }],
    })

    const csv = await exportarCsvSistemaPresenca({ ano_letivo: '2026', periodo: 'fev_abr' })
    expect(csv).toContain('NAO')
  })

  it('escreve campo vazio quando condicionalidade é null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        aluno_nome: 'Bebê Teste',
        nis: '00001',
        codigo_familiar: null,
        data_nascimento: '2024-01-01',
        faixa_etaria: 'menor_4',
        total_dias_letivos: 40,
        total_presencas: 30,
        total_faltas: 10,
        frequencia_percentual: '75.00',
        cumpre_condicionalidade: null,
        motivo_baixa_frequencia: null,
      }],
    })

    const csv = await exportarCsvSistemaPresenca({ ano_letivo: '2026', periodo: 'fev_abr' })
    // null → campo vazio (,,) — não deve conter SIM nem NAO
    expect(csv).not.toContain(',SIM,')
    expect(csv).not.toContain(',NAO,')
  })

  it('escapa aspas duplas no nome do aluno (proteção CSV injection)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        aluno_nome: 'Jo"o',
        nis: '11111',
        codigo_familiar: null,
        data_nascimento: null,
        faixa_etaria: '6_17_anos',
        total_dias_letivos: 10,
        total_presencas: 8,
        total_faltas: 2,
        frequencia_percentual: '80.00',
        cumpre_condicionalidade: true,
        motivo_baixa_frequencia: null,
      }],
    })

    const csv = await exportarCsvSistemaPresenca({ ano_letivo: '2026', periodo: 'fev_abr' })
    // aspas duplas devem ser duplicadas no CSV: " → ""
    expect(csv).toContain('"Jo""o"')
  })
})

// ============================================================================
// registrarJustificativa
// ============================================================================

describe('registrarJustificativa', () => {
  it('retorna true quando o registro é atualizado (rowCount > 0)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    const ok = await registrarJustificativa({
      mapa_id: 'mapa-123',
      motivo: 'Doença comprovada por atestado médico',
    })

    expect(ok).toBe(true)
  })

  it('retorna false quando o mapa_id não existe (rowCount = 0)', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 0 })

    const ok = await registrarJustificativa({
      mapa_id: 'inexistente',
      motivo: 'qualquer motivo',
    })

    expect(ok).toBe(false)
  })

  it('passa mapa_id e motivo como parâmetros da query', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 })

    await registrarJustificativa({ mapa_id: 'mapa-xyz', motivo: 'Viagem família' })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('mapa-xyz')
    expect(params[1]).toBe('Viagem família')
  })
})
