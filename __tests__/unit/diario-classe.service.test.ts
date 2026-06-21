/**
 * Testes unitários — diario-classe.service
 *
 * Cobre:
 *  - criarRegistroDiario: caminho feliz, com habilidades BNCC, erro com rollback
 *  - atualizarRegistroDiario: campos parciais, sem campos (noop), publicado_em
 *  - buscarRegistroPorId: encontrado com habilidades, nao encontrado
 *  - listarRegistros: sem filtros, com todos os filtros, limite max
 *  - deletarRegistro: sucesso (rascunho + autor correto), nao encontrado
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/services/bncc.service', () => ({
  vincularHabilidades: vi.fn().mockResolvedValue(undefined),
  listarHabilidadesVinculadas: vi.fn().mockResolvedValue([]),
}))

import pool from '@/database/connection'
import {
  criarRegistroDiario,
  atualizarRegistroDiario,
  buscarRegistroPorId,
  listarRegistros,
  deletarRegistro,
} from '@/lib/services/diario-classe.service'

const mockQuery = vi.mocked(pool.query)
const mockConnect = vi.mocked(pool.connect)

// Cria um client fake com sequencia de respostas
function criarClientFake(respostas: any[]) {
  let idx = 0
  const client = {
    query: vi.fn().mockImplementation(() => {
      const resp = respostas[idx] ?? { rows: [], rowCount: 0 }
      idx++
      return Promise.resolve(resp)
    }),
    release: vi.fn(),
  }
  mockConnect.mockResolvedValueOnce(client as any)
  return client
}

beforeEach(() => vi.clearAllMocks())

// ============================================================================
// criarRegistroDiario
// ============================================================================

describe('criarRegistroDiario', () => {
  it('cria registro com campos obrigatorios e retorna id', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },   // BEGIN
      { rows: [{ id: 'diario-1' }], rowCount: 1 },  // INSERT
      { rows: [], rowCount: 0 },   // COMMIT
    ])

    const id = await criarRegistroDiario({
      professor_id: 'prof-1',
      turma_id: 'turma-1',
      data_aula: '2026-06-15',
      conteudo: 'Introducao ao tema',
    })

    expect(id).toBe('diario-1')
  })

  it('cria com status rascunho por padrao quando nao informado', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ id: 'diario-2' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    await criarRegistroDiario({
      professor_id: 'prof-1',
      turma_id: 'turma-1',
      data_aula: '2026-06-15',
      conteudo: 'Conteudo',
    })

    const insertCall = client.query.mock.calls.find(
      (c: any[]) => typeof c[0] === 'string' && c[0].includes('INSERT INTO diario_classe')
    )
    // O 12o parametro e o status (index 11)
    expect(insertCall![1][11]).toBe('rascunho')
  })

  it('vincula habilidades BNCC fora da transacao quando fornecidas', async () => {
    criarClientFake([
      { rows: [], rowCount: 0 },
      { rows: [{ id: 'diario-3' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
    ])

    // Mock adicional para INSERT na tabela de habilidades do diario
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // vincularHabilidades (bncc.service)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)  // INSERT diario_classe_bncc_habilidades

    const id = await criarRegistroDiario({
      professor_id: 'prof-1',
      turma_id: 'turma-1',
      data_aula: '2026-06-15',
      conteudo: 'Conteudo com BNCC',
      habilidades_bncc: ['EF05MA01', 'EF05MA02'],
    })

    expect(id).toBe('diario-3')
    // Verifica insercao das habilidades
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO diario_classe_bncc_habilidades'),
      expect.arrayContaining(['diario-3', 'EF05MA01'])
    )
  })

  it('faz rollback quando INSERT falha', async () => {
    const client = criarClientFake([
      { rows: [], rowCount: 0 },   // BEGIN
      null,                          // INSERT vai falhar
    ])
    client.query.mockImplementationOnce(() => Promise.resolve({ rows: [], rowCount: 0 }))  // BEGIN
    client.query.mockImplementationOnce(() => Promise.reject(new Error('violacao de constraint')))  // INSERT
    client.query.mockImplementation(() => Promise.resolve({ rows: [], rowCount: 0 }))  // ROLLBACK

    await expect(
      criarRegistroDiario({
        professor_id: 'prof-1',
        turma_id: 'turma-1',
        data_aula: '2026-06-15',
        conteudo: 'Erro',
      })
    ).rejects.toThrow('violacao de constraint')
  })
})

// ============================================================================
// atualizarRegistroDiario
// ============================================================================

describe('atualizarRegistroDiario', () => {
  it('atualiza apenas os campos fornecidos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await atualizarRegistroDiario('diario-1', {
      conteudo: 'Novo conteudo',
      status: 'publicado',
    })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('conteudo = $')
    expect(sql).toContain('status = $')
    expect(sql).toContain('publicado_em = NOW()')
    expect(params).toContain('Novo conteudo')
    expect(params).toContain('publicado')
  })

  it('nao executa UPDATE quando nenhum campo fornecido', async () => {
    await atualizarRegistroDiario('diario-1', {})

    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('atualiza atividades e observacoes_individuais como JSONB', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await atualizarRegistroDiario('diario-1', {
      atividades: [{ tipo: 'exercicio', descricao: 'Resolver problemas', duracao_min: 30 }],
      observacoes_individuais: { 'aluno-1': 'Participativo' },
    })

    const [sql] = mockQuery.mock.calls[0]
    expect(sql).toContain('atividades = $')
    expect(sql).toContain('::jsonb')
    expect(sql).toContain('observacoes_individuais = $')
  })

  it('atualiza habilidades BNCC deletando as antigas e inserindo as novas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)   // UPDATE diario
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)   // DELETE habilidades
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)   // INSERT hab 1
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)   // INSERT hab 2

    await atualizarRegistroDiario('diario-1', {
      conteudo: 'Com BNCC',
      habilidades_bncc: ['EF06MA01', 'EF06MA02'],
    })

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM diario_classe_bncc_habilidades'),
      ['diario-1']
    )
  })
})

// ============================================================================
// buscarRegistroPorId
// ============================================================================

describe('buscarRegistroPorId', () => {
  it('retorna registro com habilidades BNCC quando encontrado', async () => {
    const fakeReg = {
      id: 'diario-1',
      conteudo: 'Conteudo da aula',
      status: 'publicado',
      turma_codigo: 'T5A',
    }
    const fakeHabs = [
      { codigo: 'EF05MA01', descricao: 'Habilidade de matematica', componente_id: 'mat', ano: '5' },
    ]

    mockQuery
      .mockResolvedValueOnce({ rows: [fakeReg], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: fakeHabs, rowCount: 1 } as any)

    const result = await buscarRegistroPorId('diario-1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('diario-1')
    expect(result!.habilidades_bncc).toHaveLength(1)
    expect(result!.habilidades_bncc[0].codigo).toBe('EF05MA01')
  })

  it('retorna null quando registro nao encontrado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarRegistroPorId('nao-existe')

    expect(result).toBeNull()
    // Nao deve buscar habilidades quando registro nao existe
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// listarRegistros
// ============================================================================

describe('listarRegistros', () => {
  it('lista registros sem filtros com limite padrao 50', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarRegistros({})

    const params = mockQuery.mock.calls[0][1]!
    // Penultimo e ultimo sao limite e offset
    expect(params[params.length - 2]).toBe(50)
    expect(params[params.length - 1]).toBe(0)
  })

  it('filtra por turmaId, professorId, disciplinaId, datas e status', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarRegistros({
      turmaId: 'turma-1',
      professorId: 'prof-1',
      disciplinaId: 'disc-1',
      dataInicio: '2026-03-01',
      dataFim: '2026-06-30',
      status: 'publicado',
    })

    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('d.turma_id = $')
    expect(sql).toContain('d.professor_id = $')
    expect(sql).toContain('d.disciplina_id = $')
    expect(sql).toContain('d.data_aula >= $')
    expect(sql).toContain('d.data_aula <= $')
    expect(sql).toContain('d.status = $')
    expect(params).toContain('turma-1')
    expect(params).toContain('publicado')
  })

  it('limita a 200 quando limite excede maximo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarRegistros({ limite: 999 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[params.length - 2]).toBe(200)
  })

  it('usa offset quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await listarRegistros({ offset: 25 })

    const params = mockQuery.mock.calls[0][1]!
    expect(params[params.length - 1]).toBe(25)
  })
})

// ============================================================================
// deletarRegistro
// ============================================================================

describe('deletarRegistro', () => {
  it('retorna true quando rascunho do proprio professor e deletado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'diario-1' }], rowCount: 1 } as any)

    const result = await deletarRegistro('diario-1', 'prof-1')

    expect(result).toBe(true)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain("status = 'rascunho'")
    expect(params[0]).toBe('diario-1')
    expect(params[1]).toBe('prof-1')
  })

  it('retorna false quando registro nao encontrado, nao e rascunho, ou e de outro professor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await deletarRegistro('diario-publicado', 'prof-errado')

    expect(result).toBe(false)
  })
})
