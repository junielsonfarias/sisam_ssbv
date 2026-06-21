/**
 * Testes unitários — lib/services/frequencia.ts (extensão)
 *
 * Cobre as funções que dependem de banco (mockado):
 *   buscarFrequenciaDiaria, registrarFrequenciaDiaria, lancarFaltas,
 *   excluirFrequenciaDiaria, justificarFalta, buscarFrequenciaHoraAula,
 *   registrarFrequenciaHoraAula.
 *
 * Nota: validarDataNaoFutura já é coberta em frequencia.service.test.ts.
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

import pool from '@/database/connection'
import {
  buscarFrequenciaDiaria,
  registrarFrequenciaDiaria,
  lancarFaltas,
  excluirFrequenciaDiaria,
  justificarFalta,
  buscarFrequenciaHoraAula,
  registrarFrequenciaHoraAula,
} from '@/lib/services/frequencia'

const mockQuery = vi.mocked(pool.query)
const mockClient = { query: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.query.mockReset()
})

// =============================================================================
// buscarFrequenciaDiaria
// =============================================================================

describe('buscarFrequenciaDiaria', () => {
  const alunos = [
    { aluno_id: 'a1', aluno_nome: 'Ana', status: 'presente' },
    { aluno_id: 'a2', aluno_nome: 'Bob', status: 'ausente' },
    { aluno_id: 'a3', aluno_nome: 'Cia', status: null },
  ]

  it('retorna alunos com resumo de presença', async () => {
    mockQuery.mockResolvedValueOnce({ rows: alunos, rowCount: 3 } as any)

    const result = await buscarFrequenciaDiaria('t1', '2026-06-20')

    expect(result.alunos).toHaveLength(3)
    expect(result.resumo.total).toBe(3)
    expect(result.resumo.presentes).toBe(1)
    expect(result.resumo.ausentes).toBe(1)
    expect(result.resumo.sem_registro).toBe(1)
  })

  it('calcula percentual de presença corretamente', async () => {
    const alunosPresentes = [
      { status: 'presente' }, { status: 'presente' }, { status: 'ausente' }, { status: 'ausente' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: alunosPresentes, rowCount: 4 } as any)

    const result = await buscarFrequenciaDiaria('t1', '2026-06-20')

    expect(result.resumo.percentual).toBe(50) // 2/4 = 50%
  })

  it('percentual é 0 quando não há alunos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    const result = await buscarFrequenciaDiaria('t1', '2026-06-20')

    expect(result.resumo.percentual).toBe(0)
    expect(result.resumo.total).toBe(0)
  })

  it('conta status "justificado" como ausente no resumo', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { status: 'presente' },
        { status: 'justificado' },
      ], rowCount: 2,
    } as any)

    const result = await buscarFrequenciaDiaria('t1', '2026-06-20')

    expect(result.resumo.ausentes).toBe(1) // justificado conta como ausente
    expect(result.resumo.presentes).toBe(1)
  })
})

// =============================================================================
// registrarFrequenciaDiaria
// =============================================================================

describe('registrarFrequenciaDiaria', () => {
  // Data passada para evitar erro de data futura
  const dataOntem = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  it('registra frequência em lote e retorna o número de linhas afetadas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any) // turma
    mockClient.query.mockResolvedValueOnce({ rowCount: 3 } as any) // INSERT em lote

    const count = await registrarFrequenciaDiaria(
      't1', dataOntem,
      [
        { aluno_id: 'a1', status: 'presente' },
        { aluno_id: 'a2', status: 'ausente' },
        { aluno_id: 'a3', status: 'justificado', justificativa: 'Atestado' },
      ],
      'user-1'
    )

    expect(count).toBe(3)
    const clientCalls = mockClient.query.mock.calls.map((c: unknown[]) => c[0] as string)
    expect(clientCalls.some(s => /INSERT INTO frequencia_diaria/i.test(s))).toBe(true)
  })

  it('retorna 0 quando registros é lista vazia', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any)

    const count = await registrarFrequenciaDiaria('t1', dataOntem, [], 'user-1')

    expect(count).toBe(0)
  })

  it('lança erro quando data é futura', async () => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dataFutura = amanha.toISOString().slice(0, 10)

    await expect(
      registrarFrequenciaDiaria('t1', dataFutura, [{ aluno_id: 'a1', status: 'presente' }], 'u1')
    ).rejects.toThrow('Não é permitido lançar frequência para data futura')
  })

  it('lança erro quando turma não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(
      registrarFrequenciaDiaria('t-inexistente', dataOntem, [{ aluno_id: 'a1', status: 'presente' }], 'u1')
    ).rejects.toThrow('Turma não encontrada')
  })

  it('justificativa é null para status diferente de "justificado"', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any)
    mockClient.query.mockResolvedValueOnce({ rowCount: 1 } as any)

    await registrarFrequenciaDiaria(
      't1', dataOntem,
      [{ aluno_id: 'a1', status: 'ausente', justificativa: 'Texto que não deve persistir' }],
      'u1'
    )

    // O INSERT deve ter null para justificativa quando status != 'justificado'
    const callParams = mockClient.query.mock.calls[0][1] as unknown[]
    // O último parâmetro (justificativa) deve ser null
    expect(callParams[callParams.length - 1]).toBeNull()
  })
})

// =============================================================================
// lancarFaltas
// =============================================================================

describe('lancarFaltas', () => {
  const dataOntem = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  it('lança faltas para alunos sem registro e retorna contagem', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any) // turma
      .mockResolvedValueOnce({ rows: [{ id: 'f1' }, { id: 'f2' }], rowCount: 2 } as any) // INSERT

    const count = await lancarFaltas('t1', dataOntem, 'u1')

    expect(count).toBe(2)
    const insertSql = mockQuery.mock.calls[1][0] as string
    expect(insertSql).toMatch(/INSERT INTO frequencia_diaria/)
    expect(insertSql).toMatch(/'ausente'/)
  })

  it('lança erro quando data é futura', async () => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)

    await expect(
      lancarFaltas('t1', amanha.toISOString().slice(0, 10), 'u1')
    ).rejects.toThrow('data futura')
  })

  it('lança erro quando turma não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(lancarFaltas('t-inexistente', dataOntem, 'u1'))
      .rejects.toThrow('Turma não encontrada')
  })
})

// =============================================================================
// excluirFrequenciaDiaria
// =============================================================================

describe('excluirFrequenciaDiaria', () => {
  it('retorna true quando registro deletado com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'f1' }], rowCount: 1 } as any)
    const ok = await excluirFrequenciaDiaria('f1')
    expect(ok).toBe(true)
  })

  it('retorna false quando registro não encontrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const ok = await excluirFrequenciaDiaria('f-inexistente')
    expect(ok).toBe(false)
  })
})

// =============================================================================
// justificarFalta
// =============================================================================

describe('justificarFalta', () => {
  it('atualiza status para justificado e persiste justificativa', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'f1' }], rowCount: 1 } as any)

    const ok = await justificarFalta('f1', '  Atestado médico  ')

    expect(ok).toBe(true)
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/status = 'justificado'/)

    // Justificativa deve ser trimada
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params[0]).toBe('Atestado médico')
  })

  it('retorna false quando frequência não encontrada', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const ok = await justificarFalta('f-inexistente', 'Motivo')
    expect(ok).toBe(false)
  })
})

// =============================================================================
// buscarFrequenciaHoraAula
// =============================================================================

describe('buscarFrequenciaHoraAula', () => {
  it('retorna horários, frequências, alunos e badges faciais', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ numero_aula: 1, disciplina_nome: 'Matemática' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'a1', nome: 'Ana' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [{ aluno_id: 'a1' }], rowCount: 1 } as any) // facial

    const result = await buscarFrequenciaHoraAula('t1', '2026-06-20')

    expect(result.horarios).toHaveLength(1)
    expect(result.alunos).toHaveLength(1)
    expect(result.alunos_chegaram_facial).toContain('a1')
    expect(result.chegadas_facial).toHaveLength(1)
  })

  it('executa 4 queries em paralelo (sem N+1)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarFrequenciaHoraAula('t1', '2026-06-21')

    // 4 queries em Promise.all
    expect(mockQuery).toHaveBeenCalledTimes(4)
  })
})

// =============================================================================
// registrarFrequenciaHoraAula
// =============================================================================

describe('registrarFrequenciaHoraAula', () => {
  const dataOntem = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  it('registra frequência por hora-aula e retorna contagem', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any)
    mockClient.query.mockResolvedValueOnce({ rowCount: 2 } as any)

    const count = await registrarFrequenciaHoraAula(
      't1', dataOntem, 1, 'disc-1',
      [{ aluno_id: 'a1', presente: true }, { aluno_id: 'a2', presente: false }],
      'u1'
    )

    expect(count).toBe(2)
    const insertSql = mockClient.query.mock.calls[0][0] as string
    expect(insertSql).toMatch(/INSERT INTO frequencia_hora_aula/)
  })

  it('retorna 0 quando lista de registros é vazia', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ escola_id: 'e1' }], rowCount: 1 } as any)

    const count = await registrarFrequenciaHoraAula('t1', dataOntem, 1, 'disc-1', [], 'u1')

    expect(count).toBe(0)
  })

  it('lança erro quando data é futura', async () => {
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)

    await expect(
      registrarFrequenciaHoraAula('t1', amanha.toISOString().slice(0, 10), 1, 'disc-1', [{ aluno_id: 'a1', presente: true }], 'u1')
    ).rejects.toThrow('data futura')
  })

  it('lança erro quando turma não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await expect(
      registrarFrequenciaHoraAula('t-inexistente', dataOntem, 1, 'd1', [{ aluno_id: 'a1', presente: true }], 'u1')
    ).rejects.toThrow('Turma não encontrada')
  })
})
