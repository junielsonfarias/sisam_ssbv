/**
 * Chave canonica de serie (serie varchar -> series_escolares.id) na ESCRITA.
 *
 * ADR-004 (fonte canonica de series): as portas de escrita do mestre precisam
 * preencher `serie_id` na origem, senao o backfill e efemero (a fonte unica volta
 * a produzir a chave canonica vazia a cada importacao). Mesmo padrao do
 * `ano_letivo_id` (ciclo 6).
 *
 * Cobre (mockando pool.query):
 *   - resolverSerieId: lookup centralizado (nome/codigo) + cache por serie + null sem erro.
 *   - Porta 2 ETL (batch.ts): criarTurmas e criarAlunos gravam serie_id resolvido
 *     (INSERT/UPSERT e UPDATE de aluno existente).
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
import { resolverSerieId } from '@/lib/services/gestor/mestre.service'
import { criarTurmas, criarAlunos } from '@/lib/services/importacao/batch'
import type {
  ImportacaoResultado,
  TurmaParaInserir,
  AlunoParaInserir,
} from '@/lib/services/importacao/types'

const mockPool = vi.mocked(pool)

const SERIE_ID_5 = 'serie-5-uuid'
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

describe('resolverSerieId (lookup centralizado — ADR-004)', () => {
  it('resolve o uuid casando series_escolares por nome OU codigo', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_ID_5 }] } as any)
    const id = await resolverSerieId(pool as any, '5')
    expect(id).toBe(SERIE_ID_5)
    expect(mockPool.query).toHaveBeenCalledTimes(1)
    const sql = String(mockPool.query.mock.calls[0][0])
    expect(sql).toContain('series_escolares')
  })

  it('usa o cache por serie: nao repete a query para a mesma serie', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: SERIE_ID_5 }] } as any)
    const cache = new Map<string, string | null>()
    const a = await resolverSerieId(pool as any, '5º Ano', cache)
    const b = await resolverSerieId(pool as any, '5º Ano', cache)
    expect(a).toBe(SERIE_ID_5)
    expect(b).toBe(SERIE_ID_5)
    expect(mockPool.query).toHaveBeenCalledTimes(1)
  })

  it('retorna null (sem lancar) quando a serie nao casa com o catalogo', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] } as any)
    const id = await resolverSerieId(pool as any, 'Serie Inexistente')
    expect(id).toBeNull()
  })

  it('retorna null para serie vazia sem consultar o banco', async () => {
    const id = await resolverSerieId(pool as any, '   ')
    expect(id).toBeNull()
    expect(mockPool.query).not.toHaveBeenCalled()
  })
})

describe('Porta 2 ETL (batch.ts) grava serie_id', () => {
  it('criarTurmas: INSERT inclui coluna serie_id com o uuid resolvido', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) {
        return { rows: [{ id: ANO_ID_2026 }] } as any
      }
      if (texto.includes('FROM series_escolares')) {
        return { rows: [{ id: SERIE_ID_5 }] } as any
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
    expect(insertSql).toContain('serie_id')

    const params = paramsDe((s) => s.includes('INSERT INTO turmas'))
    expect(params).not.toBeNull()
    expect(params).toContain(SERIE_ID_5)
  })

  it('criarAlunos: INSERT de aluno novo inclui serie_id resolvido', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) {
        return { rows: [{ id: ANO_ID_2026 }] } as any
      }
      if (texto.includes('FROM series_escolares')) {
        return { rows: [{ id: SERIE_ID_5 }] } as any
      }
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
    expect(insertSql).toContain('serie_id')

    const params = paramsDe((s) => s.includes('INSERT INTO alunos'))
    expect(params).not.toBeNull()
    expect(params).toContain(SERIE_ID_5)
    expect(resultado.alunos.criados).toBe(1)
  })

  it('criarAlunos: UPDATE de aluno existente cura serie_id (linha legada NULL)', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) {
        return { rows: [{ id: ANO_ID_2026 }] } as any
      }
      if (texto.includes('FROM series_escolares')) {
        return { rows: [{ id: SERIE_ID_5 }] } as any
      }
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
      .find((s) => s.includes('UPDATE alunos') && s.includes('serie_id'))
    expect(updateSql).toBeTruthy()

    const params = paramsDe((s) => s.includes('UPDATE alunos') && s.includes('serie_id'))
    expect(params).not.toBeNull()
    expect(params).toContain(SERIE_ID_5)
    expect(resultado.alunos.existentes).toBe(1)
  })
})
