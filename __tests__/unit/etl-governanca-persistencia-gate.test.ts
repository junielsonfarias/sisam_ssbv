/**
 * FIX 1 (ADR) — Persistência de divergências no gate estrito do ETL.
 *
 * Regressão do bug em que, no modo estrito, divergências de aluno/turma NÃO
 * persistiam. A causa era a frase longa (~103 chars) gravada em
 * divergencias_historico.acao_realizada (antes varchar(100)): o INSERT falhava
 * com "value too long" e o erro era ENGOLIDO silenciosamente pelo try/catch de
 * registrarHistorico.
 *
 * Diferente de etl-governanca-adr001.test.ts (que mocka registrarHistorico),
 * AQUI exercitamos a cadeia REAL:
 *   registrarMestreAusente -> registrarHistorico -> pool.query(INSERT ...)
 * para provar que:
 *   - 1 registro é persistido em divergencias_historico (INSERT chamado);
 *   - a acao_realizada gravada respeita o limite seguro (<= 255 chars);
 *   - quando o INSERT falha, o erro é LOGADO (unmask) e não derruba a importação.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/database/connection', () => ({
  default: { query: vi.fn() },
}))

const { mockLogError } = vi.hoisted(() => ({ mockLogError: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: mockLogError,
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

import pool from '@/database/connection'
import { registrarMestreAusente, registrarMestreCriado } from '@/lib/services/importacao/governanca'

const mockPool = vi.mocked(pool)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FIX 1 — persistência de divergência no gate estrito (cadeia real)', () => {
  it('aluno fantasma: persiste 1 registro em divergencias_historico', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await registrarMestreAusente({
      entidade: 'aluno',
      nome: 'Maria de Fátima dos Santos Albuquerque Nascimento',
      escolaNome: 'Escola Municipal de Ensino Fundamental Professora Exemplo',
      turmaCodigo: '5A',
      poloNome: 'Polo Central',
      anoLetivo: '2026',
      importacaoId: 'imp-uuid-001',
      usuarioId: 'user-uuid-001',
    })

    // 1 INSERT efetivamente executado (a divergência persistiu).
    expect(mockPool.query).toHaveBeenCalledTimes(1)
    const [sql, params] = mockPool.query.mock.calls[0]
    expect(String(sql)).toContain('INSERT INTO divergencias_historico')

    // acao_realizada é o 10º parâmetro do INSERT (índice 9).
    const acaoRealizada = params![9] as string
    expect(typeof acaoRealizada).toBe('string')
    expect(acaoRealizada.length).toBeLessThanOrEqual(255)
    expect(acaoRealizada).toContain('gate estrito')
  })

  it('turma fantasma: persiste 1 registro e descreve o gate estrito', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await registrarMestreAusente({
      entidade: 'turma',
      nome: '9º ANO B - VESPERTINO - ENSINO FUNDAMENTAL ANOS FINAIS',
      escolaNome: 'Escola Modelo',
      turmaCodigo: '9B',
      anoLetivo: '2026',
      importacaoId: 'imp-uuid-002',
      usuarioId: 'user-uuid-002',
    })

    expect(mockPool.query).toHaveBeenCalledTimes(1)
    const [sql] = mockPool.query.mock.calls[0]
    expect(String(sql)).toContain('INSERT INTO divergencias_historico')
  })

  it('mestre criado com nome longo: acao_realizada truncada (<= 255)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await registrarMestreCriado({
      entidade: 'turma',
      entidadeId: 'turma-uuid',
      nome: 'X'.repeat(400),
      escolaNome: 'Escola Modelo',
      anoLetivo: '2026',
      importacaoId: 'imp-uuid-003',
      usuarioId: 'user-uuid-003',
    })

    expect(mockPool.query).toHaveBeenCalledTimes(1)
    const [, params] = mockPool.query.mock.calls[0]
    const acaoRealizada = params![9] as string
    expect(acaoRealizada.length).toBeLessThanOrEqual(255)
  })

  it('unmask: falha do INSERT é logada com severidade alta e não derruba o ETL', async () => {
    mockPool.query.mockRejectedValueOnce(
      new Error('value too long for type character varying(100)')
    )

    // governanca tolera a falha (não propaga) — mas registrarHistorico já
    // logou o erro (não foi mais engolido silenciosamente).
    await expect(
      registrarMestreAusente({
        entidade: 'aluno',
        nome: 'Aluno Fantasma',
        importacaoId: 'imp-uuid-004',
        usuarioId: 'user-uuid-004',
      })
    ).resolves.not.toThrow()

    // O erro foi LOGADO (unmask) em algum ponto da cadeia.
    expect(mockLogError).toHaveBeenCalled()
  })
})
