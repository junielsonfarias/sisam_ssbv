/**
 * ADR-001 — ETL Sisam em modo match-only (estrito por padrao).
 *
 * Quando o ETL nao encontra a turma/aluno no cadastro mestre (Gestor), ele NAO
 * cria o registro: registra uma divergencia em `importacao_divergencias` e
 * incrementa o contador `divergentes` do resultado. O modo `transicao`
 * (ETL_GATE_MESTRE=transicao) preserva a criacao legada (coberto por
 * importacao-serie-id/ano-letivo-id).
 *
 * Cobre (mockando pool.query):
 *   - criarTurmas estrito: turma ausente -> divergencia (sem INSERT INTO turmas)
 *   - criarTurmas estrito: turma existente -> vinculada (existentes++)
 *   - criarAlunos estrito: aluno ausente -> divergencia (sem INSERT INTO alunos)
 */
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

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
import { criarTurmas, criarAlunos } from '@/lib/services/importacao/batch'
import type {
  ImportacaoResultado,
  TurmaParaInserir,
  AlunoParaInserir,
} from '@/lib/services/importacao/types'

const mockPool = vi.mocked(pool)

const CONFIG = {
  importacaoId: 'imp-1',
  anoLetivo: '2026',
  usuarioId: 'user-1',
  avaliacaoId: 'aval-1',
} as const

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

function sqls(): string[] {
  return mockPool.query.mock.calls.map((c) => String(c[0]))
}

const envOriginal = process.env.ETL_GATE_MESTRE

beforeEach(() => {
  vi.clearAllMocks()
  // Garante o modo padrao (estrito) mesmo se o ambiente exportar transicao.
  delete process.env.ETL_GATE_MESTRE
})

afterAll(() => {
  if (envOriginal === undefined) delete process.env.ETL_GATE_MESTRE
  else process.env.ETL_GATE_MESTRE = envOriginal
})

describe('ETL match-only (estrito) — turmas', () => {
  const turma: TurmaParaInserir = {
    tempId: 'TEMP_TURMA_0',
    codigo: '5A',
    nome: '5A',
    escola_id: 'esc-1',
    serie: '5',
    ano_letivo: '2026',
    origem: 'sisam_etl',
    origem_importacao_id: 'imp-1',
  }

  it('turma ausente: registra divergencia e NAO cria turma', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('INNER JOIN (VALUES')) return { rows: [] } as any // lookup vazio
      return { rows: [] } as any
    }) as any)

    const resultado = novoResultado()
    const alunos: AlunoParaInserir[] = []
    await criarTurmas([turma], alunos, [], [], CONFIG, resultado)

    expect(resultado.turmas.divergentes).toBe(1)
    expect(resultado.turmas.existentes).toBe(0)
    // NUNCA deve haver INSERT INTO turmas em modo estrito.
    expect(sqls().some((s) => s.includes('INSERT INTO turmas'))).toBe(false)
    // Deve gravar a divergencia.
    expect(sqls().some((s) => s.includes('INSERT INTO importacao_divergencias'))).toBe(true)
  })

  it('turma existente: vincula (existentes++) sem divergencia', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM turmas')) {
        return {
          rows: [{ id: 'turma-real-1', escola_id: 'esc-1', codigo: '5A', ano_letivo: '2026' }],
        } as any
      }
      return { rows: [] } as any
    }) as any)

    const resultado = novoResultado()
    const alunos: AlunoParaInserir[] = [
      {
        tempId: 'TEMP_ALUNO_0',
        codigo: 'ALU0001',
        nome: 'Maria',
        escola_id: 'esc-1',
        turma_id: 'TEMP_TURMA_0',
        serie: '5',
        ano_letivo: '2026',
        origem: 'sisam_etl',
        origem_importacao_id: 'imp-1',
      },
    ]
    await criarTurmas([turma], alunos, [], [], CONFIG, resultado)

    expect(resultado.turmas.existentes).toBe(1)
    expect(resultado.turmas.divergentes).toBe(0)
    // O tempId do aluno foi resolvido para o id real da turma vinculada.
    expect(alunos[0].turma_id).toBe('turma-real-1')
    expect(sqls().some((s) => s.includes('INSERT INTO turmas'))).toBe(false)
  })
})

describe('ETL match-only (estrito) — alunos', () => {
  it('aluno ausente: registra divergencia e NAO cria aluno', async () => {
    mockPool.query.mockImplementation((async (sql: string) => {
      const texto = String(sql)
      if (texto.includes('FROM anos_letivos')) return { rows: [{ id: 'ano-uuid' }] } as any
      if (texto.includes('FROM series_escolares')) return { rows: [{ id: 'serie-uuid' }] } as any
      if (texto.includes('INNER JOIN (VALUES')) return { rows: [] } as any // nenhum existente
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
    await criarAlunos(alunos, [], [], [], resultado, [], CONFIG)

    expect(resultado.alunos.divergentes).toBe(1)
    expect(resultado.alunos.criados).toBe(0)
    expect(sqls().some((s) => s.includes('INSERT INTO alunos'))).toBe(false)
    expect(sqls().some((s) => s.includes('INSERT INTO importacao_divergencias'))).toBe(true)
  })
})
