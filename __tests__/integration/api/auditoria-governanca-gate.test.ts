/**
 * Rede de seguranca da governanca ETL -> Gestor (auditoria continua do gate).
 *
 * Prova, mockando pool.query, que a auditoria:
 *   - conta o cadastro mestre por origem (gestor/sisam_etl/seed/outros);
 *   - levanta alerta quando ha origem='sisam_etl' nao assumido (> 0);
 *   - levanta alerta quando o gate sai do modo 'estrito' (ETL_GATE_MESTRE);
 *   - fica verde (sem alerta) quando tudo e 'gestor' e o gate esta 'estrito'.
 *
 * Complementa importacao-gate-mestre.test.ts (que prova o gate em TEMPO de
 * importacao). Aqui auditamos o ESTADO do banco.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
import { auditarGovernancaGate } from '@/lib/services/importacao/auditoria-governanca'

const mockPool = vi.mocked(pool)

/**
 * Roteia as contagens por tabela mestre. Cada tabela responde linhas
 * {origem, total} como faz o GROUP BY origem real.
 */
function mockContagens(porTabela: Record<string, Array<{ origem: string | null; total: number }>>) {
  mockPool.query.mockImplementation((async (sql: string) => {
    const texto = String(sql)
    for (const [tabela, rows] of Object.entries(porTabela)) {
      // FROM polos / FROM escolas / FROM turmas / FROM alunos
      if (new RegExp(`FROM ${tabela}\\b`).test(texto)) {
        return { rows } as any
      }
    }
    return { rows: [] } as any
  }) as any)
}

describe('Auditoria de governanca do gate (ETL -> Gestor)', () => {
  const envOriginal = process.env.ETL_GATE_MESTRE

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (envOriginal === undefined) delete process.env.ETL_GATE_MESTRE
    else process.env.ETL_GATE_MESTRE = envOriginal
  })

  it('verde: tudo origem=gestor e gate estrito -> sem alerta', async () => {
    delete process.env.ETL_GATE_MESTRE
    mockContagens({
      polos: [{ origem: 'gestor', total: 3 }],
      escolas: [{ origem: 'gestor', total: 10 }],
      turmas: [{ origem: 'gestor', total: 40 }],
      alunos: [{ origem: 'gestor', total: 800 }],
    })

    const res = await auditarGovernancaGate()

    expect(res.gateMode).toBe('estrito')
    expect(res.gateForaDoEstrito).toBe(false)
    expect(res.totalEtlNaoAssumido).toBe(0)
    expect(res.alerta).toBe(false)
    expect(res.alertas).toHaveLength(0)

    const alunos = res.contagens.find((c) => c.entidade === 'aluno')!
    expect(alunos.gestor).toBe(800)
    expect(alunos.total).toBe(800)
  })

  it('alerta: mestre origem=sisam_etl nao assumido em turmas/alunos', async () => {
    delete process.env.ETL_GATE_MESTRE
    mockContagens({
      polos: [{ origem: 'gestor', total: 3 }],
      escolas: [{ origem: 'gestor', total: 10 }],
      turmas: [
        { origem: 'gestor', total: 40 },
        { origem: 'sisam_etl', total: 2 },
      ],
      alunos: [
        { origem: 'gestor', total: 800 },
        { origem: 'sisam_etl', total: 5 },
      ],
    })

    const res = await auditarGovernancaGate()

    expect(res.totalEtlNaoAssumido).toBe(7)
    expect(res.alerta).toBe(true)
    expect(res.alertas.some((a) => a.includes("sisam_etl"))).toBe(true)

    const turmas = res.contagens.find((c) => c.entidade === 'turma')!
    expect(turmas.sisam_etl).toBe(2)
    expect(turmas.etl_nao_assumido).toBe(2)
    expect(turmas.total).toBe(42)
  })

  it('alerta: gate fora do estrito (ETL_GATE_MESTRE=transicao) mesmo sem etl pendente', async () => {
    process.env.ETL_GATE_MESTRE = 'transicao'
    mockContagens({
      polos: [{ origem: 'gestor', total: 3 }],
      escolas: [{ origem: 'gestor', total: 10 }],
      turmas: [{ origem: 'gestor', total: 40 }],
      alunos: [{ origem: 'gestor', total: 800 }],
    })

    const res = await auditarGovernancaGate()

    expect(res.gateMode).toBe('transicao')
    expect(res.gateForaDoEstrito).toBe(true)
    expect(res.totalEtlNaoAssumido).toBe(0)
    expect(res.alerta).toBe(true)
    expect(res.alertas.some((a) => a.includes('ETL_GATE_MESTRE'))).toBe(true)
  })

  it('classifica origem inesperada (NULL legado) em "outros"', async () => {
    delete process.env.ETL_GATE_MESTRE
    mockContagens({
      polos: [{ origem: 'gestor', total: 3 }],
      escolas: [{ origem: 'seed', total: 4 }],
      turmas: [{ origem: 'gestor', total: 40 }],
      alunos: [
        { origem: 'gestor', total: 800 },
        { origem: null, total: 6 },
      ],
    })

    const res = await auditarGovernancaGate()

    const escolas = res.contagens.find((c) => c.entidade === 'escola')!
    expect(escolas.seed).toBe(4)

    const alunos = res.contagens.find((c) => c.entidade === 'aluno')!
    expect(alunos.outros).toBe(6)
    expect(alunos.total).toBe(806)

    // NULL legado nao conta como etl nao assumido (so 'sisam_etl' conta).
    expect(res.totalEtlNaoAssumido).toBe(0)
  })
})
