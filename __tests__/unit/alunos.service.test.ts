/**
 * Testes unitários — lib/services/alunos.service.ts
 *
 * Cobre: buscarAlunosProfessor, buscarAlunosPorBusca, validarTurmaEscola,
 *        deletarAluno (soft delete), criarAluno, atualizarAluno,
 *        alterarSituacao, AlunoForaDeEscopoError.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

vi.mock('@/lib/database/with-transaction', () => ({
  withTransaction: vi.fn(async (fn: (client: any) => any) => {
    return fn(mockClient)
  }),
}))

vi.mock('@/lib/gerar-codigo-aluno', () => ({
  gerarCodigoAluno: vi.fn().mockResolvedValue('ALU-0001'),
}))

vi.mock('@/lib/auth', () => ({
  podeAcessarEscolaSync: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/services/facial.service', () => ({
  anonimizarDadosFaciaisTx: vi.fn().mockResolvedValue({ embeddings: 0, consentimentos_revogados: 0, frequencias_anonimizadas: 0 }),
}))

// ------------------------------------------------------------------ imports --

import pool from '@/database/connection'
import { podeAcessarEscolaSync } from '@/lib/auth'
import {
  buscarAlunosProfessor,
  buscarAlunosPorBusca,
  validarTurmaEscola,
  deletarAluno,
  criarAluno,
  atualizarAluno,
  alterarSituacao,
  AlunoForaDeEscopoError,
} from '@/lib/services/alunos.service'

const mockQuery = vi.mocked(pool.query)

/** Client mock reutilizado pelo withTransaction mock. */
const mockClient = {
  query: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
})

// =============================================================================
// buscarAlunosProfessor
// =============================================================================

describe('buscarAlunosProfessor', () => {
  it('retorna lista de alunos cursando da turma', async () => {
    const alunos = [
      { id: 'a1', nome: 'Ana', codigo: 'C1', data_nascimento: '2010-01-01', situacao: 'cursando' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: alunos, rowCount: 1 } as any)

    const result = await buscarAlunosProfessor('turma-1')

    expect(result).toEqual(alunos)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/situacao = 'cursando'/)
    expect(mockQuery.mock.calls[0][1]).toEqual(['turma-1'])
  })

  it('retorna lista vazia quando turma não tem alunos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const result = await buscarAlunosProfessor('turma-vazia')
    expect(result).toEqual([])
  })
})

// =============================================================================
// buscarAlunosPorBusca
// =============================================================================

describe('buscarAlunosPorBusca', () => {
  it('busca por nome/código/CPF sem filtro de escola', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a1', nome: 'Carlos' }], rowCount: 1 } as any)

    const result = await buscarAlunosPorBusca('Carlos')

    expect(result).toHaveLength(1)
    expect(result[0].nome).toBe('Carlos')
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/a\.nome/)
    expect(sql).toMatch(/LIMIT 20/)
  })

  it('aplica filtro de escola_id quando fornecido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAlunosPorBusca('Ana', 'escola-1')

    const [sql, params] = mockQuery.mock.calls[0]
    expect(params).toContain('escola-1')
  })

  it('não aplica filtro de escola quando escolaId é null', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarAlunosPorBusca('Maria', null)

    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).not.toContain(null)
  })

  it('retorna lista vazia quando nenhum aluno bate', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const result = await buscarAlunosPorBusca('xyzabc123')
    expect(result).toEqual([])
  })
})

// =============================================================================
// validarTurmaEscola
// =============================================================================

describe('validarTurmaEscola', () => {
  it('retorna true quando turma pertence à escola', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'escola-1' }], rowCount: 1 } as any)
    const ok = await validarTurmaEscola('turma-1', 'escola-1')
    expect(ok).toBe(true)
  })

  it('retorna false quando turma pertence a outra escola (IDOR)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'escola-X' }], rowCount: 1 } as any)
    const ok = await validarTurmaEscola('turma-1', 'escola-1')
    expect(ok).toBe(false)
  })

  it('retorna false quando turma não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const ok = await validarTurmaEscola('turma-inexistente', 'escola-1')
    expect(ok).toBe(false)
  })
})

// =============================================================================
// deletarAluno (soft delete)
// =============================================================================

describe('deletarAluno', () => {
  it('remove caches SISAM e faz soft delete (ativo=false)', async () => {
    // 3 DELETEs de caches + 1 UPDATE
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // DELETE resultados_provas
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // DELETE resultados_producao
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // DELETE resultados_consolidados
      .mockResolvedValueOnce({ rows: [{ id: 'a1', nome: 'João' }], rowCount: 1 } as any) // UPDATE alunos

    const result = await deletarAluno('a1')

    expect(result).toEqual({ nome: 'João' })

    const chamadas = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(chamadas.some(s => /DELETE FROM resultados_provas/i.test(s))).toBe(true)
    expect(chamadas.some(s => /DELETE FROM resultados_producao/i.test(s))).toBe(true)
    expect(chamadas.some(s => /DELETE FROM resultados_consolidados/i.test(s))).toBe(true)
    // Deve fazer UPDATE (soft delete), nunca DELETE FROM alunos
    expect(chamadas.some(s => /UPDATE alunos/i.test(s))).toBe(true)
    expect(chamadas.some(s => /DELETE FROM alunos/i.test(s))).toBe(false)

    // UPDATE deve incluir ativo = false
    const updateSql = chamadas.find(s => /UPDATE alunos/i.test(s))!
    expect(updateSql).toMatch(/ativo = false/)
  })

  it('lança erro quando aluno não existe na base', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // UPDATE retorna vazio

    await expect(deletarAluno('nao-existe')).rejects.toThrow('Aluno não encontrado durante exclusão')
  })
})

