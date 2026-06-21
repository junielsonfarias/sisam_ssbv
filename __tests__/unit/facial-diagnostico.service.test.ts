/**
 * Testes unitários — facial/diagnostico.ts
 *
 * Cobre:
 *  - diagnosticarAluno por ID: encontrado, nao encontrado
 *  - diagnosticarAluno por nome: busca ILIKE
 *  - Embedding: valido (512 bytes), invalido (tamanho errado), NaN/todos-zero/infinito, sem embedding
 *  - Consentimento: aprovado, nao aprovado, revogado, sem consentimento
 *  - status.pronto_para_terminal: todos os cenarios
 *  - status.problemas: lista correta para cada falha
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import { diagnosticarAluno } from '@/lib/services/facial/diagnostico'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => vi.clearAllMocks())

// Helper para criar Float32Array serializada em base64
function criarEmbeddingBase64(floats: Float32Array): string {
  return Buffer.from(floats.buffer).toString('base64')
}

function criarEmbeddingValido(qtdFloats = 128): string {
  const floats = new Float32Array(qtdFloats)
  floats[0] = 0.5  // valor valido (nao zero, nao NaN, nao infinito)
  floats[1] = -0.3
  return criarEmbeddingBase64(floats)
}

const alunoAtivo = {
  id: 'aluno-1',
  nome: 'João Silva',
  codigo: 'ALU-001',
  serie: '5',
  turma_id: 'turma-1',
  escola_id: 'esc-1',
  ano_letivo: '2026',
  ativo: true,
  situacao: 'cursando',
}

// ============================================================================
// Busca por ID e por nome
// ============================================================================

describe('diagnosticarAluno — busca', () => {
  it('busca por ID usa SELECT por id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)  // alunos
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)              // consentimentos
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)              // embeddings

    await diagnosticarAluno({ alunoId: 'aluno-1' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('WHERE id = $1')
    expect(params[0]).toBe('aluno-1')
  })

  it('busca por nome usa ILIKE com LIMIT 5', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await diagnosticarAluno({ alunoNome: 'Silva' })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('ILIKE $1')
    expect(sql).toContain('LIMIT 5')
    expect(params[0]).toBe('%Silva%')
  })

  it('retorna array vazio quando aluno nao encontrado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await diagnosticarAluno({ alunoId: 'nao-existe' })

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// Consentimento
// ============================================================================

describe('diagnosticarAluno — consentimento', () => {
  it('pronto_para_terminal=false e "Sem consentimento LGPD" quando sem consentimento', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // sem consentimento
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // sem embedding

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.consentimento).toBeNull()
    expect(diag.status.pronto_para_terminal).toBe(false)
    expect(diag.status.problemas).toContain('Sem consentimento LGPD')
    expect(diag.status.problemas).toContain('Sem embedding facial')
  })

  it('inclui "Consentimento não aprovado" quando consentido=false', async () => {
    const consentNaoAprovado = { consentido: false, responsavel_nome: 'Mae', data_consentimento: null, data_revogacao: null, aluno_id: 'aluno-1' }
    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentNaoAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.status.problemas).toContain('Consentimento não aprovado')
    expect(diag.status.pronto_para_terminal).toBe(false)
  })

  it('inclui "Consentimento revogado" quando data_revogacao preenchida', async () => {
    const consentRevogado = { consentido: false, responsavel_nome: 'Mae', data_consentimento: '2026-01-01', data_revogacao: '2026-03-15', aluno_id: 'aluno-1' }
    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentRevogado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.status.problemas).toContain('Consentimento revogado')
  })
})

// ============================================================================
// Embedding
// ============================================================================

describe('diagnosticarAluno — embedding', () => {
  const consentAprovado = {
    aluno_id: 'aluno-1',
    consentido: true,
    responsavel_nome: 'Mae',
    data_consentimento: '2026-01-01',
    data_revogacao: null,
  }

  it('embedding valido (512 bytes = 128 floats) marca pronto_para_terminal=true', async () => {
    const embedBase64 = criarEmbeddingValido(128)
    const fakeEmbed = {
      aluno_id: 'aluno-1',
      tamanho_bytes: '512',
      qualidade: 0.95,
      versao_modelo: 'v1',
      criado_em: '2026-01-01',
      atualizado_em: '2026-01-01',
      embedding_base64: embedBase64,
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakeEmbed], rowCount: 1 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.embedding.existe).toBe(true)
    expect(diag.embedding.valido).toBe(true)
    expect(diag.status.pronto_para_terminal).toBe(true)
    expect(diag.status.problemas).toHaveLength(0)
  })

  it('embedding valido com 1536 bytes (3 poses = 384 floats)', async () => {
    const embedBase64 = criarEmbeddingValido(384)
    const fakeEmbed = {
      aluno_id: 'aluno-1',
      tamanho_bytes: '1536',
      qualidade: 0.90,
      versao_modelo: 'v2',
      criado_em: '2026-01-01',
      atualizado_em: '2026-01-01',
      embedding_base64: embedBase64,
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakeEmbed], rowCount: 1 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.embedding.valido).toBe(true)
    expect(diag.status.pronto_para_terminal).toBe(true)
  })

  it('embedding invalido por tamanho errado gera problema especifico', async () => {
    const fakeEmbed = {
      aluno_id: 'aluno-1',
      tamanho_bytes: '256',  // tamanho errado (nem 512 nem 1536)
      qualidade: 0.5,
      versao_modelo: 'v1',
      criado_em: '2026-01-01',
      atualizado_em: '2026-01-01',
      embedding_base64: null,
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakeEmbed], rowCount: 1 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.embedding.valido).toBe(false)
    expect(diag.status.problemas.some((p: string) => p.includes('Embedding tamanho errado: 256'))).toBe(true)
  })

  it('embedding invalido quando todos os floats sao zero', async () => {
    // Float32Array zerado (todos zeros)
    const floatsZero = new Float32Array(128)  // todos zero por padrao
    const embedBase64 = criarEmbeddingBase64(floatsZero)
    const fakeEmbed = {
      aluno_id: 'aluno-1',
      tamanho_bytes: '512',
      qualidade: 0.1,
      versao_modelo: 'v1',
      criado_em: '2026-01-01',
      atualizado_em: '2026-01-01',
      embedding_base64: embedBase64,
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakeEmbed], rowCount: 1 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.embedding.valido).toBe(false)
    expect(diag.status.problemas).toContain('Embedding contém valores inválidos (NaN/zero/infinito)')
  })

  it('pronto_para_terminal=false quando aluno inativo', async () => {
    const alunoInativo = { ...alunoAtivo, ativo: false }
    const embedBase64 = criarEmbeddingValido(128)
    const fakeEmbed = {
      aluno_id: 'aluno-1',
      tamanho_bytes: '512',
      qualidade: 0.95,
      versao_modelo: 'v1',
      criado_em: '2026-01-01',
      atualizado_em: '2026-01-01',
      embedding_base64: embedBase64,
    }

    mockQuery
      .mockResolvedValueOnce({ rows: [alunoInativo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [fakeEmbed], rowCount: 1 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.status.pronto_para_terminal).toBe(false)
    expect(diag.status.problemas).toContain('Aluno inativo')
  })

  it('retorna { existe: false } quando nao ha embedding', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [alunoAtivo], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [consentAprovado], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const [diag] = await diagnosticarAluno({ alunoId: 'aluno-1' })

    expect(diag.embedding).toEqual({ existe: false })
    expect(diag.status.problemas).toContain('Sem embedding facial')
  })
})
