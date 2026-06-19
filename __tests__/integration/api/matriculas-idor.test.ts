/**
 * Testes de regressão — C1: IDOR de escrita em matrícula em lote
 *
 * Correção aplicada em lib/services/matriculas/matricula.ts
 * (processarAlunoExistente): antes de qualquer UPDATE, o service busca a
 * escola ATUAL do aluno no banco e chama podeAcessarEscolaSync(). Usuário
 * escola/polo fora de escopo recebe erro por-aluno; admin/tecnico passam.
 *
 * Estratégia: testar o SERVICE diretamente (unit de integração). Mockamos
 * pool.query e withTransaction/withSavepoint para controlar as queries do
 * service sem bater no banco real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

// withTransaction invoca a callback com o mockClient diretamente (sem DB real)
const mockClient = { query: vi.fn() }

vi.mock('@/lib/database/with-transaction', () => ({
  withTransaction: (fn: any) => fn(mockClient),
}))

// withSavepoint invoca a callback diretamente (sem savepoint real)
vi.mock('@/lib/database/with-savepoint', () => ({
  withSavepoint: (_client: any, fn: any) => fn(),
}))

// pool.query principal (verificarAnoLetivoAtivo e verificarCapacidadeTurma usam pool diretamente)
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

// criarGeradorCodigoAlunoTx — só necessário quando há alunos novos; no-op aqui
vi.mock('@/lib/gerar-codigo-aluno', () => ({
  criarGeradorCodigoAlunoTx: () => async () => 'COD-001',
}))

// ------------------------------------------------------------------ imports --

import pool from '@/database/connection'
import { matricularAlunosBatch } from '@/lib/services/matriculas/matricula'
import type { Usuario } from '@/lib/types'

const mockPoolQuery = vi.mocked(pool.query)
const mockClientQuery = vi.mocked(mockClient.query)

// ------------------------------------------------------------------ fixtures --

/** Usuário administrador — sem restrição de escopo */
function admin(): Usuario {
  return {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@semed.edu',
    tipo_usuario: 'administrador',
    ativo: true,
    escola_id: null,
    polo_id: null,
  } as unknown as Usuario
}

/** Usuário escola A */
function escolaA(): Usuario {
  return {
    id: 'user-esc-a',
    nome: 'Escola A',
    email: 'ea@semed.edu',
    tipo_usuario: 'escola',
    ativo: true,
    escola_id: 'esc-a-uuid',
    polo_id: null,
  } as unknown as Usuario
}

/** Usuário polo P1 — gerencia apenas as escolas do polo P1 */
function usuarioPolo(): Usuario {
  return {
    id: 'user-polo-1',
    nome: 'Polo P1',
    email: 'p1@semed.edu',
    tipo_usuario: 'polo',
    ativo: true,
    escola_id: null,
    polo_id: 'polo-1-uuid',
  } as unknown as Usuario
}

const ESC_A = 'esc-a-uuid'
const ESC_B = 'esc-b-uuid'
const POLO_1 = 'polo-1-uuid'
const POLO_2 = 'polo-2-uuid'
const TURMA_ID = 'turma-0000-0000-0000-000000000001'
const ANO = '2026'

/** Payload base de parâmetros do batch */
function baseBatch(alunos: any[], usuarioParam?: Usuario) {
  return {
    escolaId: ESC_A,
    turmaId: TURMA_ID,
    serie: '1º Ano',
    anoLetivo: ANO,
    alunos,
    usuarioId: 'qualquer-id',
    usuario: usuarioParam,
  }
}

/** Simula respostas do pool.query (fora da transação) para ano letivo + capacidade */
function mockPoolOk() {
  // verificarAnoLetivoAtivo → retorna ativo
  mockPoolQuery.mockResolvedValueOnce({ rows: [{ status: 'ativo' }] } as any)
}

/** Simula respostas do client.query dentro da transação para turma sem limite de vagas */
function mockClientTurmaIlimitada() {
  // SELECT capacidade_maxima FROM turmas FOR UPDATE → sem limite
  mockClientQuery.mockResolvedValueOnce({ rows: [{ capacidade_maxima: null }] } as any)
}

// ================================================================ testes ===

