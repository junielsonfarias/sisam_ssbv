/**
 * Testes unitários — lib/services/turmas.service.ts
 *
 * Cobre: buscarAlunosDaTurma, buscarTurmasDoProfessor, buscarStatusSemanalDasTurmas,
 *        professorEstaVinculadoNaTurma, buscarAnoLetivoAtivo, buscarAnosLetivosDoProfessor,
 *        buscarTurmaComEscola, verificarAlunosAtivos.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mocks --

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn(), connect: vi.fn() },
}))

import pool from '@/database/connection'
import {
  buscarAlunosDaTurma,
  buscarTurmasDoProfessor,
  buscarStatusSemanalDasTurmas,
  professorEstaVinculadoNaTurma,
  buscarAnoLetivoAtivo,
  buscarAnosLetivosDoProfessor,
  buscarTurmaComEscola,
  verificarAlunosAtivos,
} from '@/lib/services/turmas.service'

const mockQuery = vi.mocked(pool.query)

beforeEach(() => {
  vi.clearAllMocks()
})

// =============================================================================
// buscarAlunosDaTurma
// =============================================================================

describe('buscarAlunosDaTurma', () => {
  it('retorna lista de alunos ordenados (transferidos por último)', async () => {
    const alunos = [
      { id: 'a1', nome: 'Ana', situacao: 'cursando' },
      { id: 'a2', nome: 'Bob', situacao: 'transferido' },
    ]
    mockQuery.mockResolvedValueOnce({ rows: alunos, rowCount: 2 } as any)

    const result = await buscarAlunosDaTurma('t1')

    expect(result).toHaveLength(2)
    const sql = mockQuery.mock.calls[0][0] as string
    // Inclui transferidos/inativos (sem filtro ativo=true)
    expect(sql).not.toMatch(/ativo = true/)
    expect(sql).toMatch(/transferido/)
    expect(mockQuery.mock.calls[0][1]).toEqual(['t1'])
  })

  it('retorna lista vazia quando turma não tem alunos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const result = await buscarAlunosDaTurma('turma-vazia')
    expect(result).toEqual([])
  })
})

// =============================================================================
// buscarTurmasDoProfessor
// =============================================================================

describe('buscarTurmasDoProfessor', () => {
  it('usa ano letivo ativo quando não fornecido', async () => {
    // 1ª query: buscarAnoLetivoAtivo
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026' }], rowCount: 1 } as any)
      // 2ª query: turmas do professor
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarTurmasDoProfessor('prof-1')

    expect(mockQuery).toHaveBeenCalledTimes(2)
    const params2 = mockQuery.mock.calls[1][1] as unknown[]
    expect(params2).toContain('2026')
  })

  it('usa ano letivo fornecido (não busca o ativo)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarTurmasDoProfessor('prof-1', '2025')

    // Apenas 1 query (sem buscar o ano ativo)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    expect(mockQuery.mock.calls[0][1]).toContain('2025')
  })

  it('retorna turmas com dados completos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({
        rows: [{
          vinculo_id: 'v1', tipo_vinculo: 'polivalente', ano_letivo: '2026',
          turma_id: 't1', turma_nome: '1ºA', serie: '1', turno: 'manha',
          turma_codigo: '1A', escola_id: 'e1', escola_nome: 'EMEF X',
          disciplina_id: null, disciplina_nome: null, total_alunos: '25',
        }],
        rowCount: 1,
      } as any)

    const result = await buscarTurmasDoProfessor('prof-1')

    expect(result).toHaveLength(1)
    expect(result[0].turma_nome).toBe('1ºA')
  })

  it('query cruza pt.ano_letivo = t.ano_letivo (vínculos legados não aparecem)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ano: '2026' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)

    await buscarTurmasDoProfessor('prof-1')

    const sql = mockQuery.mock.calls[1][0] as string
    expect(sql).toMatch(/pt\.ano_letivo = t\.ano_letivo/)
  })
})

// =============================================================================
// buscarStatusSemanalDasTurmas
// =============================================================================

describe('buscarStatusSemanalDasTurmas', () => {
  it('retorna mapa vazio quando lista de turmas é vazia', async () => {
    const mapa = await buscarStatusSemanalDasTurmas([])
    expect(mapa.size).toBe(0)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('status "em_dia" quando dias_lancados >= dias_letivos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ turma_id: 't1', dias_letivos: 5, dias_lancados: 5 }],
      rowCount: 1,
    } as any)

    const mapa = await buscarStatusSemanalDasTurmas(['t1'])

    expect(mapa.get('t1')).toEqual({ dias_letivos: 5, dias_lancados: 5, status: 'em_dia' })
  })

  it('status "pendente" quando dias_lancados > 0 mas < dias_letivos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ turma_id: 't1', dias_letivos: 5, dias_lancados: 3 }],
      rowCount: 1,
    } as any)

    const mapa = await buscarStatusSemanalDasTurmas(['t1'])

    expect(mapa.get('t1')!.status).toBe('pendente')
  })

  it('status "sem_lancamento" quando dias_lancados = 0 mas há dias letivos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ turma_id: 't1', dias_letivos: 3, dias_lancados: 0 }],
      rowCount: 1,
    } as any)

    const mapa = await buscarStatusSemanalDasTurmas(['t1'])

    expect(mapa.get('t1')!.status).toBe('sem_lancamento')
  })

  it('status "sem_letivos" quando dias_letivos = 0 (semana de feriado)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ turma_id: 't1', dias_letivos: 0, dias_lancados: 0 }],
      rowCount: 1,
    } as any)

    const mapa = await buscarStatusSemanalDasTurmas(['t1'])

    expect(mapa.get('t1')!.status).toBe('sem_letivos')
  })

  it('processa múltiplas turmas em uma única query (sem N+1)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { turma_id: 't1', dias_letivos: 5, dias_lancados: 5 },
        { turma_id: 't2', dias_letivos: 5, dias_lancados: 0 },
        { turma_id: 't3', dias_letivos: 0, dias_lancados: 0 },
      ],
      rowCount: 3,
    } as any)

    const mapa = await buscarStatusSemanalDasTurmas(['t1', 't2', 't3'])

    expect(mapa.size).toBe(3)
    expect(mapa.get('t1')!.status).toBe('em_dia')
    expect(mapa.get('t2')!.status).toBe('sem_lancamento')
    expect(mapa.get('t3')!.status).toBe('sem_letivos')
    // Uma única query (sem N+1)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
// professorEstaVinculadoNaTurma
// =============================================================================

describe('professorEstaVinculadoNaTurma', () => {
  it('retorna true quando há vínculo ativo no ano da turma', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ 1: 1 }], rowCount: 1 } as any)
    const ok = await professorEstaVinculadoNaTurma('prof-1', 't1', '2026')
    expect(ok).toBe(true)
  })

  it('retorna false quando não há vínculo ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const ok = await professorEstaVinculadoNaTurma('prof-X', 't1', '2026')
    expect(ok).toBe(false)
  })

  it('query inclui pt.ativo=true e ano_letivo da turma (segurança anti-vínculo legado)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    await professorEstaVinculadoNaTurma('prof-1', 't1', '2025')
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/ativo = true/)
    expect(sql).toMatch(/ano_letivo/)
    const params = mockQuery.mock.calls[0][1] as unknown[]
    expect(params).toContain('2025')
  })
})

// =============================================================================
// buscarAnoLetivoAtivo
// =============================================================================

describe('buscarAnoLetivoAtivo', () => {
  it('retorna o ano marcado como ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ano: '2026' }], rowCount: 1 } as any)
    const ano = await buscarAnoLetivoAtivo()
    expect(ano).toBe('2026')
  })

  it('faz fallback para ano corrente quando não há ano ativo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const ano = await buscarAnoLetivoAtivo()
    expect(ano).toBe(new Date().getFullYear().toString())
  })

  it('faz fallback para ano corrente quando tabela não existe (catch)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('relation "anos_letivos" does not exist'))
    const ano = await buscarAnoLetivoAtivo()
    expect(ano).toBe(new Date().getFullYear().toString())
  })
})

// =============================================================================
// buscarAnosLetivosDoProfessor
// =============================================================================

describe('buscarAnosLetivosDoProfessor', () => {
  it('retorna anos em ordem decrescente com status', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ ano: '2026', status: 'ativo' }, { ano: '2025', status: 'finalizado' }],
      rowCount: 2,
    } as any)

    const result = await buscarAnosLetivosDoProfessor('prof-1')

    expect(result).toHaveLength(2)
    expect(result[0].ano).toBe('2026')
    expect(result[0].status).toBe('ativo')
  })

  it('faz fallback sem status quando tabela anos_letivos não existe', async () => {
    mockQuery
      .mockRejectedValueOnce(new Error('relation "anos_letivos" does not exist'))
      .mockResolvedValueOnce({
        rows: [{ ano: '2026' }, { ano: '2025' }],
        rowCount: 2,
      } as any)

    const result = await buscarAnosLetivosDoProfessor('prof-1')

    expect(result).toHaveLength(2)
    expect(result[0].status).toBeNull()
    expect(result[1].status).toBeNull()
  })
})

// =============================================================================
// buscarTurmaComEscola
// =============================================================================

describe('buscarTurmaComEscola', () => {
  it('retorna turma com dados de escola e polo', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 't1', codigo: '1A', nome: '1º Ano A', serie: '1', ano_letivo: '2026',
        escola_id: 'e1', escola_nome: 'EMEF X', polo_id: 'p1', polo_nome: 'Polo Norte',
        multiserie: false, multietapa: false,
      }],
      rowCount: 1,
    } as any)

    const result = await buscarTurmaComEscola('t1')

    expect(result).not.toBeNull()
    expect(result!.escola_nome).toBe('EMEF X')
    expect(result!.polo_nome).toBe('Polo Norte')
    expect(result!.multiserie).toBe(false)
  })

  it('retorna null quando turma não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const result = await buscarTurmaComEscola('turma-inexistente')
    expect(result).toBeNull()
  })
})

// =============================================================================
// verificarAlunosAtivos
// =============================================================================

describe('verificarAlunosAtivos', () => {
  it('retorna total de alunos ativos na turma', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '12' }], rowCount: 1 } as any)
    const total = await verificarAlunosAtivos('t1')
    expect(total).toBe(12)
  })

  it('retorna 0 quando não há alunos ativos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
    const total = await verificarAlunosAtivos('t-vazia')
    expect(total).toBe(0)
  })

  it('query filtra ativo=true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 } as any)
    await verificarAlunosAtivos('t1')
    const sql = mockQuery.mock.calls[0][0] as string
    expect(sql).toMatch(/ativo = true/)
  })
})
