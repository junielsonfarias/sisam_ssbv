/**
 * Testes unitários — declaracoes.service
 *
 * Cobre:
 *  - gerarDeclaracaoMatricula: caminho feliz (com/sem CPF), aluno nao encontrado
 *  - gerarDeclaracaoFrequencia: com dados, sem dados de frequencia, aluno nao encontrado
 *  - gerarDeclaracaoConclusao: caminho feliz (com/sem CPF), aluno nao encontrado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/services/auditoria.service', () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
}))

import pool from '@/database/connection'
import {
  gerarDeclaracaoMatricula,
  gerarDeclaracaoFrequencia,
  gerarDeclaracaoConclusao,
} from '@/lib/services/declaracoes.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

// Dados base de aluno para reuso
const alunoBase = {
  id: 'aluno-1',
  nome: 'Ana Lima',
  cpf: '123.456.789-00',
  matricula: 'MAT-001',
  data_nascimento: '2015-03-10',
  serie: '5° Ano',
  escola_nome: 'Escola Municipal A',
  codigo_inep: '99999999',
}

// Mock de emitirDocumento (chamado por todos os geradores)
// emitirDocumento internamente faz 1 SELECT (verifica codigo) + 1 INSERT
const setupEmitirDocumentoMock = () => {
  mockQuery
    .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)   // SELECT codigo unico
    .mockResolvedValueOnce({ rows: [{ id: 'doc-novo' }], rowCount: 1 } as any)  // INSERT documento
}

// ============================================================================
// gerarDeclaracaoMatricula
// ============================================================================

describe('gerarDeclaracaoMatricula', () => {
  it('gera declaracao com CPF quando aluno tem CPF', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)  // coletarDadosBase
    setupEmitirDocumentoMock()

    const result = await gerarDeclaracaoMatricula({
      alunoId: 'aluno-1',
      anoLetivo: '2026',
      emitidoPor: 'user-1',
    })

    expect(result.id).toBe('doc-novo')
    expect(result.codigo_validacao).toBeTruthy()
    expect(result.hash_conteudo).toBeTruthy()
  })

  it('gera declaracao sem CPF quando aluno nao tem CPF', async () => {
    const alunoSemCPF = { ...alunoBase, cpf: null }
    mockQuery.mockResolvedValueOnce({ rows: [alunoSemCPF], rowCount: 1 } as any)
    setupEmitirDocumentoMock()

    const result = await gerarDeclaracaoMatricula({
      alunoId: 'aluno-1',
      anoLetivo: '2026',
      emitidoPor: 'user-1',
    })

    expect(result.id).toBe('doc-novo')
    // Verifica que o INSERT nao quebra sem CPF
    const insertCall = mockQuery.mock.calls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos')
    )
    expect(insertCall).toBeTruthy()
  })

  it('usa serie do aluno no conteudo da declaracao', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)
    setupEmitirDocumentoMock()

    await gerarDeclaracaoMatricula({
      alunoId: 'aluno-1',
      anoLetivo: '2026',
      emitidoPor: 'user-1',
    })

    // Verifica que o dados_snapshot contem o conteudo com a serie
    const insertParams = mockQuery.mock.calls
      .find((c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos'))
      ?.[1]
    expect(insertParams).toBeTruthy()
    const snapshot = JSON.parse(insertParams![4] as string)
    expect(snapshot.conteudo).toContain('5° Ano')
    expect(snapshot.conteudo).toContain('2026')
  })

  it('lanca erro quando aluno nao encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(
      gerarDeclaracaoMatricula({ alunoId: 'aluno-x', anoLetivo: '2026', emitidoPor: 'u' })
    ).rejects.toThrow('Aluno não encontrado')
  })
})

// ============================================================================
// gerarDeclaracaoFrequencia
// ============================================================================

describe('gerarDeclaracaoFrequencia', () => {
  it('gera declaracao com percentual de frequencia calculado', async () => {
    const freqData = { total: '200', presentes: '190' }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)     // coletarDadosBase
      .mockResolvedValueOnce({ rows: [freqData], rowCount: 1 } as any)      // frequencia_diaria
    setupEmitirDocumentoMock()

    const result = await gerarDeclaracaoFrequencia({
      alunoId: 'aluno-1',
      anoLetivo: '2026',
      emitidoPor: 'user-1',
    })

    expect(result.id).toBe('doc-novo')
    // Verifica snapshot contem percentual calculado
    const insertParams = mockQuery.mock.calls
      .find((c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos'))
      ?.[1]
    const snapshot = JSON.parse(insertParams![4] as string)
    // 190/200 = 95.0%
    expect(snapshot.metadados.frequencia_percentual).toBe(95)
    expect(snapshot.metadados.dias_letivos).toBe(200)
    expect(snapshot.metadados.presencas).toBe(190)
    expect(snapshot.conteudo).toContain('95.0%')
  })

  it('gera declaracao sem frequencia quando nao ha registros (total=0)', async () => {
    const freqVazia = { total: '0', presentes: '0' }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [freqVazia], rowCount: 1 } as any)
    setupEmitirDocumentoMock()

    await gerarDeclaracaoFrequencia({
      alunoId: 'aluno-1',
      anoLetivo: '2026',
      emitidoPor: 'user-1',
    })

    const insertParams = mockQuery.mock.calls
      .find((c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos'))
      ?.[1]
    const snapshot = JSON.parse(insertParams![4] as string)
    expect(snapshot.metadados.frequencia_percentual).toBeNull()
    expect(snapshot.conteudo).toContain('sem registros de frequência')
  })

  it('tolera falha na query de frequencia (try-catch interno)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)
      .mockRejectedValueOnce(new Error('tabela frequencia_diaria nao existe'))
    setupEmitirDocumentoMock()

    // Nao deve lançar erro — o service tem try-catch interno
    const result = await gerarDeclaracaoFrequencia({
      alunoId: 'aluno-1',
      anoLetivo: '2026',
      emitidoPor: 'user-1',
    })

    expect(result.id).toBe('doc-novo')
  })

  it('lanca erro quando aluno nao encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(
      gerarDeclaracaoFrequencia({ alunoId: 'x', anoLetivo: '2026', emitidoPor: 'u' })
    ).rejects.toThrow('Aluno não encontrado')
  })
})

// ============================================================================
// gerarDeclaracaoConclusao
// ============================================================================

describe('gerarDeclaracaoConclusao', () => {
  it('gera declaracao de conclusao com serie concluida e ano letivo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)
    setupEmitirDocumentoMock()

    const result = await gerarDeclaracaoConclusao({
      alunoId: 'aluno-1',
      anoLetivo: '2025',
      serieConcluida: '5° Ano',
      emitidoPor: 'user-1',
    })

    expect(result.id).toBe('doc-novo')
    const insertParams = mockQuery.mock.calls
      .find((c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos'))
      ?.[1]
    const snapshot = JSON.parse(insertParams![4] as string)
    expect(snapshot.conteudo).toContain('5° Ano')
    expect(snapshot.conteudo).toContain('2025')
    expect(snapshot.conteudo).toContain('concluiu')
    expect(snapshot.metadados.serie_concluida).toBe('5° Ano')
  })

  it('inclui CPF no texto quando aluno tem CPF', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [alunoBase], rowCount: 1 } as any)
    setupEmitirDocumentoMock()

    await gerarDeclaracaoConclusao({
      alunoId: 'aluno-1',
      anoLetivo: '2025',
      serieConcluida: '8° Ano',
      emitidoPor: 'user-1',
    })

    const insertParams = mockQuery.mock.calls
      .find((c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos'))
      ?.[1]
    const snapshot = JSON.parse(insertParams![4] as string)
    expect(snapshot.conteudo).toContain('CPF 123.456.789-00')
  })

  it('omite CPF no texto quando aluno nao tem CPF', async () => {
    const alunoSemCPF = { ...alunoBase, cpf: null }
    mockQuery.mockResolvedValueOnce({ rows: [alunoSemCPF], rowCount: 1 } as any)
    setupEmitirDocumentoMock()

    await gerarDeclaracaoConclusao({
      alunoId: 'aluno-1',
      anoLetivo: '2025',
      serieConcluida: '5° Ano',
      emitidoPor: 'user-1',
    })

    const insertParams = mockQuery.mock.calls
      .find((c) => typeof c[0] === 'string' && (c[0] as string).includes('INSERT INTO documentos_emitidos'))
      ?.[1]
    const snapshot = JSON.parse(insertParams![4] as string)
    expect(snapshot.conteudo).not.toContain('CPF')
  })

  it('lanca erro quando aluno nao encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(
      gerarDeclaracaoConclusao({ alunoId: 'x', anoLetivo: '2025', serieConcluida: '5', emitidoPor: 'u' })
    ).rejects.toThrow('Aluno não encontrado')
  })
})
