/**
 * Gate de habilitacao do ETL (Sisam -> Gestor) — principio "externos apenas
 * consomem e complementam": o ETL NUNCA cria dado mestre (turma/aluno).
 *
 * Cobre os dois modos do gate (mockando pool.query):
 *   - 'estrito' (PADRAO): turma/aluno inexistente vira DIVERGENCIA, nunca INSERT.
 *   - 'transicao' (apenas com ETL_GATE_MESTRE='transicao'): cria com origem
 *     rastreavel para o Gestor regularizar depois.
 *
 * Regressao: garante que o default conservador agora seja 'estrito'.
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
import { getEtlGateMode } from '@/lib/services/importacao/config'
import { processarLinhas } from '@/lib/services/importacao/process'
import type {
  ImportacaoConfig,
  ImportacaoResultado,
  DadosExistentes,
  DadosQuestoes,
} from '@/lib/services/importacao/types'

const mockPool = vi.mocked(pool)

/**
 * Roteia as queries que processarLinhas executa:
 *  - SELECT codigo FROM alunos ... -> proximo codigo sequencial
 *  - SELECT status FROM importacoes -> nunca cancelado
 *  - UPDATE importacoes ... -> no-op
 */
function mockQueryRouter() {
  mockPool.query.mockImplementation((async (sql: string) => {
    const texto = String(sql)
    if (texto.includes('FROM alunos')) {
      return { rows: [{ codigo: 'ALU0010' }] } as any
    }
    if (texto.includes('FROM importacoes')) {
      return { rows: [{ status: 'processando' }] } as any
    }
    return { rows: [] } as any
  }) as any)
}

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

const config: ImportacaoConfig = {
  importacaoId: 'imp-001',
  anoLetivo: '2026',
  usuarioId: 'user-001',
  avaliacaoId: 'aval-001',
}

// Escola JA existe no mestre; turma e aluno NAO existem (devem cair no gate).
function dadosExistentes(): DadosExistentes {
  return {
    polosMap: new Map(),
    escolasMap: new Map([['ESCOLA MODELO', 'esc-001']]),
    turmasMap: new Map(),
    alunosMap: new Map(),
    questoesMap: new Map(),
  }
}

function dadosQuestoes(): DadosQuestoes {
  return {
    configSeries: new Map(),
    itensProducaoMap: new Map(),
  }
}

const linhas = [
  { ESCOLA: 'Escola Modelo', TURMA: '5A', ALUNO: 'Maria Silva', SERIE: '5' },
]

describe('Gate de habilitacao ETL (Sisam -> Gestor)', () => {
  const envOriginal = process.env.ETL_GATE_MESTRE

  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryRouter()
  })

  afterEach(() => {
    if (envOriginal === undefined) delete process.env.ETL_GATE_MESTRE
    else process.env.ETL_GATE_MESTRE = envOriginal
  })

  describe('getEtlGateMode (default)', () => {
    it('default e "estrito" quando a flag nao esta definida', () => {
      delete process.env.ETL_GATE_MESTRE
      expect(getEtlGateMode()).toBe('estrito')
    })

    it('valor desconhecido tambem cai em "estrito" (conservador no gate)', () => {
      process.env.ETL_GATE_MESTRE = 'qualquer'
      expect(getEtlGateMode()).toBe('estrito')
    })

    it('"transicao" so e ativado pela flag explicita', () => {
      process.env.ETL_GATE_MESTRE = 'transicao'
      expect(getEtlGateMode()).toBe('transicao')
    })
  })

  describe('modo estrito (padrao)', () => {
    it('NAO cria turma/aluno inexistente — registra divergencia', async () => {
      delete process.env.ETL_GATE_MESTRE
      const resultado = novoResultado()
      const erros: string[] = []

      const out = await processarLinhas(
        linhas,
        config,
        dadosExistentes(),
        dadosQuestoes(),
        resultado,
        erros
      )

      // Principio: externos nao criam dado mestre.
      expect(out.turmasParaInserir).toHaveLength(0)
      expect(out.alunosParaInserir).toHaveLength(0)

      // Divergencias registradas para o Gestor regularizar.
      expect(resultado.turmas.divergentes).toBe(1)
      expect(resultado.alunos.divergentes).toBe(1)
      expect(resultado.turmas.criados).toBe(0)
      expect(resultado.alunos.criados).toBe(0)

      // Sem aluno no mestre, a linha e pulada (nao gera consolidado/resultado).
      expect(out.consolidadosParaInserir).toHaveLength(0)
      expect(out.resultadosParaInserir).toHaveLength(0)

      // Mensagem de divergencia explica o gate.
      expect(erros.some((e) => e.includes('DIVERGENCIA (gate Gestor)'))).toBe(true)
    })
  })

  describe('modo transicao (flag explicita)', () => {
    it('cria turma/aluno marcando origem rastreavel para o Gestor', async () => {
      process.env.ETL_GATE_MESTRE = 'transicao'
      const resultado = novoResultado()
      const erros: string[] = []

      const out = await processarLinhas(
        linhas,
        config,
        dadosExistentes(),
        dadosQuestoes(),
        resultado,
        erros
      )

      // Cria mestre residual (somente neste modo).
      expect(out.turmasParaInserir).toHaveLength(1)
      expect(out.alunosParaInserir).toHaveLength(1)
      expect(resultado.turmas.criados).toBe(1)

      // Rastreabilidade obrigatoria.
      expect(out.turmasParaInserir[0].origem).toBe('sisam_etl')
      expect(out.turmasParaInserir[0].origem_importacao_id).toBe('imp-001')
      expect(out.alunosParaInserir[0].origem).toBe('sisam_etl')
      expect(out.alunosParaInserir[0].origem_importacao_id).toBe('imp-001')

      // Sem divergencias de gate neste modo.
      expect(resultado.turmas.divergentes).toBe(0)
      expect(resultado.alunos.divergentes).toBe(0)
    })
  })
})