// =============================================================================
// criarAluno
// =============================================================================

describe('criarAluno', () => {
  it('cria aluno com código automático quando não fornecido', async () => {
    mockQuery
      // validarTurmaEscola → não tem turma_id, não chama
      .mockResolvedValueOnce({ rows: [{ id: 'novo-aluno', nome: 'Maria', codigo: 'ALU-0001' }], rowCount: 1 } as any)

    const result = await criarAluno({ nome: 'Maria', escola_id: 'e1' })

    expect(result).toMatchObject({ nome: 'Maria' })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/INSERT INTO alunos/)
  })

  it('valida turma_id quando fornecida (turma de outra escola lança erro)', async () => {
    // 1ª query: validarTurmaEscola → retorna turma de escola diferente
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'escola-X' }], rowCount: 1 } as any)

    await expect(
      criarAluno({ nome: 'Pedro', escola_id: 'e1', turma_id: 'turma-1' })
    ).rejects.toThrow('Turma não pertence à escola selecionada')
  })

  it('cria aluno com turma válida', async () => {
    // validarTurmaEscola → ok
    mockQuery
      .mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any)
      // INSERT aluno
      .mockResolvedValueOnce({ rows: [{ id: 'novo', nome: 'Lia', escola_id: 'e1', turma_id: 't1' }], rowCount: 1 } as any)

    const result = await criarAluno({ nome: 'Lia', escola_id: 'e1', turma_id: 't1' })

    expect(result).toMatchObject({ nome: 'Lia' })
  })

  it('inclui data_matricula padrão (hoje) quando não fornecida', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'n', nome: 'Zé' }], rowCount: 1 } as any)

    await criarAluno({ nome: 'Zé', escola_id: 'e1' })

    const params = mockQuery.mock.calls[0][1] as unknown[]
    // data_matricula deve estar nos params e ter formato YYYY-MM-DD
    const dataParam = params.find(p => typeof p === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p as string))
    expect(dataParam).toBeDefined()
  })

  it('usa código fornecido em vez de gerar automático', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'n', nome: 'Bia', codigo: 'MEUCODIGO' }], rowCount: 1 } as any)

    await criarAluno({ nome: 'Bia', escola_id: 'e1', codigo: 'MEUCODIGO' })

    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('MEUCODIGO')
  })
})

// =============================================================================
// atualizarAluno
// =============================================================================

describe('atualizarAluno', () => {
  it('atualiza campos e retorna o aluno atualizado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'a1', nome: 'Novo Nome', escola_id: 'e1' }], rowCount: 1,
    } as any)

    const result = await atualizarAluno('a1', { nome: 'Novo Nome', escola_id: 'e1' })

    expect(result).toMatchObject({ nome: 'Novo Nome' })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/UPDATE alunos/)
    expect(sql).toMatch(/RETURNING \*/)
  })

  it('inclui nome e escola_id no SET quando fornecidos (ambos estão na whitelist)', async () => {
    // nome e escola_id estão em ALUNO_CAMPOS_PERSISTIVEIS, então devem aparecer no SET
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'a1', nome: 'X', escola_id: 'e1' }], rowCount: 1,
    } as any)

    const result = await atualizarAluno('a1', { nome: 'X', escola_id: 'e1' })

    expect(result).toMatchObject({ nome: 'X' })
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/SET/)
    expect(sql).toMatch(/nome = \$/)
    expect(sql).toMatch(/escola_id = \$/)
  })

  it('retorna null quando aluno não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const result = await atualizarAluno('a1', { nome: 'X', escola_id: 'e1', ativo: false })
    expect(result).toBeNull()
  })

  it('valida escopo quando usuário fornecido — lança AlunoForaDeEscopoError para escola diferente', async () => {
    vi.mocked(podeAcessarEscolaSync).mockReturnValue(false)

    // alunoAtual query: aluno pertence a escola-X
    mockQuery.mockResolvedValueOnce({
      rows: [{ escola_id: 'escola-X', polo_id: null }], rowCount: 1,
    } as any)

    const usuario = { id: 'u1', tipo_usuario: 'escola', escola_id: 'escola-1', polo_id: null } as any

    await expect(
      atualizarAluno('a1', { nome: 'Novo', escola_id: 'escola-1' }, usuario)
    ).rejects.toBeInstanceOf(AlunoForaDeEscopoError)
  })

  it('permite atualização quando usuário tem acesso à escola (escopo ok)', async () => {
    vi.mocked(podeAcessarEscolaSync).mockReturnValue(true)

    // alunoAtual query
    mockQuery
      .mockResolvedValueOnce({ rows: [{ escola_id: 'escola-1', polo_id: null }], rowCount: 1 } as any)
      // UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 'a1', nome: 'Novo', escola_id: 'escola-1' }], rowCount: 1 } as any)

    const usuario = { id: 'u1', tipo_usuario: 'escola', escola_id: 'escola-1', polo_id: null } as any
    const result = await atualizarAluno('a1', { nome: 'Novo', escola_id: 'escola-1' }, usuario)
    expect(result).toMatchObject({ nome: 'Novo' })
  })
})

