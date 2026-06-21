/**
 * Testes unitários — lib/services/censo-escolar.service.ts
 *
 * Cobre:
 *   exportarAlunosCsv — cabeçalho, dados, filtro por escola, AEE, bolsa família
 *   exportarTurmasCsv — cabeçalho, filtro por escola
 *   exportarDocentesCsv — sem professor_turmas (degrada graciosamente)
 *   csvEscape (interna) — via exportarAlunosCsv: null, vírgulas, aspas
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  exportarAlunosCsv,
  exportarDocentesCsv,
  exportarTurmasCsv,
} from '@/lib/services/censo-escolar.service'

const mockQuery = pool.query as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// Helpers para análise de CSV
// ============================================================================

function parseLinhas(csv: string) {
  return csv.split('\n')
}

function parseCabecalho(csv: string) {
  return parseLinhas(csv)[0]
}

// ============================================================================
// exportarAlunosCsv
// ============================================================================

describe('exportarAlunosCsv', () => {
  it('retorna apenas o cabeçalho quando não há alunos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })

    const linhas = parseLinhas(csv)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toContain('ALUNO_ID')
  })

  it('cabeçalho contém todas as colunas obrigatórias', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    const cab = parseCabecalho(csv)

    const colunasObrigatorias = [
      'ALUNO_ID', 'CODIGO_INEP_ESCOLA', 'ESCOLA', 'NOME_ALUNO',
      'NOME_MAE', 'DATA_NASCIMENTO', 'SEXO', 'NIS',
      'BOLSA_FAMILIA', 'MATRICULA', 'MODALIDADE', 'SERIE', 'TURMA',
      'AEE_DEFICIENCIAS', 'LAUDO_MEDICO',
    ]
    for (const col of colunasObrigatorias) {
      expect(cab, `Coluna "${col}" ausente`).toContain(col)
    }
  })

  it('gera uma linha por aluno', async () => {
    const rows = [
      { aluno_id: 'a1', escola_inep: 'IE001', escola_nome: 'Escola A', nome: 'Ana', nome_mae: 'Maria', nome_pai: null, data_nascimento: '2010-05-10', sexo: 'F', cpf: null, nis: '12345', beneficiario_bolsa_familia: true, naturalidade: 'Natal', matricula: 'M001', modalidade: 'regular', serie: 3, turma_codigo: '3A', tipos_deficiencia: null, laudo_medico: false },
      { aluno_id: 'a2', escola_inep: 'IE001', escola_nome: 'Escola A', nome: 'João', nome_mae: 'Paula', nome_pai: 'Carlos', data_nascimento: '2009-11-20', sexo: 'M', cpf: null, nis: null, beneficiario_bolsa_familia: false, naturalidade: null, matricula: 'M002', modalidade: 'regular', serie: 4, turma_codigo: '4B', tipos_deficiencia: ['fisica'], laudo_medico: true },
    ]
    mockQuery.mockResolvedValueOnce({ rows })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    const linhas = parseLinhas(csv)

    // cabeçalho + 2 alunos
    expect(linhas).toHaveLength(3)
  })

  it('converte beneficiario_bolsa_familia=true para "SIM"', async () => {
    const rows = [{ aluno_id: 'a1', escola_inep: null, escola_nome: null, nome: 'Ana', nome_mae: null, nome_pai: null, data_nascimento: null, sexo: null, cpf: null, nis: null, beneficiario_bolsa_familia: true, naturalidade: null, matricula: 'M1', modalidade: 'regular', serie: 1, turma_codigo: null, tipos_deficiencia: null, laudo_medico: false }]
    mockQuery.mockResolvedValueOnce({ rows })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    expect(csv).toContain('SIM')
  })

  it('converte beneficiario_bolsa_familia=false para "NAO"', async () => {
    const rows = [{ aluno_id: 'a1', escola_inep: null, escola_nome: null, nome: 'João', nome_mae: null, nome_pai: null, data_nascimento: null, sexo: null, cpf: null, nis: null, beneficiario_bolsa_familia: false, naturalidade: null, matricula: 'M2', modalidade: 'regular', serie: 1, turma_codigo: null, tipos_deficiencia: null, laudo_medico: false }]
    mockQuery.mockResolvedValueOnce({ rows })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    expect(csv).toContain('NAO')
  })

  it('junta tipos_deficiencia com ";" quando é array', async () => {
    const rows = [{ aluno_id: 'a1', escola_inep: null, escola_nome: null, nome: 'Bia', nome_mae: null, nome_pai: null, data_nascimento: null, sexo: null, cpf: null, nis: null, beneficiario_bolsa_familia: false, naturalidade: null, matricula: 'M3', modalidade: 'regular', serie: 2, turma_codigo: null, tipos_deficiencia: ['fisica', 'auditiva'], laudo_medico: true }]
    mockQuery.mockResolvedValueOnce({ rows })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    expect(csv).toContain('fisica;auditiva')
  })

  it('tipos_deficiencia null/vazio resulta em campo vazio', async () => {
    const rows = [{ aluno_id: 'a1', escola_inep: null, escola_nome: null, nome: 'Leo', nome_mae: null, nome_pai: null, data_nascimento: null, sexo: null, cpf: null, nis: null, beneficiario_bolsa_familia: false, naturalidade: null, matricula: 'M4', modalidade: 'regular', serie: 3, turma_codigo: null, tipos_deficiencia: null, laudo_medico: false }]
    mockQuery.mockResolvedValueOnce({ rows })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    // tipos_deficiencia null → coluna vazia (não "null")
    expect(csv).not.toContain('"null"')
  })

  it('adiciona filtro por escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await exportarAlunosCsv({ anoLetivo: '2026', escolaId: 'escola-xyz' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('escola-xyz')
    expect(sql).toContain('a.escola_id = $')
  })

  it('não adiciona filtro de escola quando escolaId é omitido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await exportarAlunosCsv({ anoLetivo: '2026' })

    const [, params] = mockQuery.mock.calls[0]
    // Apenas 1 parâmetro (anoLetivo)
    expect(params).toHaveLength(1)
  })
})

// ============================================================================
// csvEscape — via dados com caracteres especiais
// ============================================================================

describe('exportarAlunosCsv — csvEscape (caracteres especiais)', () => {
  function rowBase(overrides: Record<string, unknown> = {}) {
    return {
      aluno_id: 'a1', escola_inep: null, escola_nome: null,
      nome: 'Normal', nome_mae: null, nome_pai: null,
      data_nascimento: null, sexo: null, cpf: null, nis: null,
      beneficiario_bolsa_familia: false, naturalidade: null,
      matricula: 'M1', modalidade: 'regular', serie: 1,
      turma_codigo: null, tipos_deficiencia: null, laudo_medico: false,
      ...overrides,
    }
  }

  it('envolve em aspas campos que contêm vírgula', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [rowBase({ escola_nome: 'Escola, Sul' })] })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    expect(csv).toContain('"Escola, Sul"')
  })

  it('duplica aspas duplas dentro do valor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [rowBase({ nome: 'Jo"o' })] })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    expect(csv).toContain('"Jo""o"')
  })

  it('converte null/undefined para campo vazio (string vazia)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [rowBase({ nome_mae: null })] })

    const csv = await exportarAlunosCsv({ anoLetivo: '2026' })
    // Não deve conter "null" literal
    expect(csv).not.toContain(',null,')
    expect(csv).not.toContain(',undefined,')
  })
})

// ============================================================================
// exportarTurmasCsv
// ============================================================================

describe('exportarTurmasCsv', () => {
  it('retorna cabeçalho com colunas de turma', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const csv = await exportarTurmasCsv({ anoLetivo: '2026' })

    const colunasObrigatorias = ['TURMA_ID', 'CODIGO_INEP_ESCOLA', 'ESCOLA', 'CODIGO_TURMA', 'SERIE', 'MODALIDADE', 'QTD_ALUNOS']
    for (const col of colunasObrigatorias) {
      expect(csv, `Coluna "${col}" ausente`).toContain(col)
    }
  })

  it('gera uma linha por turma', async () => {
    const rows = [
      { turma_id: 't1', escola_inep: 'IE001', escola_nome: 'E1', codigo: '3A', nome: '3º Ano A', serie: 3, modalidade: 'regular', grupo_etario_id: null, qtd_alunos: 30 },
      { turma_id: 't2', escola_inep: 'IE001', escola_nome: 'E1', codigo: '4B', nome: '4º Ano B', serie: 4, modalidade: 'regular', grupo_etario_id: null, qtd_alunos: 25 },
    ]
    mockQuery.mockResolvedValueOnce({ rows })

    const csv = await exportarTurmasCsv({ anoLetivo: '2026' })
    const linhas = parseLinhas(csv)

    expect(linhas).toHaveLength(3) // cabeçalho + 2 turmas
  })

  it('adiciona filtro por escolaId quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await exportarTurmasCsv({ anoLetivo: '2026', escolaId: 'escola-abc' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('escola-abc')
    expect(sql).toContain('t.escola_id = $')
  })

  it('filtra turmas pelo ano letivo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })

    await exportarTurmasCsv({ anoLetivo: '2025' })

    const [, params] = mockQuery.mock.calls[0]
    expect(params[0]).toBe('2025')
  })
})

// ============================================================================
// exportarDocentesCsv
// ============================================================================

describe('exportarDocentesCsv', () => {
  it('degrada graciosamente quando não há tabela professor_turmas', async () => {
    // 1ª query: verificação de existência da tabela → false
    mockQuery.mockResolvedValueOnce({ rows: [{ existe: false }] })
    // 2ª query: lista de professores simples
    mockQuery.mockResolvedValueOnce({ rows: [] })

    const csv = await exportarDocentesCsv({ anoLetivo: '2026' })

    expect(csv).toContain('PROFESSOR_ID')
    expect(csv).toContain('NOME_DOCENTE')
  })

  it('cabeçalho inclui colunas de turmas e disciplinas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ existe: false }] })
      .mockResolvedValueOnce({ rows: [] })

    const csv = await exportarDocentesCsv({ anoLetivo: '2026' })
    expect(csv).toContain('TURMAS')
    expect(csv).toContain('DISCIPLINAS')
  })

  it('retorna apenas o cabeçalho quando não há professores', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ existe: false }] })
      .mockResolvedValueOnce({ rows: [] })

    const csv = await exportarDocentesCsv({ anoLetivo: '2026' })
    const linhas = parseLinhas(csv)
    expect(linhas).toHaveLength(1)
  })

  it('gera linhas de dados quando há professores', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ existe: false }] })
      .mockResolvedValueOnce({
        rows: [
          { professor_id: 'p1', escola_inep: 'IE001', escola_nome: 'E1', nome: 'Dra. Silva', cpf: '12345678900', email: 'silva@escola.br', turmas: null, disciplinas: null },
        ],
      })

    const csv = await exportarDocentesCsv({ anoLetivo: '2026' })
    const linhas = parseLinhas(csv)
    expect(linhas).toHaveLength(2) // cabeçalho + 1 professor
    expect(linhas[1]).toContain('Dra. Silva')
  })

  it('adiciona filtro por escolaId quando fornecido', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ existe: false }] })
      .mockResolvedValueOnce({ rows: [] })

    await exportarDocentesCsv({ anoLetivo: '2026', escolaId: 'escola-zzz' })

    const [sql, params] = mockQuery.mock.calls[1] // 2ª query
    expect(params).toContain('escola-zzz')
    expect(sql).toContain('u.escola_id = $')
  })
})