describe('C1 IDOR: controle de escopo em matricularAlunosBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------- 1 --
  it('C1 IDOR: escola não pode sequestrar aluno de outra escola (fora do escopo → erro por-aluno, UPDATE não roda)', async () => {
    // Arrange
    mockPoolOk()
    mockClientTurmaIlimitada()

    // SELECT escola atual do aluno → aluno pertence à escola B (diferente da A)
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_B, polo_id: POLO_2 }],
    } as any)

    const aluno = { id: 'aluno-uuid-0001', nome: 'Maria Souza' }

    // Act
    const resultado = await matricularAlunosBatch(baseBatch([aluno], escolaA()))

    // Assert — erro por-aluno registrado, aluno NÃO matriculado
    expect(resultado.matriculados).toBe(0)
    expect(resultado.erros).toHaveLength(1)
    expect(resultado.erros[0]).toMatch(/fora do seu escopo de acesso/i)
    expect(resultado.erros[0]).toContain('Maria Souza')

    // UPDATE não deve ter sido chamado: só rodaram capacidade-check + SELECT escola atual
    const updateCalls = mockClientQuery.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE alunos')
    )
    expect(updateCalls).toHaveLength(0)
  })

  // ---------------------------------------------------------------------- 2 --
  it('C1 caminho feliz: escola A rematricula aluno da própria escola A → matriculados = 1', async () => {
    // Arrange
    mockPoolOk()
    mockClientTurmaIlimitada()

    // SELECT escola atual → aluno pertence à mesma escola A
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_A, polo_id: POLO_1 }],
    } as any)

    // SELECT conflito de turma → sem conflito
    mockClientQuery.mockResolvedValueOnce({ rows: [] } as any)

    // UPDATE alunos → sucesso
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ id: 'aluno-uuid-0001', nome: 'João Lima', escola_id: ESC_A }],
    } as any)

    const aluno = { id: 'aluno-uuid-0001', nome: 'João Lima' }

    // Act
    const resultado = await matricularAlunosBatch(baseBatch([aluno], escolaA()))

    // Assert
    expect(resultado.matriculados).toBe(1)
    expect(resultado.erros).toHaveLength(0)
    expect(resultado.alunos[0]).toMatchObject({ nome: 'João Lima' })
  })

  // ---------------------------------------------------------------------- 3 --
  it('C1 administrador: sem restrição de escopo — matricula aluno de qualquer escola', async () => {
    // Arrange
    mockPoolOk()
    mockClientTurmaIlimitada()

    // SELECT escola atual → aluno pertence à escola B (admin pode mesmo assim)
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_B, polo_id: POLO_2 }],
    } as any)

    // SELECT conflito de turma → sem conflito
    mockClientQuery.mockResolvedValueOnce({ rows: [] } as any)

    // UPDATE alunos → sucesso
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ id: 'aluno-uuid-0002', nome: 'Carlos Melo', escola_id: ESC_A }],
    } as any)

    const aluno = { id: 'aluno-uuid-0002', nome: 'Carlos Melo' }

    // Act
    const resultado = await matricularAlunosBatch(baseBatch([aluno], admin()))

    // Assert — admin passa sem restrição
    expect(resultado.matriculados).toBe(1)
    expect(resultado.erros).toHaveLength(0)
  })

  // ---------------------------------------------------------------------- 4 --
  it('C1 erro por-aluno não derruba o lote: aluno fora de escopo + aluno válido → apenas o válido é matriculado', async () => {
    // Arrange
    mockPoolOk()
    mockClientTurmaIlimitada()

    // ----- Aluno 1: fora de escopo (escola B) -----
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_B, polo_id: POLO_2 }],
    } as any)

    // ----- Aluno 2: escola A (ok) -----
    // SELECT escola atual
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_A, polo_id: POLO_1 }],
    } as any)
    // SELECT conflito
    mockClientQuery.mockResolvedValueOnce({ rows: [] } as any)
    // UPDATE
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ id: 'aluno-uuid-0003', nome: 'Ana Clara', escola_id: ESC_A }],
    } as any)

    const alunos = [
      { id: 'aluno-uuid-9999', nome: 'Invasor Externo' },
      { id: 'aluno-uuid-0003', nome: 'Ana Clara' },
    ]

    // Act
    const resultado = await matricularAlunosBatch(baseBatch(alunos, escolaA()))

    // Assert — somente aluno 2 matriculado; aluno 1 virou erro
    expect(resultado.matriculados).toBe(1)
    expect(resultado.erros).toHaveLength(1)
    expect(resultado.erros[0]).toMatch(/Invasor Externo.*fora do seu escopo/i)
    expect(resultado.alunos[0]).toMatchObject({ nome: 'Ana Clara' })
  })

  // ---------------------------------------------------------------------- 5 --
  it('C1 polo: usuário polo só acessa escola do próprio polo — rejeita escola de polo diferente', async () => {
    // Arrange
    mockPoolOk()
    mockClientTurmaIlimitada()

    // SELECT escola atual → aluno está na escola B, pertencente ao polo 2 (diferente do polo 1 do usuário)
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_B, polo_id: POLO_2 }],
    } as any)

    const aluno = { id: 'aluno-uuid-7777', nome: 'Pedro Polo' }

    // Act
    const resultado = await matricularAlunosBatch(baseBatch([aluno], usuarioPolo()))

    // Assert
    expect(resultado.matriculados).toBe(0)
    expect(resultado.erros[0]).toMatch(/fora do seu escopo de acesso/i)
  })

  // ---------------------------------------------------------------------- 6 --
  it('C1 sem usuario no parâmetro: sem restrição de escopo (retrocompatibilidade)', async () => {
    // Arrange — sem usuario passado (undefined)
    mockPoolOk()
    mockClientTurmaIlimitada()

    // SELECT escola atual do aluno
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ situacao: 'cursando', escola_id: ESC_B, polo_id: POLO_2 }],
    } as any)
    // SELECT conflito
    mockClientQuery.mockResolvedValueOnce({ rows: [] } as any)
    // UPDATE
    mockClientQuery.mockResolvedValueOnce({
      rows: [{ id: 'aluno-uuid-8888', nome: 'Sem Escopo', escola_id: ESC_A }],
    } as any)

    const aluno = { id: 'aluno-uuid-8888', nome: 'Sem Escopo' }

    // Act — sem usuario
    const resultado = await matricularAlunosBatch(baseBatch([aluno], undefined))

    // Assert — sem usuario → não bloqueia (retrocompat com chamadas internas)
    expect(resultado.matriculados).toBe(1)
    expect(resultado.erros).toHaveLength(0)
  })
})
