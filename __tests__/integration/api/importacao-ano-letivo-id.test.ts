/**
 * Chave temporal canonica (ano_letivo varchar -> anos_letivos.id) na ESCRITA.
 *
 * Regressao do ciclo 6: as duas portas de escrita do mestre precisam preencher
 * `ano_letivo_id` na origem, senao o backfill e efemero (a fonte unica volta a
 * produzir a chave canonica vazia a cada importacao).
 *
 * Cobre (mockando pool.query):
 *   - resolverAnoLetivoId: lookup centralizado + cache por ano + null sem erro.
 *   - Porta 2 ETL (batch.ts): criarTurmas e criarAlunos gravam ano_letivo_id
 *     resolvido (INSERT/UPSERT e UPDATE de aluno existente).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

import pool from '@/database/connection'
import { resolverAnoLetivoId } from '@/lib/services/gestor/mestre.service'
import { criarTurmas, criarAlunos } from '@/lib/services/importacao/batch'
import type {
  ImportacaoResultado,
  TurmaParaInserir,
  AlunoParaInserir,
} from '@/lib/services/importacao/types'

const mockPool = vi.mocked(pool)

const ANO_ID_2026 = 'ano-2026-uuid'

function novoResultado(): ImportacaoResultado {
  return {
    polos: { criados: 0, existentes: 0 },
    escolas: { criados: 0, existentes: 0, divergentes: 0 },
    turmas: { criados: 0, existentes: 0, divergentes: 0 },
    alunos: { criados: 0, existentes: 0, divergentes: 0 },
    questoes: { criadas: 0, existentes: 0 },
    resultados: { processados: 0, erros: 0, duplicados: 0, novos: 0 },
  }
}

/** Captura os parametros do INSERT/UPDATE alvo (1a query cujo SQL casa). */
function paramsDe(predicado: (sql: string) => boolean): unknown[] | null {
  for (const call of mockPool.query.mock.calls) {
    const sql = String(call[0])
    if (predicado(sql)) return (call[1] as unknown[]) ?? []
  }
  return null
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolverAnoLetivoId (lookup centralizado)', () => {
  it('resolve o uuid casando anos_letivos.ano = btrim(varchar)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: ANO_ID_2026 }] } as any)
    const id = await resolverAnoLetivoId(pool as any, '2026')
    expect(id).toBe(ANO_ID_2026)
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('usa o cache por ano: nao repete a query para o mesmo ano', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: ANO_ID_2026 }] } as any)
    const cache = new Map<string, string | null>()
    const a = await resolverAnoLetivoId(pool as any, '2026', cache)
    const b = await resolverAnoLetivoId(pool as any, '2026', cache)
    expect(a).toBe(ANO_ID_2026)
    expect(b).toBe(ANO_ID_2026)
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('retorna null (sem lancar) quando o ano nao existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    const id = await resolverAnoLetivoId(pool as any, '1999')
    expect(id).toBeNull()
  })

  it('retorna null para ano vazio sem consultar o banco', async () => {
    const id = await resolverAnoLetivoId(pool as any, '   ')
    expect(id).toBeNull()
    expect(mockPool.query).not.toHaveBeenCalled()
  })
})

describe('Porta 2 ETL (batch.ts) grava ano_letivo_id', () => {
  it('criarTurmas: INSERT inclui coluna ano_letivo_id com o uuid resolvido', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) {
        return { rows: [{ id: ANO_ID_2026 }] } as any
      }
      if (texto.includes('INSERT INTO turmas')) {
        return { rows: [{ id: 'turma-real-1', codigo: '5A', escola_id: 'esc-1', ano_letivo: '2026' }] } as any
      }
      return { rows: [] } as any
    }) as any)

    const turmas: TurmaParaInserir[] = [
      {
        tempId: 'TEMP_TURMA_0',
        codigo: '5A',
        nome: '5A',
        escola_id: 'esc-1',
        serie: '5',
        ano_letivo: '2026',
        origem: 'sisam_etl',
        origem_importacao_id: 'imp-1',
      },
    ]

    await criarTurmas(turmas, [], [], [])

    const insertSql = mockPool.query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes('INSERT INTO turmas'))
    expect(insertSql).toContain('ano_letivo_id')

    const params = paramsDe((s) => s.includes('INSERT INTO turmas'))
    expect(params).not.toBeNull()
    expect(params).toContain(ANO_ID_2026)
  })

  it('criarAlunos: INSERT de aluno novo inclui ano_letivo_id resolvido', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) {
        return { rows: [{ id: ANO_ID_2026 }] } as any
      }
      // lookup de alunos existentes (VALUES CTE) -> nenhum existente
      if (texto.includes('INNER JOIN (VALUES')) {
        return { rows: [] } as any
      }
      if (texto.includes('INSERT INTO alunos')) {
        return { rows: [{ id: 'aluno-real-1', codigo: 'ALU0001', nome: 'Maria' }] } as any
      }
      return { rows: [] } as any
    }) as any)

    const alunos: AlunoParaInserir[] = [
      {
        tempId: 'TEMP_ALUNO_0',
        codigo: 'ALU0001',
        nome: 'Maria',
        escola_id: 'esc-1',
        turma_id: 'turma-real-1',
        serie: '5',
        ano_letivo: '2026',
        origem: 'sisam_etl',
        origem_importacao_id: 'imp-1',
      },
    ]
    const resultado = novoResultado()

    await criarAlunos(alunos, [], [], [], resultado, [])

    const insertSql = mockPool.query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes('INSERT INTO alunos'))
    expect(insertSql).toContain('ano_letivo_id')

    const params = paramsDe((s) => s.includes('INSERT INTO alunos'))
    expect(params).not.toBeNull()
    expect(params).toContain(ANO_ID_2026)
    expect(resultado.alunos.criados).toBe(1)
  })

  it('criarAlunos: UPDATE de aluno existente cura ano_letivo_id (linha legada NULL)', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) {
        return { rows: [{ id: ANO_ID_2026 }] } as any
      }
      // lookup de alunos existentes -> aluno ja existe
      if (texto.includes('INNER JOIN (VALUES')) {
        return {
          rows: [
            {
              id: 'aluno-existente-1',
              nome_norm: 'MARIA',
              escola_id: 'esc-1',
              turma_id: 'turma-real-1',
              ano_letivo: '2026',
            },
          ],
        } as any
      }
      return { rows: [] } as any
    }) as any)

    const alunos: AlunoParaInserir[] = [
      {
        tempId: 'TEMP_ALUNO_0',
        codigo: 'ALU0001',
        nome: 'Maria',
        escola_id: 'esc-1',
        turma_id: 'turma-real-1',
        serie: '5',
        ano_letivo: '2026',
        origem: 'sisam_etl',
        origem_importacao_id: 'imp-1',
      },
    ]
    const resultado = novoResultado()

    await criarAlunos(alunos, [], [], [], resultado, [])

    const updateSql = mockPool.query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes('UPDATE alunos') && s.includes('ano_letivo_id'))
    expect(updateSql).toBeTruthy()

    const params = paramsDe((s) => s.includes('UPDATE alunos') && s.includes('ano_letivo_id'))
    expect(params).not.toBeNull()
    expect(params).toContain(ANO_ID_2026)
    expect(resultado.alunos.existentes).toBe(1)
  })
})
