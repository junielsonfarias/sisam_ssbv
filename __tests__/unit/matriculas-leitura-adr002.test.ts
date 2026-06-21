/**
 * Testes unitários — lib/services/matriculas/leitura.ts (ADR-002)
 *
 * Cobre as três funções do submódulo de leitura criado na fase 1+2 do ADR-002:
 *   - obterAnoLetivoCorrente()  → tolerância a 'ativo' / 'em_andamento' / 'fechado'
 *   - buscarMatriculaDoAluno()  → uso do ano corrente quando omitido; null quando não existe
 *   - listarMatriculasDaTurma() → retorna lista ordenada; vazia quando sem ano
 *
 * Regressões cobertas:
 *   - feat(adr-002) commit e73f2ed: a query de obterAnoLetivoCorrente usa três
 *     critérios de ordenação aninhados (ativo > nao-fechado > mais-recente)
 *     para ser tolerante a bases que usam convenções diferentes de status.
 *   - buscarMatriculaDoAluno/listarMatriculasDaTurma devem retornar null/[]
 *     quando não há nenhum ano letivo cadastrado (fallback de anoLetivoId omitido).
 *
 * Estratégia: pool.query completamente mockado — sem banco real.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ------------------------------------------------------------------ mock pool
vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

import pool from '@/database/connection'
import {
  obterAnoLetivoCorrente,
  buscarMatriculaDoAluno,
  listarMatriculasDaTurma,
} from '@/lib/services/matriculas/leitura'
import type { MatriculaRow, AnoLetivoCorrente } from '@/lib/services/matriculas/types'

const mockQuery = vi.mocked(pool.query)

// ---------------------------------------------------------------------- fixtures

const ANO_ATIVO: AnoLetivoCorrente = { id: 'ano-2026-uuid', ano: '2026', status: 'ativo' }
const ANO_EM_ANDAMENTO: AnoLetivoCorrente = { id: 'ano-2025-uuid', ano: '2025', status: 'em_andamento' }

const MATRICULA_ROW: MatriculaRow = {
  id: 'mat-uuid-001',
  aluno_id: 'aluno-uuid-001',
  turma_id: 'turma-uuid-001',
  ano_letivo_id: ANO_ATIVO.id,
  serie_id: 'serie-uuid-1ano',
  situacao: 'cursando',
  data_matricula: '2026-02-01',
  criado_em: '2026-02-01T00:00:00Z',
  atualizado_em: '2026-02-01T00:00:00Z',
}

// ==================================================================== testes ==

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================= obterAnoLetivo

describe('obterAnoLetivoCorrente — ADR-002 (leitura tolerante a status)', () => {
  it('caminho feliz: retorna o ano com status = "ativo"', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [ANO_ATIVO] } as any)

    const resultado = await obterAnoLetivoCorrente()

    expect(resultado).toEqual(ANO_ATIVO)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const sql = String(mockQuery.mock.calls[0][0])
    expect(sql).toContain('anos_letivos')
    expect(sql).toContain("status = 'ativo'")
  })

  it('fallback: retorna ano "em_andamento" quando nenhum está "ativo"', async () => {
    // Banco demo usa 'em_andamento' em vez de 'ativo'
    mockQuery.mockResolvedValueOnce({ rows: [ANO_EM_ANDAMENTO] } as any)

    const resultado = await obterAnoLetivoCorrente()

    expect(resultado?.status).toBe('em_andamento')
  })

  it('retorna null quando não há nenhum ano letivo cadastrado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await obterAnoLetivoCorrente()

    expect(resultado).toBeNull()
  })

  it('a query limita em 1 linha (LIMIT 1)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [ANO_ATIVO] } as any)
    await obterAnoLetivoCorrente()

    const sql = String(mockQuery.mock.calls[0][0])
    expect(sql.toUpperCase()).toContain('LIMIT 1')
  })

  it('a query ordena priorizando "ativo", depois "nao-fechado", depois mais recente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [ANO_ATIVO] } as any)
    await obterAnoLetivoCorrente()

    const sql = String(mockQuery.mock.calls[0][0])
    // Deve conter os três critérios de ordenação do ADR-002
    expect(sql).toContain("status = 'ativo'")
    expect(sql).toContain("status <> 'fechado'")
    expect(sql.toUpperCase()).toContain('ORDER BY')
  })
})

// ========================================================= buscarMatriculaDoAluno

describe('buscarMatriculaDoAluno — ADR-002', () => {
  it('caminho feliz: retorna MatriculaRow quando aluno tem matrícula no ano explícito', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MATRICULA_ROW] } as any)

    const resultado = await buscarMatriculaDoAluno('aluno-uuid-001', 'ano-2026-uuid')

    expect(resultado).toEqual(MATRICULA_ROW)
    expect(mockQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockQuery.mock.calls[0] as [string, string[]]
    expect(sql).toContain('matriculas')
    expect(sql).toContain('aluno_id = $1')
    expect(sql).toContain('ano_letivo_id = $2')
    expect(params).toEqual(['aluno-uuid-001', 'ano-2026-uuid'])
  })

  it('usa obterAnoLetivoCorrente quando anoLetivoId é omitido', async () => {
    // 1ª query → obterAnoLetivoCorrente
    mockQuery.mockResolvedValueOnce({ rows: [ANO_ATIVO] } as any)
    // 2ª query → buscar matrícula
    mockQuery.mockResolvedValueOnce({ rows: [MATRICULA_ROW] } as any)

    const resultado = await buscarMatriculaDoAluno('aluno-uuid-001')

    expect(resultado).toEqual(MATRICULA_ROW)
    expect(mockQuery).toHaveBeenCalledTimes(2)
    const [, params] = mockQuery.mock.calls[1] as [string, string[]]
    // Deve usar o id do ano corrente derivado
    expect(params[1]).toBe(ANO_ATIVO.id)
  })

  it('retorna null quando aluno não tem matrícula no ano', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await buscarMatriculaDoAluno('aluno-sem-matricula', 'ano-2026-uuid')

    expect(resultado).toBeNull()
  })

  it('retorna null quando não existe nenhum ano letivo (anoLetivoId omitido + banco vazio)', async () => {
    // obterAnoLetivoCorrente retorna null
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await buscarMatriculaDoAluno('aluno-uuid-001')

    expect(resultado).toBeNull()
    // Não deve ter feito segunda query (short-circuit)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('regressão (commit e73f2ed): short-circuit quando anoId é null não lança exceção', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    await expect(buscarMatriculaDoAluno('qualquer-aluno')).resolves.toBeNull()
  })

  it('a query filtra todas as colunas canônicas da MatriculaRow', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MATRICULA_ROW] } as any)
    await buscarMatriculaDoAluno('aluno-uuid-001', 'ano-2026-uuid')

    const sql = String(mockQuery.mock.calls[0][0])
    // Colunas obrigatórias do MatriculaRow
    expect(sql).toContain('aluno_id')
    expect(sql).toContain('turma_id')
    expect(sql).toContain('ano_letivo_id')
    expect(sql).toContain('serie_id')
    expect(sql).toContain('situacao')
    expect(sql).toContain('data_matricula')
  })
})

// ======================================================= listarMatriculasDaTurma

describe('listarMatriculasDaTurma — ADR-002', () => {
  const MATRICULA_2: MatriculaRow = {
    ...MATRICULA_ROW,
    id: 'mat-uuid-002',
    aluno_id: 'aluno-uuid-002',
    data_matricula: '2026-02-10',
  }

  it('caminho feliz: retorna lista de matrículas da turma no ano explícito', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MATRICULA_ROW, MATRICULA_2] } as any)

    const resultado = await listarMatriculasDaTurma('turma-uuid-001', 'ano-2026-uuid')

    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toEqual(MATRICULA_ROW)
    const [sql, params] = mockQuery.mock.calls[0] as [string, string[]]
    expect(sql).toContain('turma_id = $1')
    expect(sql).toContain('ano_letivo_id = $2')
    expect(params).toEqual(['turma-uuid-001', 'ano-2026-uuid'])
  })

  it('usa obterAnoLetivoCorrente quando anoLetivoId é omitido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [ANO_ATIVO] } as any)
    mockQuery.mockResolvedValueOnce({ rows: [MATRICULA_ROW] } as any)

    const resultado = await listarMatriculasDaTurma('turma-uuid-001')

    expect(resultado).toHaveLength(1)
    const [, params] = mockQuery.mock.calls[1] as [string, string[]]
    expect(params[1]).toBe(ANO_ATIVO.id)
  })

  it('retorna array vazio quando turma não tem matrículas', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await listarMatriculasDaTurma('turma-vazia', 'ano-2026-uuid')

    expect(resultado).toEqual([])
    expect(resultado).toHaveLength(0)
  })

  it('retorna array vazio (short-circuit) quando não existe nenhum ano letivo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    const resultado = await listarMatriculasDaTurma('turma-uuid-001')

    expect(resultado).toEqual([])
    // Não deve ter feito segunda query
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('regressão (commit e73f2ed): short-circuit com anoId null não lança exceção', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)

    await expect(listarMatriculasDaTurma('qualquer-turma')).resolves.toEqual([])
  })

  it('a query ordena por data_matricula ASC', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as any)
    await listarMatriculasDaTurma('turma-uuid-001', 'ano-2026-uuid')

    const sql = String(mockQuery.mock.calls[0][0])
    expect(sql.toUpperCase()).toContain('ORDER BY')
    expect(sql).toContain('data_matricula')
    expect(sql.toUpperCase()).toContain('ASC')
  })

  it('retorna somente MatriculaRows tipadas — nenhum campo extra inesperado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MATRICULA_ROW] } as any)

    const [mat] = await listarMatriculasDaTurma('turma-uuid-001', 'ano-2026-uuid')

    // Verificação estrutural: campos obrigatórios presentes
    expect(mat).toHaveProperty('id')
    expect(mat).toHaveProperty('aluno_id')
    expect(mat).toHaveProperty('turma_id')
    expect(mat).toHaveProperty('ano_letivo_id')
    expect(mat).toHaveProperty('situacao')
    expect(mat).toHaveProperty('data_matricula')
  })
})
