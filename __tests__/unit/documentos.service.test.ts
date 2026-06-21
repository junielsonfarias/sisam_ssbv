/**
 * Testes unitários — documentos.service
 *
 * Cobre:
 *  - TIPO_DOC_LABEL: constante mapeada corretamente
 *  - emitirDocumento: geração de código + hash + INSERT + auditoria
 *  - validarDocumento: encontrado / não encontrado
 *  - cancelarDocumento: com e sem restrição por escolaId (IDOR)
 *  - listarDocumentosAluno
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
  TIPO_DOC_LABEL,
  emitirDocumento,
  validarDocumento,
  cancelarDocumento,
  listarDocumentosAluno,
} from '@/lib/services/documentos.service'
import { registrarAuditoria } from '@/lib/services/auditoria.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// TIPO_DOC_LABEL
// ============================================================================

describe('TIPO_DOC_LABEL', () => {
  it('mapeia todos os tipos para labels em portugues', () => {
    expect(TIPO_DOC_LABEL.historico_escolar).toBe('Histórico Escolar')
    expect(TIPO_DOC_LABEL.guia_transferencia).toBe('Guia de Transferência')
    expect(TIPO_DOC_LABEL.declaracao_matricula).toBe('Declaração de Matrícula')
    expect(TIPO_DOC_LABEL.declaracao_frequencia).toBe('Declaração de Frequência')
    expect(TIPO_DOC_LABEL.declaracao_conclusao).toBe('Declaração de Conclusão')
    expect(TIPO_DOC_LABEL.declaracao_transferencia).toBe('Declaração de Transferência')
    expect(TIPO_DOC_LABEL.boletim_escolar).toBe('Boletim Escolar')
    expect(TIPO_DOC_LABEL.certificado_eja).toBe('Certificado EJA')
  })

  it('tem exatamente 8 tipos mapeados', () => {
    expect(Object.keys(TIPO_DOC_LABEL)).toHaveLength(8)
  })
})

// ============================================================================
// emitirDocumento
// ============================================================================

describe('emitirDocumento', () => {
  it('gera codigo de validacao no formato XXXX-XXXX-XXXX e insere no banco', async () => {
    // SELECT para verificar unicidade do codigo (vazio = codigo disponivel)
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // codigo disponivel
      .mockResolvedValueOnce({ rows: [{ id: 'doc-1' }], rowCount: 1 } as any)  // INSERT

    const result = await emitirDocumento({
      tipo: 'declaracao_matricula',
      alunoId: 'aluno-1',
      dados: { tipo: 'declaracao_matricula', conteudo: 'texto' },
      emitidoPor: 'user-1',
      escolaNome: 'Escola A',
    })

    expect(result.id).toBe('doc-1')
    expect(result.codigo_validacao).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(result.hash_conteudo).toHaveLength(64)  // SHA-256 hex
    expect(registrarAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({ acao: 'EMITIR_DOCUMENTO', entidade: 'documentos_emitidos' })
    )
  })

  it('tenta novo codigo quando o primeiro ja existe (ate 5 tentativas)', async () => {
    // Primeiro codigo existente, segundo disponivel
    mockQuery
      .mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 } as any)  // colisao
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)           // disponivel
      .mockResolvedValueOnce({ rows: [{ id: 'doc-2' }], rowCount: 1 } as any)  // INSERT

    const result = await emitirDocumento({
      tipo: 'boletim_escolar',
      alunoId: 'aluno-2',
      dados: { a: 1 },
      emitidoPor: 'user-1',
    })

    expect(result.id).toBe('doc-2')
    // 2 SELECTs de verificacao + 1 INSERT
    expect(mockQuery).toHaveBeenCalledTimes(3)
  })

  it('insere com escolaId nulo quando nao fornecido', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'doc-3' }], rowCount: 1 } as any)

    await emitirDocumento({
      tipo: 'historico_escolar',
      alunoId: null,
      dados: { x: 'y' },
      emitidoPor: 'user-1',
    })

    const insertCall = mockQuery.mock.calls[1]
    const params = insertCall[1]!
    // escolaId (index 7) e escolaNome (index 8) sao null
    expect(params[7]).toBeNull()
    expect(params[8]).toBeNull()
  })
})

// ============================================================================
// validarDocumento
// ============================================================================

describe('validarDocumento', () => {
  it('retorna documento quando codigo valido e ativo', async () => {
    const fakeDoc = {
      id: 'doc-1',
      codigo_validacao: 'ABCD-EFGH-IJKL',
      tipo: 'declaracao_matricula',
      status: 'ativo',
    }
    mockQuery
      .mockResolvedValueOnce({ rows: [fakeDoc], rowCount: 1 } as any)  // SELECT principal
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)          // UPDATE contador (fire-and-forget)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)          // INSERT log validacao

    const result = await validarDocumento({ codigo: 'ABCD-EFGH-IJKL', ip: '1.2.3.4' })

    expect(result).not.toBeNull()
    expect(result!.tipo).toBe('declaracao_matricula')
  })

  it('retorna null quando codigo nao existe ou nao ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await validarDocumento({ codigo: 'XXXX-XXXX-XXXX' })

    expect(result).toBeNull()
  })
})

// ============================================================================
// cancelarDocumento
// ============================================================================

describe('cancelarDocumento', () => {
  it('cancela documento e retorna true quando encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'doc-1' }], rowCount: 1 } as any)

    const result = await cancelarDocumento({
      id: 'doc-1',
      canceladoPor: 'user-1',
      motivo: 'emissao incorreta',
    })

    expect(result).toBe(true)
    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain("status = 'cancelado'")
  })

  it('retorna false quando documento nao encontrado ou ja cancelado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await cancelarDocumento({
      id: 'doc-nao-existe',
      canceladoPor: 'user-1',
      motivo: 'teste',
    })

    expect(result).toBe(false)
  })

  it('restringe cancelamento por escolaId quando fornecido (previne IDOR)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'doc-1' }], rowCount: 1 } as any)

    await cancelarDocumento({
      id: 'doc-1',
      canceladoPor: 'user-1',
      motivo: 'teste',
      escolaId: 'esc-1',
    })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('escola_id = $')
    expect(params).toContain('esc-1')
  })

  it('nao adiciona condicao de escola quando escolaId nao fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await cancelarDocumento({
      id: 'doc-1',
      canceladoPor: 'user-1',
      motivo: 'teste',
    })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).not.toContain('escola_id')
  })
})

// ============================================================================
// listarDocumentosAluno
// ============================================================================

describe('listarDocumentosAluno', () => {
  it('retorna documentos do aluno em ordem decrescente de emissao', async () => {
    const fakeDocs = [
      { id: 'd1', tipo: 'boletim_escolar', status: 'ativo', emitido_em: '2026-06-01', vezes_validado: 2 },
      { id: 'd2', tipo: 'declaracao_matricula', status: 'ativo', emitido_em: '2026-05-01', vezes_validado: 0 },
    ]
    mockQuery.mockResolvedValueOnce({ rows: fakeDocs, rowCount: 2 } as any)

    const result = await listarDocumentosAluno('aluno-1')

    expect(result).toHaveLength(2)
    expect(result[0].tipo).toBe('boletim_escolar')
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE aluno_id = $1')
    expect(params[0]).toBe('aluno-1')
  })

  it('retorna lista vazia para aluno sem documentos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await listarDocumentosAluno('aluno-sem-docs')

    expect(result).toEqual([])
  })
})