// =============================================================================
// alterarSituacao
// =============================================================================

describe('alterarSituacao', () => {
  function setupClientSequence(respostas: Array<{ rows: any[]; rowCount?: number }>) {
    let idx = 0
    mockClient.query.mockImplementation(async (sql: string) => {
      if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [], rowCount: 0 }
      const resp = respostas[idx++] ?? { rows: [], rowCount: 0 }
      return resp
    })
  }

  it('atualiza situação para "cursando" e registra no histórico', async () => {
    setupClientSequence([
      { rows: [{ id: 'a1', situacao: 'transferido', ativo: false, escola_id: 'e1' }] }, // SELECT aluno
      { rows: [] },  // UPDATE alunos
      { rows: [] },  // INSERT historico_situacao
    ])

    const result = await alterarSituacao('a1', { situacao: 'cursando' }, 'user-1')

    expect(result.sucesso).toBe(true)
    expect(result.situacao_anterior).toBe('transferido')
    expect(result.situacao_nova).toBe('cursando')

    const chamadas = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(chamadas.some(s => /INSERT INTO historico_situacao/i.test(s))).toBe(true)
  })

  it('lança erro quando aluno não encontrado', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [], rowCount: 0 }
      return { rows: [], rowCount: 0 } // aluno não existe
    })

    await expect(
      alterarSituacao('inexistente', { situacao: 'cursando' }, 'user-1')
    ).rejects.toThrow('Aluno não encontrado')
  })

  it('lança erro quando aluno já possui a situação desejada', async () => {
    mockClient.query.mockImplementation(async (sql: string) => {
      if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [], rowCount: 0 }
      return { rows: [{ id: 'a1', situacao: 'cursando', ativo: true, escola_id: 'e1' }], rowCount: 1 }
    })

    await expect(
      alterarSituacao('a1', { situacao: 'cursando' }, 'user-1')
    ).rejects.toThrow('O aluno já possui esta situação')
  })

  it('para "transferido" faz NULL no turma_id e remove dados faciais (LGPD)', async () => {
    setupClientSequence([
      { rows: [{ id: 'a1', situacao: 'cursando', ativo: true, escola_id: 'e1' }] },
      { rows: [] }, // UPDATE alunos SET turma_id = NULL
      { rows: [] }, // INSERT historico
    ])

    const result = await alterarSituacao('a1', {
      situacao: 'transferido',
      escola_destino_nome: 'Escola B',
    }, 'user-1')

    expect(result.sucesso).toBe(true)
    expect(result.dados_faciais_removidos).toBeDefined()

    // UPDATE deve setar turma_id = NULL
    const chamadas = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)
    const updateSql = chamadas.find(s => /UPDATE alunos/i.test(s))
    expect(updateSql).toMatch(/turma_id = NULL/)
  })

  it('para "abandono" também remove dados faciais (LGPD)', async () => {
    setupClientSequence([
      { rows: [{ id: 'a1', situacao: 'cursando', ativo: true, escola_id: 'e1' }] },
      { rows: [] },
      { rows: [] },
    ])

    const result = await alterarSituacao('a1', { situacao: 'abandono' }, 'user-1')

    expect(result.sucesso).toBe(true)
    expect(result.dados_faciais_removidos).toBeDefined()
  })

  it('tipo_movimentacao = "saida" para transferido', async () => {
    const inserts: unknown[][] = []
    mockClient.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql)) return { rows: [], rowCount: 0 }
      if (/SELECT id, situacao/i.test(sql)) {
        return { rows: [{ id: 'a1', situacao: 'cursando', ativo: true, escola_id: 'e1' }], rowCount: 1 }
      }
      if (/INSERT INTO historico_situacao/i.test(sql)) {
        inserts.push(params || [])
      }
      return { rows: [], rowCount: 0 }
    })

    await alterarSituacao('a1', { situacao: 'transferido' }, 'user-1')

    // tipo_movimentacao é o 12º parâmetro ($12) do INSERT
    expect(inserts.length).toBeGreaterThan(0)
    expect(inserts[0]).toContain('saida')
  })
})

// =============================================================================
// AlunoForaDeEscopoError
// =============================================================================

describe('AlunoForaDeEscopoError', () => {
  it('é instância de Error e tem o nome correto', () => {
    const err = new AlunoForaDeEscopoError()
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('AlunoForaDeEscopoError')
    expect(err.message).toMatch(/fora do seu escopo/)
  })
})
