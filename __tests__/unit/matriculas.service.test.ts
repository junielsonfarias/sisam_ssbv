/**
 * Testes unitários — lib/services/matriculas/*
 *
 * Cobre: types (isAlunoExistente, MatriculaError), consultas (buscarResumoMatriculas,
 *        verificarCapacidadeTurma, verificarAnoLetivoAtivo),
 *        leitura (obterAnoLetivoCorrente, buscarMatriculaDoAluno, listarMatriculasDaTurma),
 *        matricula (matricularAluno, matricularAlunosBatch).
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

vi.mock('@/lib/database/with-savepoint', () => ({
  withSavepoint: vi.fn(async (_client: any, fn: () => any) => fn()),
}))

vi.mock('@/lib/gerar-codigo-aluno', () => ({
  criarGeradorCodigoAlunoTx: vi.fn(() => vi.fn().mockResolvedValue('ALU-9999')),
}))

vi.mock('@/lib/auth', () => ({
  podeAcessarEscolaSync: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/constants', () => ({
  PG_ERRORS: { UNIQUE_VIOLATION: '23505' },
}))

vi.mock('@/lib/validation', () => ({}))

// Dual-write não precisa de banco real: mock aqui
vi.mock('@/lib/services/matriculas/dual-write', () => ({
  dualWriteMatricula: vi.fn().mockResolvedValue(undefined),
}))

import pool from '@/database/connection'
import {
  isAlunoExistente,
  MatriculaError,
  buscarResumoMatriculas,
  verificarCapacidadeTurma,
  verificarAnoLetivoAtivo,
  obterAnoLetivoCorrente,
  buscarMatriculaDoAluno,
  listarMatriculasDaTurma,
  matricularAluno,
  matricularAlunosBatch,
} from '@/lib/services/matriculas'

const mockQuery = vi.mocked(pool.query)

const mockClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
})

// =============================================================================
// types
// =============================================================================

describe('isAlunoExistente', () => {
  it('retorna true para objeto com id preenchido', () => {
    expect(isAlunoExistente({ id: 'a1', nome: 'Ana' })).toBe(true)
  })

  it('retorna false para objeto sem id', () => {
    expect(isAlunoExistente({ nome: 'Novo Aluno' })).toBe(false)
  })

  it('retorna false para id vazio', () => {
    expect(isAlunoExistente({ id: '', nome: 'Vazio' })).toBe(false)
  })
})

describe('MatriculaError', () => {
  it('é instância de Error com nome "MatriculaError"', () => {
    const err = new MatriculaError('turma cheia')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('MatriculaError')
    expect(err.message).toBe('turma cheia')
  })
})

// =============================================================================
// buscarResumoMatriculas
// =============================================================================

describe('buscarResumoMatriculas', () => {
  it('retorna total de turmas e alunos via 2 queries paralelas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: '120' }], rowCount: 1 } as any)

    const result = await buscarResumoMatriculas('e1', '2026')

    expect(result.total_turmas).toBe(5)
    expect(result.total_alunos).toBe(120)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('retorna zeros quando escola não tem dados', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: undefined }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: undefined }], rowCount: 1 } as any)

    const result = await buscarResumoMatriculas('e2', '2026')

    expect(result.total_turmas).toBe(0)
    expect(result.total_alunos).toBe(0)
  })
})

// =============================================================================
// verificarCapacidadeTurma
// =============================================================================

describe('verificarCapacidadeTurma', () => {
  it('retorna capacidade, matriculados e disponível corretos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 30, total_cursando: '20' }], rowCount: 1,
    } as any)

    const result = await verificarCapacidadeTurma('t1')

    expect(result.capacidade).toBe(30)
    expect(result.matriculados).toBe(20)
    expect(result.disponivel).toBe(10)
  })

  it('retorna {0,0,0} quando turma não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await verificarCapacidadeTurma('inexistente')

    expect(result).toEqual({ capacidade: 0, matriculados: 0, disponivel: 0 })
  })

  it('disponível = 0 quando turma está cheia', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 30, total_cursando: '30' }], rowCount: 1,
    } as any)

    const result = await verificarCapacidadeTurma('t1')

    expect(result.disponivel).toBe(0)
  })

  it('disponível = 0 quando acima da capacidade', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: 30, total_cursando: '35' }], rowCount: 1,
    } as any)

    const result = await verificarCapacidadeTurma('t1')

    expect(result.disponivel).toBe(0)
    expect(result.disponivel).toBeGreaterThanOrEqual(0) // nunca negativo
  })

  it('disponível = 0 quando capacidade_maxima é null ou 0 (sem limite)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ capacidade_maxima: null, total_cursando: '25' }], rowCount: 1,
    } as any)

    const result = await verificarCapacidadeTurma('t1')

    expect(result.capacidade).toBe(0)
    expect(result.disponivel).toBe(0)
  })
})

// =============================================================================
// verificarAnoLetivoAtivo
// =============================================================================

describe('verificarAnoLetivoAtivo', () => {
  it('retorna null quando ano está ativo (OK para matrículas)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'ativo' }], rowCount: 1 } as any)
    const err = await verificarAnoLetivoAtivo('2026')
    expect(err).toBeNull()
  })

  it('retorna mensagem de erro quando ano não está ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'finalizado' }], rowCount: 1 } as any)
    const err = await verificarAnoLetivoAtivo('2025')
    expect(err).toMatch(/2025/)
    expect(err).toMatch(/não está ativo/)
  })

  it('retorna null quando tabela anos_letivos não existe (tolera erro de tabela)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('relation "anos_letivos" does not exist'))
    const err = await verificarAnoLetivoAtivo('2026')
    expect(err).toBeNull()
  })

  it('retorna null quando ano não está cadastrado (tabela existe mas sem linha)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const err = await verificarAnoLetivoAtivo('2027')
    expect(err).toBeNull()
  })
})

// =============================================================================
// obterAnoLetivoCorrente
// =============================================================================

describe('obterAnoLetivoCorrente', () => {
  it('retorna o ano corrente de anos_letivos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'al1', ano: '2026', status: 'ativo' }], rowCount: 1,
    } as any)

    const result = await obterAnoLetivoCorrente()

    expect(result).toMatchObject({ id: 'al1', ano: '2026', status: 'ativo' })
  })

  it('retorna null quando não há anos cadastrados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await obterAnoLetivoCorrente()

    expect(result).toBeNull()
  })

  it('query prioriza status=ativo, depois não-fechado, depois mais recente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await obterAnoLetivoCorrente()
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/status = 'ativo'/)
    expect(sql).toMatch(/fechado/)
  })
})

// =============================================================================
// buscarMatriculaDoAluno
// =============================================================================

describe('buscarMatriculaDoAluno', () => {
  it('retorna matrícula quando ano letivo é fornecido', async () => {
    const matricula = { id: 'm1', aluno_id: 'a1', turma_id: 't1', ano_letivo_id: 'al1', situacao: 'cursando' }
    mockQuery.mockResolvedValueOnce({ rows: [matricula], rowCount: 1 } as any)

    const result = await buscarMatriculaDoAluno('a1', 'al1')

    expect(result).toMatchObject(matricula)
    expect(mockQuery).toHaveBeenCalledTimes(1) // não buscou o ano corrente
  })

  it('busca o ano corrente quando anoLetivoId não é fornecido', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'al2', ano: '2026', status: 'ativo' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'm2', aluno_id: 'a1', ano_letivo_id: 'al2' }], rowCount: 1 } as any)

    const result = await buscarMatriculaDoAluno('a1')

    expect(result).toMatchObject({ id: 'm2' })
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('retorna null quando aluno não tem matrícula no ano', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'al1', ano: '2026', status: 'ativo' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarMatriculaDoAluno('a-sem-matricula')

    expect(result).toBeNull()
  })

  it('retorna null quando não há anos letivos cadastrados', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarMatriculaDoAluno('a1')

    expect(result).toBeNull()
  })
})

// =============================================================================
// listarMatriculasDaTurma
// =============================================================================

describe('listarMatriculasDaTurma', () => {
  it('lista matrículas de uma turma', async () => {
    const matriculas = [
      { id: 'm1', aluno_id: 'a1', turma_id: 't1', situacao: 'cursando' },
      { id: 'm2', aluno_id: 'a2', turma_id: 't1', situacao: 'cursando' },
    ]
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'al1', ano: '2026', status: 'ativo' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: matriculas, rowCount: 2 } as any)

    const result = await listarMatriculasDaTurma('t1')

    expect(result).toHaveLength(2)
    expect(result[0].aluno_id).toBe('a1')
  })

  it('retorna array vazio quando não há anos letivos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await listarMatriculasDaTurma('t1')

    expect(result).toEqual([])
  })
})

// =============================================================================
// matricularAluno
// =============================================================================

describe('matricularAluno', () => {
  it('matricula aluno quando há vaga disponível', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any) // lock turma
      .mockResolvedValueOnce({ rows: [{ total: 10 }], rowCount: 1 } as any) // ocupação
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE aluno

    const result = await matricularAluno({
      alunoId: 'a1', turmaId: 't1', escolaId: 'e1', serie: '1', anoLetivo: '2026',
    })

    expect(result.sucesso).toBe(true)
    expect(result.mensagem).toMatch(/sucesso/)
  })

  it('retorna sucesso=false quando turma não encontrada', async () => {
    mockClient.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // lock sem resultado

    const result = await matricularAluno({
      alunoId: 'a1', turmaId: 't-inexistente', escolaId: 'e1', serie: '1', anoLetivo: '2026',
    })

    expect(result.sucesso).toBe(false)
    expect(result.mensagem).toMatch(/Turma não encontrada/)
  })

  it('retorna sucesso=false quando turma sem vagas', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: 30 }], rowCount: 1 } as any) // cheio

    const result = await matricularAluno({
      alunoId: 'a1', turmaId: 't1', escolaId: 'e1', serie: '1', anoLetivo: '2026',
    })

    expect(result.sucesso).toBe(false)
    expect(result.mensagem).toMatch(/sem vagas/)
  })

  it('matricula sem checar capacidade quando capacidade_maxima é null', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: null }], rowCount: 1 } as any) // lock
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE

    const result = await matricularAluno({
      alunoId: 'a1', turmaId: 't1', escolaId: 'e1', serie: '1', anoLetivo: '2026',
    })

    expect(result.sucesso).toBe(true)
  })
})

// =============================================================================
// matricularAlunosBatch
// =============================================================================

describe('matricularAlunosBatch', () => {
  it('lança MatriculaError quando ano letivo não está ativo', async () => {
    // verificarAnoLetivoAtivo usa pool.query direto
    mockQuery.mockResolvedValueOnce({ rows: [{ status: 'finalizado' }], rowCount: 1 } as any)

    await expect(
      matricularAlunosBatch({
        escolaId: 'e1', turmaId: 't1', serie: '1', anoLetivo: '2025',
        alunos: [{ nome: 'Ana' }], usuarioId: 'u1',
      })
    ).rejects.toBeInstanceOf(MatriculaError)
  })

  it('lança MatriculaError quando turma não encontrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // verificarAnoLetivoAtivo ok
    mockClient.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // lock turma → não encontrada

    await expect(
      matricularAlunosBatch({
        escolaId: 'e1', turmaId: 't-inexistente', serie: '1', anoLetivo: '2026',
        alunos: [{ nome: 'Ana' }], usuarioId: 'u1',
      })
    ).rejects.toBeInstanceOf(MatriculaError)
  })

  it('lança MatriculaError quando não há vagas para o lote inteiro', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // ano ok
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 5 }], rowCount: 1 } as any) // lock
      .mockResolvedValueOnce({ rows: [{ total: 4 }], rowCount: 1 } as any) // 1 vaga disponível

    await expect(
      matricularAlunosBatch({
        escolaId: 'e1', turmaId: 't1', serie: '1', anoLetivo: '2026',
        alunos: [{ nome: 'Ana' }, { nome: 'Bob' }, { nome: 'Cia' }], // 3 alunos
        usuarioId: 'u1',
      })
    ).rejects.toBeInstanceOf(MatriculaError)
  })

  it('cria novo aluno quando não tem id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // ano ok
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any) // vagas ok
      .mockResolvedValueOnce({ rows: [{ id: 'novo-a1', nome: 'Novo', codigo: 'ALU-9999' }], rowCount: 1 } as any) // INSERT aluno

    const result = await matricularAlunosBatch({
      escolaId: 'e1', turmaId: 't1', serie: '1', anoLetivo: '2026',
      alunos: [{ nome: 'Novo' }], usuarioId: 'u1',
    })

    expect(result.criados).toBe(1)
    expect(result.matriculados).toBe(1)
    expect(result.erros).toHaveLength(0)
  })

  it('rematricula aluno existente em situação cursando (sem conflito)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // ano ok
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: 5 }], rowCount: 1 } as any)
      // processarAlunoExistente: busca situação atual
      .mockResolvedValueOnce({ rows: [{ situacao: 'cursando', escola_id: 'e1', polo_id: null }], rowCount: 1 } as any)
      // verificar conflito de turma: nenhum
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      // UPDATE aluno
      .mockResolvedValueOnce({ rows: [{ id: 'a1', nome: 'Ana', escola_id: 'e1' }], rowCount: 1 } as any)

    const result = await matricularAlunosBatch({
      escolaId: 'e1', turmaId: 't1', serie: '1', anoLetivo: '2026',
      alunos: [{ id: 'a1', nome: 'Ana' }], usuarioId: 'u1',
    })

    expect(result.matriculados).toBe(1)
    expect(result.criados).toBe(0)
    expect(result.erros).toHaveLength(0)
  })

  it('adiciona erro quando aluno já está em outra turma no mesmo ano', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // ano ok
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ situacao: 'cursando', escola_id: 'e1', polo_id: null }], rowCount: 1 } as any)
      // conflito: aluno já está em outra turma
      .mockResolvedValueOnce({ rows: [{ turma_id: 'outra-turma' }], rowCount: 1 } as any)

    const result = await matricularAlunosBatch({
      escolaId: 'e1', turmaId: 't1', serie: '1', anoLetivo: '2026',
      alunos: [{ id: 'a1', nome: 'Ana' }], usuarioId: 'u1',
    })

    expect(result.erros).toHaveLength(1)
    expect(result.erros[0]).toMatch(/Ana.*outra turma/)
    expect(result.matriculados).toBe(0)
  })

  it('adiciona erro IDOR quando usuário escola tenta mover aluno de outra escola', async () => {
    const { podeAcessarEscolaSync } = await import('@/lib/auth')
    vi.mocked(podeAcessarEscolaSync).mockReturnValue(false)

    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // ano ok
    mockClient.query
      .mockResolvedValueOnce({ rows: [{ capacidade_maxima: 30 }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 } as any)
      // aluno pertence a escola-X
      .mockResolvedValueOnce({ rows: [{ situacao: 'cursando', escola_id: 'escola-X', polo_id: null }], rowCount: 1 } as any)

    const usuario = { id: 'u1', tipo_usuario: 'escola', escola_id: 'escola-1', polo_id: null } as any

    const result = await matricularAlunosBatch({
      escolaId: 'escola-1', turmaId: 't1', serie: '1', anoLetivo: '2026',
      alunos: [{ id: 'a-ext', nome: 'Externo' }], usuarioId: 'u1', usuario,
    })

    expect(result.erros).toHaveLength(1)
    expect(result.erros[0]).toMatch(/fora do seu escopo/)
  })
})
